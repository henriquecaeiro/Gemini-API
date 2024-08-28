// Importa o módulo necessário
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

// Exporta uma função assíncrona chamada generateContentFromImage que recebe um parâmetro filePart e uma string descriptionText
export async function generateContentFromImage(filePart: any, descriptionText: string) {
    // Cria uma instância da classe GoogleGenerativeAI passando a chave da API como parâmetro
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    // Obtém o modelo generativo chamando o método getGenerativeModel da instância genAI
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    try {
        // Chama o método generateContent do modelo passando um array com o filePart e um objeto com o texto da descrição
        const result = await model.generateContent([
            filePart,
            { text: descriptionText }
        ]);
        // Retorna a resposta gerada pelo modelo
        return result.response;
    } catch (error) {
        // Em caso de erro, exibe a mensagem de erro no console e lança o erro novamente
        console.error('Error generating content:', error);
        throw error;
    }
}

