import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Criação da pool de conexão
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Função de consulta ao banco de dados
export const query = async (sql: string, values?: any[]): Promise<any> => {
    const [rows] = await pool.query(sql, values);
    return rows;
};