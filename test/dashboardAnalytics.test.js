const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const service = require("../src/modules/dashboard/dashboardService");
const { allowRoles } = require("../src/middlewares/roleMiddleware");

const restaurantData = {
    dishes: [{ available: true, _count: { _all: 8 } }, { available: false, _count: { _all: 2 } }],
    reviewSummary: { _avg: { rating: 4.4 }, _count: { rating: 5 } },
    ratings: [{ rating: 5, _count: { rating: 2 } }, { rating: 4, _count: { rating: 3 } }],
    favoriteCount: 7,
    recentReviews: [{ rating: 5, comment: "Ótimo", createdAt: new Date("2026-01-02"), user: { name: "Cliente" } }]
};
function restaurantRepo(overrides = {}) { return { findRestaurantByOwner: async ownerId => ({ id: 12, name: "Meu Restaurante", ownerId }), restaurantMetrics: async () => restaurantData, ...overrides }; }
const adminData = {
    users: [{ active: true, _count: { _all: 8 } }, { active: false, _count: { _all: 2 } }],
    usersByRole: [{ role: "cliente", _count: { _all: 6 } }, { role: "restaurante", _count: { _all: 3 } }, { role: "admin", _count: { _all: 1 } }, { role: "arbitrario", _count: { _all: 9 } }],
    totalRestaurants: 3, restaurantsWithOwner: 2,
    dishes: [{ available: true, _count: { _all: 4 } }, { available: false, _count: { _all: 1 } }],
    reviews: { _avg: { rating: 4.25 }, _count: { rating: 8 } }, totalFavorites: 11, totalActivities: 20, last24h: 3, last7d: 9
};
function adminRepo(overrides = {}) { return { adminMetrics: async () => adminData, ...overrides }; }
function response() { return { code: 200, status(value) { this.code = value; return this; }, json() { return this; } }; }

test("restaurante recebe contrato completo", async () => assert.equal((await service.restaurantDashboard(9, restaurantRepo())).hasRestaurant, true));
test("owner é derivado do usuário autenticado", async () => { let owner; await service.restaurantDashboard(44, restaurantRepo({ findRestaurantByOwner: async id => { owner = id; return { id: 1, name: "R" }; } })); assert.equal(owner, 44); });
test("usuário sem restaurante recebe hasRestaurant false", async () => assert.deepEqual(await service.restaurantDashboard(9, restaurantRepo({ findRestaurantByOwner: async () => null })), { hasRestaurant: false }));
test("total de pratos", async () => assert.equal((await service.restaurantDashboard(9, restaurantRepo())).metrics.totalDishes, 10));
test("pratos disponíveis", async () => assert.equal((await service.restaurantDashboard(9, restaurantRepo())).metrics.availableDishes, 8));
test("pratos indisponíveis", async () => assert.equal((await service.restaurantDashboard(9, restaurantRepo())).metrics.unavailableDishes, 2));
test("disponíveis mais indisponíveis é total", async () => { const m=(await service.restaurantDashboard(9,restaurantRepo())).metrics; assert.equal(m.availableDishes+m.unavailableDishes,m.totalDishes); });
test("averageRating usa agregação real", async () => assert.equal((await service.restaurantDashboard(9, restaurantRepo())).metrics.averageRating, 4.4));
test("averageRating é arredondado para uma casa", async () => { const repo=restaurantRepo({restaurantMetrics:async()=>({...restaurantData,reviewSummary:{_avg:{rating:4.26},_count:{rating:2}}})}); assert.equal((await service.restaurantDashboard(1,repo)).metrics.averageRating,4.3); });
test("reviewCount correto", async () => assert.equal((await service.restaurantDashboard(9, restaurantRepo())).metrics.reviewCount, 5));
test("restaurante sem reviews tem média zero", async () => { const repo=restaurantRepo({restaurantMetrics:async()=>({...restaurantData,reviewSummary:{_avg:{rating:null},_count:{rating:0}}})}); assert.equal((await service.restaurantDashboard(1,repo)).metrics.averageRating,0); });
test("favoriteCount agregado", async () => assert.equal((await service.restaurantDashboard(9, restaurantRepo())).metrics.favoriteCount, 7));
for (const rating of [1,2,3]) test(`distribuição inicia ${rating} estrela em zero`, async () => assert.equal((await service.restaurantDashboard(9, restaurantRepo())).ratingDistribution[rating], 0));
test("distribuição conta 4 estrelas", async () => assert.equal((await service.restaurantDashboard(9, restaurantRepo())).ratingDistribution[4], 3));
test("distribuição conta 5 estrelas", async () => assert.equal((await service.restaurantDashboard(9, restaurantRepo())).ratingDistribution[5], 2));
test("distribuição vazia possui cinco zeros", () => assert.deepEqual(service.ratingDistribution([]), {"1":0,"2":0,"3":0,"4":0,"5":0}));
test("reviews recentes preservam campos públicos", async () => assert.deepEqual(Object.keys((await service.restaurantDashboard(9, restaurantRepo())).recentReviews[0]).sort(), ["authorName","comment","createdAt","rating"].sort()));
test("reviews recentes não retornam email", async () => assert.equal(JSON.stringify((await service.restaurantDashboard(9, restaurantRepo())).recentReviews).includes("email"), false));
test("reviews recentes não retornam cognito_sub", async () => assert.equal(JSON.stringify((await service.restaurantDashboard(9, restaurantRepo())).recentReviews).includes("cognito_sub"), false));
test("favoritos não expõem usuários", async () => { const result=await service.restaurantDashboard(9,restaurantRepo()); assert.equal(result.favoriteUsers,undefined); assert.equal(JSON.stringify(result).includes("userId"),false); });

test("admin calcula totalUsers", async () => assert.equal((await service.adminDashboard(adminRepo())).users.total, 10));
test("admin calcula activeUsers", async () => assert.equal((await service.adminDashboard(adminRepo())).users.active, 8));
test("admin calcula inactiveUsers", async () => assert.equal((await service.adminDashboard(adminRepo())).users.inactive, 2));
for (const [role,total] of [["cliente",6],["restaurante",3],["admin",1]]) test(`admin distribui role ${role}`, async () => assert.equal((await service.adminDashboard(adminRepo())).users.byRole[role],total));
test("role arbitrária não vira indicador", async () => assert.equal((await service.adminDashboard(adminRepo())).users.byRole.arbitrario, undefined));
test("admin totalRestaurants", async () => assert.equal((await service.adminDashboard(adminRepo())).restaurants.total,3));
test("admin restaurantsWithOwner", async () => assert.equal((await service.adminDashboard(adminRepo())).restaurants.withOwner,2));
test("admin restaurantsWithoutOwner", async () => assert.equal((await service.adminDashboard(adminRepo())).restaurants.withoutOwner,1));
test("admin totalDishes", async () => assert.equal((await service.adminDashboard(adminRepo())).dishes.total,5));
test("admin availableDishes", async () => assert.equal((await service.adminDashboard(adminRepo())).dishes.available,4));
test("admin unavailableDishes", async () => assert.equal((await service.adminDashboard(adminRepo())).dishes.unavailable,1));
test("admin totalReviews", async () => assert.equal((await service.adminDashboard(adminRepo())).reviews.total,8));
test("admin globalAverageRating", async () => assert.equal((await service.adminDashboard(adminRepo())).reviews.averageRating,4.3));
test("admin sem reviews tem média zero", async () => { const repo=adminRepo({adminMetrics:async()=>({...adminData,reviews:{_avg:{rating:null},_count:{rating:0}}})}); assert.equal((await service.adminDashboard(repo)).reviews.averageRating,0); });
test("admin totalFavorites", async () => assert.equal((await service.adminDashboard(adminRepo())).favorites.total,11));
test("admin totalActivities", async () => assert.equal((await service.adminDashboard(adminRepo())).activities.total,20));
test("admin activitiesLast24h", async () => assert.equal((await service.adminDashboard(adminRepo())).activities.last24h,3));
test("admin activitiesLast7d", async () => assert.equal((await service.adminDashboard(adminRepo())).activities.last7d,9));

for (const role of ["cliente","admin"]) test(`${role} não acessa dashboard de restaurante`, () => { const res=response(); allowRoles("restaurante")({user:{role}},res,()=>assert.fail("não deve permitir")); assert.equal(res.code,403); });
for (const role of ["cliente","restaurante"]) test(`${role} não acessa dashboard admin`, () => { const res=response(); allowRoles("admin")({user:{role}},res,()=>assert.fail("não deve permitir")); assert.equal(res.code,403); });
test("restaurante é autorizado", () => { let ok=false; allowRoles("restaurante")({user:{role:"restaurante"}},response(),()=>ok=true); assert.equal(ok,true); });
test("admin é autorizado", () => { let ok=false; allowRoles("admin")({user:{role:"admin"}},response(),()=>ok=true); assert.equal(ok,true); });
test("rotas exigem auth e contratos separados", () => { const source=fs.readFileSync(require.resolve("../src/modules/dashboard/dashboardRoutes.js"),"utf8"); assert.match(source,/get\("\/restaurant", authMiddleware, allowRoles\("restaurante"\)/); assert.match(source,/get\("\/admin", authMiddleware, allowRoles\("admin"\)/); });
test("rota não aceita restaurantId", () => assert.doesNotMatch(fs.readFileSync(require.resolve("../src/modules/dashboard/dashboardRoutes.js"),"utf8"), /restaurantId/));
test("repository limita reviews recentes a cinco", () => assert.match(fs.readFileSync(require.resolve("../src/modules/dashboard/dashboardRepository.js"),"utf8"), /take: 5/));
test("repository usa owner_id", () => assert.match(fs.readFileSync(require.resolve("../src/modules/dashboard/dashboardRepository.js"),"utf8"), /where: \{ owner_id: ownerId \}/));
test("repository usa agregações e não N+1", () => { const source=fs.readFileSync(require.resolve("../src/modules/dashboard/dashboardRepository.js"),"utf8"); assert.match(source,/groupBy/); assert.match(source,/aggregate/); assert.match(source,/Promise\.all/); });
test("dashboard solicita endpoint de restaurante", () => assert.match(fs.readFileSync(require.resolve("../public/dashboard.js"),"utf8"), /"\/dashboard\/restaurant"/));
test("admin solicita endpoint próprio", () => assert.match(fs.readFileSync(require.resolve("../public/dashboard.js"),"utf8"), /"\/dashboard\/admin"/));
test("frontend possui loading", () => { for(const file of ["../public/dashboard.html","../public/admin.html"]) assert.match(fs.readFileSync(require.resolve(file),"utf8"),/Carregando indicadores/); });
test("frontend trata erro sem apagar gerenciamento", () => { const source=fs.readFileSync(require.resolve("../public/dashboard.js"),"utf8"); assert.match(source,/Não foi possível carregar os indicadores/); assert.match(source,/await restaurants\(\)/); });
test("frontend trata restaurante ausente", () => assert.match(fs.readFileSync(require.resolve("../public/dashboard.js"),"utf8"),/ainda não possui um restaurante/));
test("frontend trata reviews vazias", () => assert.match(fs.readFileSync(require.resolve("../public/dashboard.js"),"utf8"),/ainda não recebeu avaliações/));
test("frontend renderiza com textContent", () => { const source=fs.readFileSync(require.resolve("../public/dashboard.js"),"utf8"); assert.match(source,/textContent/); assert.doesNotMatch(source,/innerHTML/); });
test("frontend não envia restaurantId ao dashboard", () => { const source=fs.readFileSync(require.resolve("../public/dashboard.js"),"utf8"); assert.doesNotMatch(source,/dashboard\/restaurant\?/); });
test("gerenciamento existente permanece", () => { const source=fs.readFileSync(require.resolve("../public/dashboard.js"),"utf8"); for(const value of ["/restaurants/managed","/dishes/managed","/admin/users","/admin/activity"]) assert.match(source,new RegExp(value.replace(/\//g,"\\/"))); });
test("não existem métricas falsas", () => { const source=fs.readFileSync(require.resolve("../public/dashboard.js"),"utf8"); assert.doesNotMatch(source,/Faturamento|Pedidos|Ticket médio|Receita|Conversão/); });
