const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config({ quiet: true });

async function setupDatabase() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        const schema = fs.readFileSync(
            path.join(__dirname, "..", "database", "schema.sql"),
            "utf8"
        );

        const seed = fs.readFileSync(
            path.join(__dirname, "..", "database", "seed.sql"),
            "utf8"
        );

        await connection.query(schema);
        await connection.query(seed);

        console.log("Banco EasyFood configurado com sucesso.");
    } catch (error) {
        console.error("Não foi possível configurar o banco EasyFood.");
        process.exitCode = 1;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

setupDatabase();
