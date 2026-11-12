const repository = require("./restaurantRepository");
const { prepareRestaurantData } = require("./restaurantService");
const activityService = require("../activity/activityService");
function createUpdateHandler(repo = repository, audit = activityService) {
    return async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "ID inválido." });
        const row = await repo.findOwnedRestaurant(id);
        if (!row) return res.status(404).json({ message: "Restaurante não encontrado." });
        if (req.user.role !== "admin" && (req.user.role !== "restaurante" || row.owner_id !== req.user.id)) {
            return res.status(403).json({ message: "Você não administra este restaurante." });
        }
        const body = req.body, fields = ["name", "category", "description", "address", "phone", "rating"];
        if (!body || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key => !fields.includes(key))) {
            return res.status(400).json({ message: "Campos inválidos para edição." });
        }
        const data = prepareRestaurantData(req.method === "PATCH" ? { ...row, ...body } : body);
        // Revalida o dono na escrita para proteger contra troca de proprietário concorrente.
        const updated = await repo.updateRestaurant(id, req.user.role === "admin" ? undefined : req.user.id, data);
        if (!updated) return res.status(403).json({ message: "O acesso ao restaurante foi alterado." });
        await audit.recordBestEffort({ userId: req.user.id, action: "restaurant.update", entityType: "restaurant", entityId: id,
            metadata: { restaurantId: id, fields: Object.keys(body) }, ipAddress: req.ip });
        res.json({ message: "Restaurante atualizado.", restaurante: updated });
    };
}
function createDeleteHandler(repo = repository, audit = activityService) {
    return async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "ID inválido." });
        const result = await repo.deleteRestaurant(id);
        if (!result.count) return res.status(404).json({ message: "Restaurante não encontrado." });
        await audit.recordBestEffort({ userId: req.user.id, action: "restaurant.delete", entityType: "restaurant", entityId: id,
            metadata: { restaurantId: id }, ipAddress: req.ip });
        res.status(204).end();
    };
}
const deleteRestaurant = createDeleteHandler();
module.exports = { createUpdateHandler, createDeleteHandler, deleteRestaurant };
