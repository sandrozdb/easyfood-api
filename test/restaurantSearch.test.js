const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const service = require("../src/modules/restaurants/restaurantService");

const rows = [
    { id: 1, name: "Pizza Central", category: "Pizza", averageRating: 4.5, reviewCount: 8, rating: 0, created_at: new Date("2024-01-01") },
    { id: 2, name: "pizza do Bairro", category: "Pizza", averageRating: 4, reviewCount: 2, rating: 5, created_at: new Date("2025-01-01") },
    { id: 3, name: "Sushi House", category: "Sushi", averageRating: 3, reviewCount: 1, rating: 4.8, created_at: new Date("2023-01-01") },
    { id: 4, name: "Sem Review", category: "Massa", averageRating: 0, reviewCount: 0, rating: 5, created_at: new Date("2026-01-01") }
];
function repo() {
    return { async listRestaurants(filters) { return rows.filter(row => (!filters.search || row.name.toLocaleLowerCase("pt-BR").includes(filters.search.toLocaleLowerCase("pt-BR"))) && (!filters.category || row.category === filters.category)); } };
}

test("sem filtros mantém contrato e ordem padrão", async () => assert.deepEqual((await service.listRestaurants({}, repo())).map(item => item.id), [1, 2, 3, 4]));
test("busca por nome", async () => assert.equal((await service.listRestaurants({ search: "Sushi" }, repo()))[0].id, 3));
test("busca parcial", async () => assert.equal((await service.listRestaurants({ search: "Central" }, repo())).length, 1));
test("busca case-insensitive", async () => assert.equal((await service.listRestaurants({ search: "PIZZA" }, repo())).length, 2));
test("busca sem resultado", async () => assert.deepEqual(await service.listRestaurants({ search: "inexistente" }, repo()), []));
test("espaços da busca são normalizados", () => assert.equal(service.normalizeRestaurantFilters({ search: "  Pizza   Central " }).search, "Pizza Central"));
test("busca vazia é removida", () => assert.equal(service.normalizeRestaurantFilters({ search: "   " }).search, undefined));
test("busca acima de 60 caracteres é rejeitada", () => assert.throws(() => service.normalizeRestaurantFilters({ search: "x".repeat(61) }), service.RestaurantFilterError));
test("busca que não é string é rejeitada", () => assert.throws(() => service.normalizeRestaurantFilters({ search: ["Pizza"] }), service.RestaurantFilterError));
test("filtra por categoria", async () => assert.deepEqual((await service.listRestaurants({ category: "Sushi" }, repo())).map(item => item.id), [3]));
test("categoria combina com busca", async () => assert.deepEqual((await service.listRestaurants({ search: "pizza", category: "Pizza" }, repo())).map(item => item.id), [1, 2]));
test("categoria acima de 30 caracteres é rejeitada", () => assert.throws(() => service.normalizeRestaurantFilters({ category: "x".repeat(31) }), service.RestaurantFilterError));
test("categoria array é rejeitada", () => assert.throws(() => service.normalizeRestaurantFilters({ category: ["Pizza"] }), service.RestaurantFilterError));
test("minRating 3 é aceito", () => assert.equal(service.normalizeRestaurantFilters({ minRating: "3" }).minRating, 3));
test("minRating 4 é aceito", () => assert.equal(service.normalizeRestaurantFilters({ minRating: "4" }).minRating, 4));
test("minRating 4.5 é aceito", () => assert.equal(service.normalizeRestaurantFilters({ minRating: "4.5" }).minRating, 4.5));
for (const value of ["abc", "10", "-1", "5", "3.5"]) test(`minRating ${value} é rejeitado`, () => assert.throws(() => service.normalizeRestaurantFilters({ minRating: value }), service.RestaurantFilterError));
test("minRating usa averageRating", async () => assert.deepEqual((await service.listRestaurants({ minRating: "4" }, repo())).map(item => item.id), [1, 2]));
test("restaurante sem review não passa na nota mínima apesar do rating legado", async () => assert.equal((await service.listRestaurants({ minRating: "3" }, repo())).some(item => item.id === 4), false));
test("ordena nome A-Z", async () => assert.deepEqual((await service.listRestaurants({ sort: "name_asc" }, repo())).map(item => item.id), [1, 2, 4, 3]));
test("ordena nome Z-A", async () => assert.deepEqual((await service.listRestaurants({ sort: "name_desc" }, repo())).map(item => item.id), [3, 4, 2, 1]));
test("ordena por averageRating", async () => assert.deepEqual((await service.listRestaurants({ sort: "rating_desc" }, repo())).map(item => item.id), [1, 2, 3, 4]));
test("ordena por reviewCount", async () => assert.deepEqual((await service.listRestaurants({ sort: "reviews_desc" }, repo())).map(item => item.id), [1, 2, 3, 4]));
test("ordena por mais recentes", async () => assert.deepEqual((await service.listRestaurants({ sort: "recent_desc" }, repo())).map(item => item.id), [4, 2, 1, 3]));
test("sort inválido é rejeitado", () => assert.throws(() => service.normalizeRestaurantFilters({ sort: "owner_id" }), service.RestaurantFilterError));
test("múltiplos filtros combinados", async () => assert.deepEqual((await service.listRestaurants({ search: "pizza", category: "Pizza", minRating: "4.5", sort: "rating_desc" }, repo())).map(item => item.id), [1]));
test("averageRating permanece correto", async () => assert.equal((await service.listRestaurants({}, repo()))[0].averageRating, 4.5));
test("reviewCount permanece correto", async () => assert.equal((await service.listRestaurants({}, repo()))[0].reviewCount, 8));
test("rating legado permanece no contrato", async () => assert.equal((await service.listRestaurants({}, repo()))[1].rating, 5));
test("repository usa contains do Prisma sem SQL manual", () => { const source = fs.readFileSync(require.resolve("../src/modules/restaurants/restaurantRepository.js"), "utf8"); assert.match(source, /name = \{ contains: filters\.search \}/); assert.doesNotMatch(source, /\$queryRaw|\$executeRaw/); });
test("repository agrega reviews sem N+1", () => { const source = fs.readFileSync(require.resolve("../src/modules/restaurants/restaurantRepository.js"), "utf8"); assert.match(source, /prisma\.review\.groupBy/); assert.match(source, /restaurantId: \{ in: restaurantIds \}/); });
test("listagem continua pública", () => { const source = fs.readFileSync(require.resolve("../src/modules/restaurants/restaurantRoutes.js"), "utf8"); assert.match(source, /router\.get\("\/", listRestaurants\)/); });
test("frontend possui os quatro controles", () => { const html = fs.readFileSync(require.resolve("../public/index.html"), "utf8"); for (const id of ["busca", "categoria", "nota-minima", "ordenacao", "limpar-filtros"]) assert.match(html, new RegExp(`id="${id}"`)); });
test("frontend usa debounce de 300 ms", () => assert.match(fs.readFileSync(require.resolve("../public/restaurant-list.js"), "utf8"), /setTimeout\([^,]+, 300\)/));
test("frontend apresenta estado vazio e limpeza", () => { const source = fs.readFileSync(require.resolve("../public/restaurant-list.js"), "utf8"); assert.match(source, /Nenhum restaurante encontrado com esses filtros/); assert.match(source, /resetFilters/); });
test("frontend renderiza resultados sem innerHTML", () => assert.doesNotMatch(fs.readFileSync(require.resolve("../public/restaurant-list.js"), "utf8"), /innerHTML/));
test("frontend preserva favoritos com uma listagem única", () => { const source = fs.readFileSync(require.resolve("../public/restaurant-list.js"), "utf8"); assert.equal((source.match(/EasyAuth\.api\("\/favorites\/me"\)/g) || []).length, 1); assert.match(source, /toggleFavorite/); });
test("frontend reflete filtros na URL", () => { const source = fs.readFileSync(require.resolve("../public/restaurant-list.js"), "utf8"); assert.match(source, /history\.replaceState/); assert.match(source, /URLSearchParams/); });
