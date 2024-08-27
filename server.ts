import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { query } from './query';
import { randomUUID } from 'crypto';
import { decodeBase64Image, fileToGenerativePart  } from './utils'; 
import { generateContentFromImage } from './gemini'; 


dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '50mb' }));

app.post('/upload', async (req: Request, res: Response) => {
    let { image, customer_code, measure_datetime, measure_type } = req.body;
    const measureUuid = randomUUID(); // UUID gerado corretamente

    // Decodificar a imagem base64
    const imageData = await decodeBase64Image(image);

    // Continuar com as validações e processamento
    if (!imageData || !customer_code || !measure_datetime || !measure_type) {
        return res.status(400).json({ error_code: "INVALID_DATA", error_description: "Missing or invalid parameters." });
    }

    let measureValue; // Declaração de measureValue no escopo apropriado

    try {
        // Converter arquivo local para parte utilizável pela API do Google Gemini
        const filePart = fileToGenerativePart(imageData.uri, imageData.mimeType);

        const result = await generateContentFromImage(filePart, "Extract measure value");
        
        const measureText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (measureText) {
            const matches = measureText.match(/\d+\.\d+/); // Correção: escape correto para ponto decimal
            if (matches) {
                measureValue = parseFloat(matches[0]); // Atribuição a measureValue no escopo correto
                // Continue com a inserção no banco de dados e resposta
            } else {
                // Lida com a situação onde não há um valor numérico válido no texto
                return res.status(400).json({ error_code: "NO_MEASUREMENT_FOUND", error_description: "No valid measurement value found in the text." });
            }
        } else {
            // Lida com a situação onde os dados esperados não estão presentes
            return res.status(500).json({ error_code: "INVALID_RESPONSE", error_description: "Invalid or incomplete data received from API" });
        }

        // Verifica se measureValue foi definido antes de inserir no banco de dados
        if (typeof measureValue === 'number') {
            await query('INSERT INTO measurements (customer_code, measure_datetime, measure_type, measure_value, image_url, measure_uuid) VALUES (?, ?, ?, ?, ?, ?)', 
                        [customer_code, measure_datetime, measure_type, measureValue, imageData.uri, measureUuid]);
            res.status(200).json(result);
        } else {
            return res.status(400).json({ error_code: "NO_MEASUREMENT_VALUE", error_description: "Measurement value could not be determined." });
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(500).json({ error_code: "SERVER_ERROR", error_description: "Internal server error: " + error.message });
        } else {
            res.status(500).json({ error_code: "SERVER_ERROR", error_description: "An unknown error occurred" });
        }
    }
});


app.patch('/confirm', async (req: Request, res: Response) => {
    const { measure_uuid, confirmed_value } = req.body;
    if (!measure_uuid || confirmed_value === undefined) {
        return res.status(400).json({ error_code: "INVALID_DATA", error_description: "Missing or invalid parameters." });
    }
    try {
        await query('UPDATE measurements SET measure_value = ?, confirmed = TRUE WHERE measure_uuid = ?', [confirmed_value, measure_uuid]);
        res.status(200).json({ success: true });
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(500).json({ error_code: "DB_ERROR", error_description: "Database error: " + error.message });
        } else {
            res.status(500).json({ error_code: "DB_ERROR", error_description: "An unknown error occurred" });
        }
    }
});

app.get('/:customerCode/list', async (req: Request, res: Response) => {
    const { customerCode } = req.params;
    const { measure_type } = req.query;
    try {
        let sql = 'SELECT * FROM measurements WHERE customer_code = ?';
        let params = [customerCode];
        if (measure_type && typeof measure_type === 'string') {
            sql += ' AND measure_type = ?';
            params.push(measure_type.toUpperCase());
        }
        const results = await query(sql, params);
        if (results.length === 0) {
            return res.status(404).json({
                error_code: "MEASURES_NOT_FOUND",
                error_description: "Nenhuma leitura encontrada"
            });
        }
        res.status(200).json({
            customer_code: customerCode,
            measures: results
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(500).json({ error_code: "DB_ERROR", error_description: "Database error: " + error.message });
        } else {
            res.status(500).json({ error_code: "DB_ERROR", error_description: "An unknown error occurred" });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});