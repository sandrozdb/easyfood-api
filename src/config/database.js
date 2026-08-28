const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");

dotenv.config({ quiet: true });

const prisma = new PrismaClient();

async function testConnection() {
    await prisma.$connect();
}

async function disconnectDatabase() {
    await prisma.$disconnect();
}

async function closeOnSignal() {
    try {
        await disconnectDatabase();
    } finally {
        process.exit(0);
    }
}

process.once("SIGINT", closeOnSignal);
process.once("SIGTERM", closeOnSignal);

module.exports = {
    prisma,
    testConnection,
    disconnectDatabase
};
