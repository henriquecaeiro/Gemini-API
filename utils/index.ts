import fs from 'fs';
import { promises as fsPromises } from 'fs';

export async function decodeBase64Image(base64Str: string): Promise<{ mimeType: string, uri: string } | null> {
    // Regex para extrair o tipo MIME e os dados em base64
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches) {
        console.error('Invalid input string');
        return null;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    
    try {
        // Lê o número atual da imagem ou inicia com 1 se o arquivo não existir
        const numberFilePath = './imageCounter.txt';
        const tempDirPath = './temp'; // Caminho para a pasta temporária
        let currentNumber = 1;

        // Verifica e cria a pasta temp se não existir
        await fsPromises.mkdir(tempDirPath, { recursive: true });

        try {
            const number = await fsPromises.readFile(numberFilePath, 'utf8');
            currentNumber = parseInt(number, 10);
        } catch (error) {
            // Assume que a falta de arquivo significa começar pelo um
            await fsPromises.writeFile(numberFilePath, '1'); // Inicializa o arquivo de contador se não estiver presente
        }

        // Decodifica a string base64 para dados binários
        const buffer = Buffer.from(base64Data, 'base64');

        // Gera o nome do arquivo usando o número atual da imagem
        const filename = `image${String(currentNumber).padStart(2, '0')}.png`; // Garante nomes de arquivo como "image01", "image02", etc.
        const uri = `${tempDirPath}/${filename}`;

        // Salva a imagem no diretório temp
        await fsPromises.writeFile(uri, buffer);

        // Incrementa o número da imagem e atualiza o arquivo de contador
        const nextNumber = currentNumber + 1;
        await fsPromises.writeFile(numberFilePath, nextNumber.toString());

        return { mimeType, uri };
    } catch (error) {
        console.error('Fail to decode and save the base64 image', error);
        return null;
    }
}

export function fileToGenerativePart(path: string, mimeType: string): { inlineData: { data: string, mimeType: string } } {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
}
