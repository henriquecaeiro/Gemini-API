import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { query } from './query';
import { randomUUID } from 'crypto';
import { decodeBase64Image, fileToGenerativePart } from './utils';
import { generateContentFromImage } from './gemini';


dotenv.config();
const app = express();
const PORT = 80;

app.use(bodyParser.json({ limit: '50mb' }));

app.post('/upload', async (req: Request, res: Response) => {
    let { image, customer_code, measure_datetime, measure_type } = req.body; 
    const measureUuid = randomUUID(); 

    // Decodificar a imagem base64
    const imageData = await decodeBase64Image(image);

    const imageUri = imageData!.uri;

    // Validações e processamento
    if (!imageData || !customer_code || !measure_datetime || !measure_type) {
        return res.status(400).json({ error_code: "INVALID_DATA", error_description: "Parâmentros inválidos ou faltante" });
    }

    let measureValue; 

    try {

        // Verificar se já existe uma leitura para o mês e tipo
        const existingCheck = await query('SELECT * FROM measurements WHERE customer_code = ? AND measure_type = ? AND YEAR(measure_datetime) = YEAR(?) AND MONTH(measure_datetime) = MONTH(?)',
            [customer_code, measure_type, measure_datetime, measure_datetime]);

        if (existingCheck.length > 0) {
            // Se já existe, não inserir duplicata
            return res.status(409).json({ error_code: "DOUBLE_REPORT", error_description: "Leitura do mês já realizada." });
        }

        // Converter arquivo local para parte utilizável pela API do Google Gemini
        const filePart = fileToGenerativePart(imageData.uri, imageData.mimeType);

        const result = await generateContentFromImage(filePart, "Extract measure value");

        const measureText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (measureText) {
            const matches = measureText.match(/\d+\.\d+/); 
            if (matches) {
                measureValue = parseFloat(matches[0]); 
                // Inserção no banco de dados e resposta e verifica se measureValue foi definido antes de inserir no banco de dados
                if (typeof measureValue === 'number') {
                    await query('INSERT INTO measurements (customer_code, measure_datetime, measure_type, measure_value, image_url, measure_uuid) VALUES (?, ?, ?, ?, ?, ?)',
                        [customer_code, measure_datetime, measure_type, measureValue, imageUri, measureUuid]);
                    res.status(200).json({ image_url: imageUri, measure_value: measureValue, measure_uuid: measureUuid });
                } else {
                    return res.status(400).json({ error_code: "NO_MEASUREMENT_VALUE", error_description: "Valor da medição não pôde ser determinado" });
                }
            } else {
                // Lida com a situação onde não há um valor numérico válido no texto
                return res.status(400).json({ error_code: "NO_MEASUREMENT_FOUND", error_description: "Nenhum valor de medição válido encontrado no texto" });
            }
        } else {
            // Lida com a situação onde os dados esperados não estão presentes
            return res.status(500).json({ error_code: "INVALID_RESPONSE", error_description: "Dados inválidos ou incompletos recebidos da API" });
        }

    } catch (error: unknown) {
        // Lida com erros de servidor
        if (error instanceof Error) {
            res.status(500).json({ error_code: "SERVER_ERROR", error_description: "Erro interno do servidor: " + error.message });
        } else {
            res.status(500).json({ error_code: "SERVER_ERROR", error_description: "Ocorreu um erro desconhecido" });
        }
    }
});

app.patch('/confirm', async (req: Request, res: Response) => {
    const { measure_uuid, confirmed_value } = req.body;

    // Valida o tipo de dados dos parâmetros enviados
    if (typeof measure_uuid !== 'string' || typeof confirmed_value !== 'number') {
        return res.status(400).json({
            error_code: "INVALID_DATA",
            error_description: "Tipos de parâmetros inválidos ou faltantes"
        });
    }

    try {
        // Verifica se o código de leitura informado existe e se já foi confirmado
        const result = await query('SELECT confirmed FROM measurements WHERE measure_uuid = ?', [measure_uuid]);

        if (result.length === 0) {
            // Nenhum registro encontrado
            return res.status(404).json({
                error_code: "MEASURE_NOT_FOUND",
                error_description: "Leitura não encontrada"
            });
        }

        if (result[0].confirmed) {
            // Leitura já foi confirmada
            return res.status(409).json({
                error_code: "CONFIRMATION_DUPLICATE",
                error_description: "Leitura do mês já realizada"
            });
        }

        // Atualiza o valor confirmado no banco de dados
        await query('UPDATE measurements SET measure_value = ?, confirmed = TRUE WHERE measure_uuid = ?', [confirmed_value, measure_uuid]);

        // Resposta de sucesso
        res.status(200).json({ success: true });
    } catch (error) {
        // Tratamento de erros do banco de dados
        if (error instanceof Error) {
            res.status(500).json({
                error_code: "DB_ERROR",
                error_description: "Erro de banco de dados: " + error.message
            });
        } else {
            res.status(500).json({
                error_code: "DB_ERROR",
                error_description: "Ocorreu um erro desconhecido"
            });
        }
    }
});

app.get('/:customerCode/list', async (req: Request, res: Response) => {
    const { customerCode } = req.params;
    const { measure_type } = req.query;

    try {
        let sql = 'SELECT measure_uuid, measure_datetime, measure_type, confirmed AS has_confirmed, image_url FROM measurements WHERE customer_code = ?';
        let params = [customerCode];

        // Validar e adicionar filtro de measure_type, se fornecido
        if (measure_type && typeof measure_type === 'string') {
            const validTypes = ['WATER', 'GAS'];
            const typeUpper = measure_type.toUpperCase();

            if (!validTypes.includes(typeUpper)) {
                return res.status(400).json({
                    error_code: "INVALID_TYPE",
                    error_description: "Tipo de medição não permitida"
                });
            }

            sql += ' AND measure_type = ?';
            params.push(typeUpper);
        }

        const results = await query(sql, params);
        if (results.length === 0) {
            return res.status(404).json({
                error_code: "MEASURES_NOT_FOUND",
                error_description: "Nenhuma leitura encontrada"
            });
        }

        // Mapea os resultados para o formato desejado
        const formattedResults = results.map((measure: any) => ({
            measure_uuid: measure.measure_uuid,
            measure_datetime: measure.measure_datetime,
            measure_type: measure.measure_type,
            has_confirmed: measure.confirmed,
            image_url: measure.image_url
        }));

        // Retorna a lista de medidas
        res.status(200).json({
            customer_code: customerCode,
            measures: formattedResults
        });
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({
                error_code: "DB_ERROR",
                error_description: "Houve um erro no banco de dados: " + error.message
            });
        } else {
            res.status(500).json({
                error_code: "DB_ERROR",
                error_description: "Ocorreu um erro desconhecido"
            });
        }
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});