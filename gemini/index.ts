// Importa o módulo necessário
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

export async function generateContentFromImage(filePart: any, descriptionText: string) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    try {
        const result = await model.generateContent([
            filePart,
            { text: descriptionText }
        ]);
        return result.response;
    } catch (error) {
        console.error('Error generating content:', error);
        throw error;
    }
}

