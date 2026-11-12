const repository = require("./activityRepository");

const SAFE_NAME = /^[a-z][a-z0-9_.-]{0,79}$/;
const SENSITIVE_KEY = /authorization|cookie|password|secret|token|credential|access.?key/i;

class ActivityValidationError extends Error {
    constructor(message) { super(message); this.name = "ActivityValidationError"; this.status = 400; }
}

function positiveInteger(value, label) {
    if (value === undefined || value === "") return undefined;
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) throw new ActivityValidationError(`${label} inválido.`);
    return number;
}

function cleanMetadata(value) {
    if (value === undefined || value === null) return null;
    if (!value || Array.isArray(value) || typeof value !== "object") throw new ActivityValidationError("Metadados inválidos.");
    function inspect(item) {
        if (Array.isArray(item)) return item.map(inspect);
        if (item && typeof item === "object") return Object.fromEntries(Object.entries(item).map(([key, child]) => {
            if (SENSITIVE_KEY.test(key)) throw new ActivityValidationError("Metadados contêm campo sensível.");
            return [key, inspect(child)];
        }));
        return item;
    }
    const clean = inspect(value);
    if (JSON.stringify(clean).length > 4000) throw new ActivityValidationError("Metadados muito grandes.");
    return clean;
}

async function record(entry, repo = repository) {
    if (!SAFE_NAME.test(entry.action || "") || !SAFE_NAME.test(entry.entityType || "")) throw new ActivityValidationError("Evento inválido.");
    return repo.create({
        userId: positiveInteger(entry.userId, "Usuário") || null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: positiveInteger(entry.entityId, "Entidade") || null,
        metadata: cleanMetadata(entry.metadata),
        ipAddress: typeof entry.ipAddress === "string" ? entry.ipAddress.slice(0, 45) : null
    });
}

async function recordBestEffort(entry, repo = repository) {
    try { return await record(entry, repo); }
    catch (error) {
        console.error("ACTIVITY_LOG_FAILED", { action: entry.action, entityType: entry.entityType, entityId: entry.entityId, reason: error.name });
        return null;
    }
}

function date(value, endOfDay = false) {
    if (value === undefined || value === "") return undefined;
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z` : value);
    if (Number.isNaN(parsed.getTime())) throw new ActivityValidationError("Data inválida.");
    return parsed;
}

async function list(query = {}, repo = repository) {
    const page = positiveInteger(query.page, "Página") || 1;
    const limit = Math.min(positiveInteger(query.limit, "Limite") || 50, 100);
    const where = {};
    for (const [queryKey, field] of [["user_id", "userId"], ["entity_id", "entityId"]]) {
        const value = positiveInteger(query[queryKey], queryKey); if (value) where[field] = value;
    }
    for (const [queryKey, field] of [["action", "action"], ["entity_type", "entityType"]]) {
        if (query[queryKey] !== undefined) {
            if (!SAFE_NAME.test(query[queryKey])) throw new ActivityValidationError(`${queryKey} inválido.`);
            where[field] = query[queryKey];
        }
    }
    const start = date(query.start), end = date(query.end, true);
    if (start && end && start > end) throw new ActivityValidationError("Período inválido.");
    if (start || end) where.createdAt = { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
    const { rows, total } = await repo.list({ where, page, limit });
    return { items: rows, page, limit, total, pages: Math.ceil(total / limit) };
}

module.exports = { ActivityValidationError, record, recordBestEffort, list, cleanMetadata };
