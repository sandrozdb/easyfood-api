const router = require("express").Router();
const { prisma } = require("../../config/database");
const { authMiddleware } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");
router.use(authMiddleware, allowRoles("admin"));
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/users", async (req, res) => {
    const offset = Number(req.query.offset || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return res.status(400).json({ message: "Paginação inválida." });
    res.json(await prisma.user.findMany({ orderBy: { id: "asc" }, take: 100, skip: offset }));
});
router.patch("/users/:id", async (req, res) => {
    const id = Number(req.params.id), body = req.body;
    if (!Number.isSafeInteger(id) || id < 1 || !body || Array.isArray(body) ||
        Object.keys(body).length !== 1 || Object.keys(body)[0] !== "active" || typeof body.active !== "boolean") {
        return res.status(400).json({ message: "Informe active válido." });
    }
    if (id === req.user.id) return res.status(403).json({ message: "Não altere seu próprio acesso administrativo." });
    if (!await prisma.user.findUnique({ where: { id } })) return res.status(404).json({ message: "Usuário não encontrado." });
    res.json(await prisma.user.update({ where: { id }, data: { active: body.active } }));
});
router.put("/restaurants/:id/owner", async (req, res) => {
    const id = Number(req.params.id), ownerId = req.body?.owner_id;
    if (!Number.isSafeInteger(id) || id < 1 || !(ownerId === null || Number.isSafeInteger(ownerId) && ownerId > 0)) {
        return res.status(400).json({ message: "IDs inválidos." });
    }
    if (ownerId !== null) {
        const owner = await prisma.user.findUnique({ where: { id: ownerId } });
        if (!owner || owner.role !== "restaurante" || !owner.active) return res.status(400).json({ message: "Selecione um usuário restaurante ativo." });
    }
    if (!await prisma.restaurant.findUnique({ where: { id } })) return res.status(404).json({ message: "Restaurante não encontrado." });
    await prisma.restaurant.update({ where: { id }, data: { owner_id: ownerId } });
    res.json({ message: "Proprietário atualizado." });
});
module.exports = router;
