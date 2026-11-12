const { prisma } = require("../../config/database");

function normalize(row) {
    return { ...row, id: Number.isSafeInteger(Number(row.id)) ? Number(row.id) : String(row.id) };
}

async function create(data) {
    return normalize(await prisma.activityLog.create({ data }));
}

async function list({ where, page, limit }) {
    const [rows, total] = await Promise.all([
        prisma.activityLog.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
            include: { user: { select: { id: true, name: true, role: true } } }
        }),
        prisma.activityLog.count({ where })
    ]);
    return { rows: rows.map(normalize), total };
}

module.exports = { create, list };
