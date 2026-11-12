const repository = require("./favoriteRepository");
const activityService = require("../activity/activityService");

class FavoriteError extends Error {
    constructor(status, message) { super(message); this.name = "FavoriteError"; this.status = status; }
}

function id(value) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) throw new FavoriteError(400, "Restaurante inválido.");
    return parsed;
}

function emptyBody(body) {
    if (body && Object.keys(body).length) throw new FavoriteError(400, "Este endpoint não aceita campos no corpo.");
}

async function ensureRestaurant(restaurantId, repo) {
    if (!await repo.restaurantExists(restaurantId)) throw new FavoriteError(404, "Restaurante não encontrado.");
}

async function add(restaurantIdValue, body, user, repo = repository, audit = activityService, context = {}) {
    emptyBody(body);
    const restaurantId = id(restaurantIdValue);
    await ensureRestaurant(restaurantId, repo);
    try {
        const favorite = await repo.create(user.id, restaurantId);
        await audit.recordBestEffort({ userId: user.id, action: "favorite.add", entityType: "restaurant", entityId: restaurantId, metadata: { restaurantId }, ipAddress: context.ipAddress });
        return favorite;
    } catch (error) {
        if (error.code === "P2002") throw new FavoriteError(409, "Restaurante já está nos favoritos.");
        throw error;
    }
}

async function remove(restaurantIdValue, user, repo = repository, audit = activityService, context = {}) {
    const restaurantId = id(restaurantIdValue);
    await ensureRestaurant(restaurantId, repo);
    const result = await repo.remove(user.id, restaurantId);
    if (!result.count) throw new FavoriteError(404, "Favorito não encontrado.");
    await audit.recordBestEffort({ userId: user.id, action: "favorite.remove", entityType: "restaurant", entityId: restaurantId, metadata: { restaurantId }, ipAddress: context.ipAddress });
}

async function status(restaurantIdValue, user, repo = repository) {
    const restaurantId = id(restaurantIdValue);
    await ensureRestaurant(restaurantId, repo);
    return { isFavorite: await repo.exists(user.id, restaurantId) };
}

async function listMine(user, repo = repository) { return repo.listMine(user.id); }

module.exports = { FavoriteError, id, emptyBody, add, remove, status, listMine };
