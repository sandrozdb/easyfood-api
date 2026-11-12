const service = require("./favoriteService");

function handle(error, res, next) {
    if (error instanceof service.FavoriteError) return res.status(error.status).json({ message: error.message });
    next(error);
}

async function add(req, res, next) {
    try { res.status(201).json({ message: "Restaurante adicionado aos favoritos.", favorite: await service.add(req.params.restaurantId, req.body, req.user, undefined, undefined, { ipAddress: req.ip }) }); }
    catch (error) { handle(error, res, next); }
}
async function remove(req, res, next) {
    try { await service.remove(req.params.restaurantId, req.user, undefined, undefined, { ipAddress: req.ip }); res.status(204).end(); }
    catch (error) { handle(error, res, next); }
}
async function status(req, res, next) {
    try { res.json(await service.status(req.params.restaurantId, req.user)); }
    catch (error) { handle(error, res, next); }
}
async function mine(req, res, next) {
    try { res.json(await service.listMine(req.user)); }
    catch (error) { handle(error, res, next); }
}

module.exports = { add, remove, status, mine };
