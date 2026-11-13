const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const service = require("../src/modules/favorites/favoriteService");
const { allowRoles } = require("../src/middlewares/roleMiddleware");

const user = { id: 7, role: "cliente" };
const audit = { calls: [], async recordBestEffort(entry) { this.calls.push(entry); } };
function repo(overrides = {}) { return { restaurantExists: async () => true, create: async (userId, restaurantId) => ({ id: 1, userId, restaurantId }), remove: async () => ({ count: 1 }), exists: async () => false, listMine: async () => [], ...overrides }; }
function response() { return { code: 200, body: null, status(value) { this.code = value; return this; }, json(value) { this.body = value; return this; } }; }

for (const invalid of [undefined, null, "", "abc", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    test(`rejeita restaurantId inválido: ${String(invalid)}`, () => assert.throws(() => service.id(invalid), /Restaurante inválido/));
}

test("adiciona favorito usando somente usuário autenticado e parâmetro da rota", async () => {
    let received;
    const favorite = await service.add("3", {}, user, repo({ create: async (...args) => { received = args; return { id: 2, userId: args[0], restaurantId: args[1] }; } }), audit);
    assert.deepEqual(received, [7, 3]); assert.equal(favorite.userId, 7);
});
test("rejeita mass assignment no corpo", async () => assert.rejects(service.add(3, { userId: 99 }, user, repo(), audit), error => error.status === 400));
test("rejeita restaurante inexistente ao adicionar", async () => assert.rejects(service.add(3, {}, user, repo({ restaurantExists: async () => false }), audit), error => error.status === 404));
test("duplicidade retorna 409", async () => assert.rejects(service.add(3, {}, user, repo({ create: async () => { const error = new Error(); error.code = "P2002"; throw error; } }), audit), error => error.status === 409));
test("erro inesperado de inclusão é preservado", async () => { const failure = new Error("db"); await assert.rejects(service.add(3, {}, user, repo({ create: async () => { throw failure; } }), audit), failure); });
test("registra favorite.add sem dados sensíveis", async () => { const localAudit = { calls: [], async recordBestEffort(value) { this.calls.push(value); } }; await service.add(3, {}, user, repo(), localAudit); assert.equal(localAudit.calls[0].action, "favorite.add"); assert.deepEqual(localAudit.calls[0].metadata, { restaurantId: 3 }); });
test("remove somente o favorito do usuário autenticado", async () => { let args; await service.remove(3, user, repo({ remove: async (...values) => { args = values; return { count: 1 }; } }), audit); assert.deepEqual(args, [7, 3]); });
test("remoção inexistente retorna 404", async () => assert.rejects(service.remove(3, user, repo({ remove: async () => ({ count: 0 }) }), audit), error => error.status === 404));
test("rejeita restaurante inexistente ao remover", async () => assert.rejects(service.remove(3, user, repo({ restaurantExists: async () => false }), audit), error => error.status === 404));
test("registra favorite.remove", async () => { const localAudit = { calls: [], async recordBestEffort(value) { this.calls.push(value); } }; await service.remove(3, user, repo(), localAudit); assert.equal(localAudit.calls[0].action, "favorite.remove"); });
test("status verdadeiro", async () => assert.deepEqual(await service.status(3, user, repo({ exists: async () => true })), { isFavorite: true }));
test("status falso", async () => assert.deepEqual(await service.status(3, user, repo()), { isFavorite: false }));
test("status usa identidade autenticada", async () => { let args; await service.status(3, user, repo({ exists: async (...values) => { args = values; return true; } })); assert.deepEqual(args, [7, 3]); });
test("listagem usa identidade autenticada", async () => { let id; await service.listMine(user, repo({ listMine: async value => { id = value; return []; } })); assert.equal(id, 7); });
test("listagem devolve dados do repository", async () => { const items = [{ id: 3, averageRating: 4.5, reviewCount: 2, favoritedAt: new Date() }]; assert.equal(await service.listMine(user, repo({ listMine: async () => items })), items); });

for (const role of ["restaurante", "admin"]) {
    test(`${role} recebe 403`, () => { const res = response(); allowRoles("cliente")({ user: { role } }, res, () => assert.fail("não deve permitir")); assert.equal(res.code, 403); });
}
test("cliente é permitido", () => { let allowed = false; allowRoles("cliente")({ user }, response(), () => { allowed = true; }); assert.equal(allowed, true); });
test("sem autenticação recebe 401", async () => { const res = response(); await require("../src/middlewares/authMiddleware").createAuthMiddleware()({ get: () => "" }, res, () => assert.fail("não deve permitir")); assert.equal(res.code, 401); });

test("migration é aditiva e segura", () => { const sql = fs.readFileSync(require.resolve("../database/migrations/007-create-favorites.sql"), "utf8"); assert.match(sql, /CREATE TABLE favorites/i); assert.doesNotMatch(sql, /^\s*(?:DROP|TRUNCATE|DELETE|UPDATE)\b/im); });
test("migration possui unicidade por usuário e restaurante", () => { const sql = fs.readFileSync(require.resolve("../database/migrations/007-create-favorites.sql"), "utf8"); assert.match(sql, /UNIQUE \(user_id, restaurant_id\)/i); });
test("migration possui as duas foreign keys com cascade", () => { const sql = fs.readFileSync(require.resolve("../database/migrations/007-create-favorites.sql"), "utf8"); assert.equal((sql.match(/ON DELETE CASCADE/gi) || []).length, 2); });
test("rotas exigem autenticação e cliente", () => { const source = fs.readFileSync(require.resolve("../src/modules/favorites/favoriteRoutes.js"), "utf8"); assert.match(source, /authMiddleware/); assert.match(source, /allowRoles\("cliente"\)/); });
test("rotas expõem os quatro contratos", () => { const source = fs.readFileSync(require.resolve("../src/modules/favorites/favoriteRoutes.js"), "utf8"); for (const pattern of [/post\("\/:restaurantId\/favorite"/, /delete\("\/:restaurantId\/favorite"/, /get\("\/:restaurantId\/favorite"/, /get\("\/me"/]) assert.match(source, pattern); });
test("frontend não envia userId", () => { for (const file of ["../public/favorites.js", "../public/restaurant-favorite.js"]) assert.doesNotMatch(fs.readFileSync(require.resolve(file), "utf8"), /userId/); });
test("página de favoritos usa APIs seguras do DOM", () => { const source = fs.readFileSync(require.resolve("../public/favorites.js"), "utf8"); assert.match(source, /textContent/); assert.doesNotMatch(source, /innerHTML/); });
test("página individual possui ação de favorito", () => assert.match(fs.readFileSync(require.resolve("../public/restaurant.html"), "utf8"), /restaurant-favorite\.js/));
test("listagem possui estado vazio", () => assert.match(fs.readFileSync(require.resolve("../public/favorites.js"), "utf8"), /ainda não salvou nenhum restaurante/));
