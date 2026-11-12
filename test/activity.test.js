const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const express = require("express");
const activity = require("../src/modules/activity/activityService");
const restaurantService = require("../src/modules/restaurants/restaurantService");
const { createUpdateHandler, createDeleteHandler } = require("../src/modules/restaurants/restaurantManagement");
const dishService = require("../src/modules/dishes/dishService");

function auditCollector({ fail = false } = {}) {
    const entries = [];
    return { entries, recordBestEffort: async entry => { entries.push(entry); if (fail) return null; return entry; } };
}
function user(role = "admin") { return { id: 7, role }; }
function dishRepo(imageKey = null) {
    const record = { id: 9, name: "Prato", category: "Pizza", description: "", price: 10, available: true,
        imageKey, imageUrl: null, restaurantId: 2, restaurant: { id: 2, owner_id: 7 } };
    return {
        findRestaurantById: async () => record.restaurant,
        create: async data => ({ ...record, ...data }),
        findRecordById: async () => record,
        update: async (id, owner, data) => ({ ...record, ...data }),
        remove: async () => ({ count: 1 }),
        updateImageReference: async (id, owner, data) => ({ ...record, ...data })
    };
}
const storage = {
    buildDishKey: () => "restaurants/2/dishes/9/new.jpg",
    upload: async () => {}, remove: async () => {}, getReadUrl: async () => "https://example.test/read"
};

test("registra evento centralizado com IP e metadados seguros", async () => {
    let saved; const repo = { create: async data => (saved = data) };
    await activity.record({ userId: 1, action: "dish.create", entityType: "dish", entityId: 2, metadata: { restaurantId: 3 }, ipAddress: "127.0.0.1" }, repo);
    assert.deepEqual(saved, { userId: 1, action: "dish.create", entityType: "dish", entityId: 2, metadata: { restaurantId: 3 }, ipAddress: "127.0.0.1" });
});
test("bloqueia segredo em metadata", async () => assert.rejects(() => activity.record({ action: "dish.create", entityType: "dish", metadata: { accessToken: "x" } }, { create: async () => {} }), /sensível/));
test("falha de auditoria não desfaz operação principal", async () => {
    const result = await activity.recordBestEffort({ action: "dish.create", entityType: "dish", entityId: 1 }, { create: async () => { throw new Error("offline"); } });
    assert.equal(result, null);
});
test("consulta combina filtros de usuário, ação e entidade", async () => {
    let received; await activity.list({ user_id: "7", action: "dish.update", entity_type: "dish", entity_id: "9" }, { list: async input => (received = input, { rows: [], total: 0 }) });
    assert.deepEqual(received.where, { userId: 7, entityId: 9, action: "dish.update", entityType: "dish" });
});
test("consulta limita paginação a 100", async () => {
    const data = await activity.list({ page: "2", limit: "999" }, { list: async input => ({ rows: [], total: 250, input }) });
    assert.deepEqual({ page: data.page, limit: data.limit, pages: data.pages }, { page: 2, limit: 100, pages: 3 });
});
test("consulta aceita intervalo de datas", async () => {
    let received; await activity.list({ start: "2026-01-01", end: "2026-01-31" }, { list: async input => (received = input, { rows: [], total: 0 }) });
    assert.ok(received.where.createdAt.gte < received.where.createdAt.lte);
});
test("consulta rejeita intervalo invertido", async () => assert.rejects(() => activity.list({ start: "2026-02-01", end: "2026-01-01" }, { list: async () => ({ rows: [], total: 0 }) }), /Período/));
test("criação de restaurante gera restaurant.create", async () => {
    const audit = auditCollector(); const repo = { createRestaurant: async data => ({ id: 12, ...data }) };
    await restaurantService.createRestaurant({ name: "Restaurante Teste", category: "Pizza", description: "Descrição válida para o restaurante.", address: "Rua de Teste, 123", phone: "(11) 99999-9999" }, user(), repo, audit);
    assert.equal(audit.entries[0].action, "restaurant.create");
});
test("edição de restaurante gera restaurant.update", async () => {
    const audit = auditCollector(), repo = { findOwnedRestaurant: async () => ({ id: 2, owner_id: 7, name: "Restaurante Teste", category: "Pizza", description: "Descrição válida para o restaurante.", address: "Rua de Teste, 123", phone: "(11) 99999-9999", rating: 0 }), updateRestaurant: async (id, owner, data) => ({ id, ...data }) };
    const req = { params: { id: "2" }, user: user(), method: "PATCH", body: { rating: 4.5 }, ip: "127.0.0.1" };
    const res = { json: value => value, status() { return this; } };
    await createUpdateHandler(repo, audit)(req, res); assert.equal(audit.entries[0].action, "restaurant.update");
});
test("exclusão de restaurante gera restaurant.delete", async () => {
    const audit = auditCollector(), repo = { deleteRestaurant: async () => ({ count: 1 }) };
    let status; const req = { params: { id: "2" }, user: user(), ip: "127.0.0.1" };
    const res = { status(code) { status = code; return this; }, end() {} };
    await createDeleteHandler(repo, audit)(req, res);
    assert.equal(status, 204); assert.equal(audit.entries[0].action, "restaurant.delete");
});
test("criação de prato gera dish.create", async () => {
    const audit = auditCollector(); await dishService.createDish(2, { name: "Prato", category: "Pizza", description: "", price: 10 }, user("restaurante"), dishRepo(), audit);
    assert.equal(audit.entries[0].action, "dish.create");
});
test("edição de prato gera dish.update", async () => {
    const audit = auditCollector(); await dishService.updateDish(9, { available: false }, user("restaurante"), dishRepo(), audit);
    assert.equal(audit.entries[0].action, "dish.update");
});
test("exclusão de prato gera dish.delete", async () => {
    const audit = auditCollector(); await dishService.deleteDish(9, user("restaurante"), dishRepo(), storage, audit);
    assert.equal(audit.entries[0].action, "dish.delete");
});
test("primeiro upload gera dish.image.upload", async () => {
    const audit = auditCollector(); await dishService.uploadDishImage(9, user("restaurante"), Buffer.from([0xff,0xd8,0xff]), "image/jpeg", dishRepo(), storage, audit);
    assert.equal(audit.entries[0].action, "dish.image.upload");
});
test("troca de imagem gera dish.image.replace", async () => {
    const audit = auditCollector(); await dishService.uploadDishImage(9, user("restaurante"), Buffer.from([0xff,0xd8,0xff]), "image/jpeg", dishRepo("old.jpg"), storage, audit);
    assert.equal(audit.entries[0].action, "dish.image.replace");
});
test("remoção de imagem gera dish.image.remove", async () => {
    const audit = auditCollector(); await dishService.removeDishImage(9, user("restaurante"), dishRepo("old.jpg"), storage, audit);
    assert.equal(audit.entries[0].action, "dish.image.remove");
});
test("falha de auditoria não desfaz criação de prato", async () => {
    const audit = auditCollector({ fail: true }); const created = await dishService.createDish(2, { name: "Prato", category: "Pizza", description: "", price: 10 }, user("restaurante"), dishRepo(), audit);
    assert.equal(created.id, 9);
});
test("endpoint de histórico exige autenticação e admin", () => {
    const source = fs.readFileSync(require.resolve("../src/modules/activity/activityRoutes.js"), "utf8");
    assert.match(source, /authMiddleware/); assert.match(source, /allowRoles\("admin"\)/);
});
test("painel administrativo exibe histórico com paginação", () => {
    const html = fs.readFileSync(require.resolve("../public/admin.html"), "utf8");
    const js = fs.readFileSync(require.resolve("../public/dashboard.js"), "utf8");
    assert.match(html, /Histórico de atividades/); assert.match(js, /\/admin\/activity\?page=/);
});

async function activityRequest(role) {
    const { createActivityRouter } = require("../src/modules/activity/activityRoutes");
    const app = express();
    const auth = role === null ? (req, res) => res.status(401).json({ message: "Autenticação necessária." }) : (req, res, next) => { req.user = { id: 1, role }; next(); };
    app.use("/admin/activity", createActivityRouter({ auth, activity: { list: async () => ({ items: [], page: 1, limit: 50, total: 0, pages: 0 }) } }));
    const server = app.listen(0); await new Promise(resolve => server.once("listening", resolve));
    try { return await fetch(`http://127.0.0.1:${server.address().port}/admin/activity`); }
    finally { await new Promise(resolve => server.close(resolve)); }
}
test("admin consulta o histórico", async () => assert.equal((await activityRequest("admin")).status, 200));
test("restaurante recebe 403 no histórico global", async () => assert.equal((await activityRequest("restaurante")).status, 403));
test("cliente recebe 403 no histórico global", async () => assert.equal((await activityRequest("cliente")).status, 403));
test("usuário sem autenticação recebe 401 no histórico global", async () => assert.equal((await activityRequest(null)).status, 401));
