const test = require("node:test");
const assert = require("node:assert/strict");
const provider = require("../src/modules/auth/authProvider");
const users = require("../src/modules/users/userRepository");
const { prisma } = require("../src/config/database");
process.env.AWS_S3_REGION = "";
process.env.AWS_S3_BUCKET = "";

provider.verifyAccessToken = async token => {
    if (!['cliente', 'restaurante', 'outro', 'admin'].includes(token)) throw new Error("Token inválido");
    return { sub: token, exp: Math.floor(Date.now() / 1000) + 300 };
};
users.resolveUser = async claims => ({
    id: claims.sub === "restaurante" ? 2 : claims.sub === "outro" ? 3 : 1,
    role: claims.sub === "outro" ? "restaurante" : claims.sub,
    active: true
});

const restaurants = [
    { id: 10, name: "Pizza Teste", owner_id: 2 },
    { id: 20, name: "Outro Restaurante", owner_id: 3 }
];
let dishes;
let nextId;
function reset() {
    nextId = 3;
    dishes = [
        { id: 1, name: "Prato próprio", category: "Pizzas", description: "Descrição", price: 42.9, imageUrl: null, available: true, restaurantId: 10, createdAt: new Date(0), updatedAt: new Date(0) },
        { id: 2, name: "Prato alheio", category: "Massas", description: "Descrição", price: 30, imageUrl: null, available: true, restaurantId: 20, createdAt: new Date(0), updatedAt: new Date(0) }
    ];
}
reset();
const restaurantFor = dish => restaurants.find(row => row.id === dish.restaurantId);
prisma.restaurant.findUnique = async ({ where }) => restaurants.find(row => row.id === where.id) || null;
prisma.dish.findMany = async ({ where = {} }) => dishes.filter(dish => {
    if (where.restaurantId !== undefined && dish.restaurantId !== where.restaurantId) return false;
    if (where.restaurant?.owner_id !== undefined && restaurantFor(dish).owner_id !== where.restaurant.owner_id) return false;
    return true;
}).map(dish => ({ ...dish, restaurant: { ...restaurantFor(dish) } }));
prisma.dish.findUnique = async ({ where }) => {
    const dish = dishes.find(row => row.id === where.id);
    return dish ? { ...dish, restaurant: { ...restaurantFor(dish) } } : null;
};
prisma.dish.create = async ({ data }) => {
    const dish = { id: nextId++, ...data, createdAt: new Date(), updatedAt: new Date() };
    dishes.push(dish);
    return { ...dish };
};
function scoped(where, dish) {
    return where.id === dish.id && (where.restaurant?.owner_id === undefined || restaurantFor(dish).owner_id === where.restaurant.owner_id);
}
prisma.dish.updateMany = async ({ where, data }) => {
    const index = dishes.findIndex(dish => scoped(where, dish));
    if (index < 0) return { count: 0 };
    dishes[index] = { ...dishes[index], ...data, updatedAt: new Date() };
    return { count: 1 };
};
prisma.dish.deleteMany = async ({ where }) => {
    const index = dishes.findIndex(dish => scoped(where, dish));
    if (index < 0) return { count: 0 };
    dishes.splice(index, 1);
    return { count: 1 };
};

const app = require("../src/app");
let server;
let base;
test.before(async () => {
    server = await new Promise(resolve => { const instance = app.listen(0, "127.0.0.1", () => resolve(instance)); });
    base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { await new Promise(resolve => server.close(resolve)); await prisma.$disconnect(); });
test.beforeEach(reset);

function request(url, role, method = "GET", body) {
    return fetch(base + url, {
        method,
        headers: { "Content-Type": "application/json", ...(role ? { Authorization: `Bearer ${role}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}
function requestImage(url, role, type, body) {
    return fetch(base + url, { method:"POST", headers:{"Content-Type":type,...(role?{Authorization:`Bearer ${role}`}:{})}, body });
}
const validDish = { name: "Pizza Calabresa", category: "Pizzas", description: "Calabresa, cebola e mussarela", price: 42.9, available: true, imageUrl: null };

test("cria prato válido no próprio restaurante", async () => {
    const response = await request("/restaurants/10/dishes", "restaurante", "POST", validDish);
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.prato.restaurantId, 10);
    assert.equal(body.prato.price, 42.9);
});
test("lista pratos por restaurante", async () => { const response = await request("/restaurants/10/dishes"); assert.equal(response.status, 200); assert.equal((await response.json()).length, 1); });
test("busca prato por ID", async () => { const response = await request("/dishes/1"); assert.equal(response.status, 200); assert.equal((await response.json()).name, "Prato próprio"); });
test("atualiza prato próprio e disponibilidade", async () => { const response = await request("/dishes/1", "restaurante", "PATCH", { available: false, price: 45 }); assert.equal(response.status, 200); assert.equal((await response.json()).prato.available, false); });
test("exclui prato próprio", async () => { assert.equal((await request("/dishes/1", "restaurante", "DELETE")).status, 204); assert.equal(dishes.some(row => row.id === 1), false); });
test("prato inexistente retorna 404", async () => assert.equal((await request("/dishes/999")).status, 404));
test("restaurante inexistente retorna 404", async () => assert.equal((await request("/restaurants/999/dishes")).status, 404));
test("dados inválidos retornam 400", async () => assert.equal((await request("/restaurants/10/dishes", "restaurante", "POST", { ...validDish, price: -1 })).status, 400));
test("disponibilidade precisa ser booleana", async () => assert.equal((await request("/restaurants/10/dishes", "restaurante", "POST", { ...validDish, available: "true" })).status, 400));
test("imageUrl recusa protocolo executável", async () => assert.equal((await request("/restaurants/10/dishes", "restaurante", "POST", { ...validDish, imageUrl: "javascript:alert(1)" })).status, 400));
test("mass assignment de restaurantId é recusado", async () => assert.equal((await request("/restaurants/10/dishes", "restaurante", "POST", { ...validDish, restaurantId: 20 })).status, 400));
test("rota protegida sem token retorna 401", async () => assert.equal((await request("/restaurants/10/dishes", null, "POST", validDish)).status, 401));
test("cliente não cadastra prato", async () => assert.equal((await request("/restaurants/10/dishes", "cliente", "POST", validDish)).status, 403));
test("restaurante não cadastra em restaurante alheio", async () => assert.equal((await request("/restaurants/20/dishes", "restaurante", "POST", validDish)).status, 403));
test("restaurante não edita prato alheio", async () => assert.equal((await request("/dishes/2", "restaurante", "PATCH", { name: "Ataque" })).status, 403));
test("restaurante não exclui prato alheio", async () => assert.equal((await request("/dishes/2", "restaurante", "DELETE")).status, 403));
test("admin gerencia prato de qualquer restaurante", async () => {
    assert.equal((await request("/restaurants/20/dishes", "admin", "POST", validDish)).status, 201);
    assert.equal((await request("/dishes/2", "admin", "PATCH", { available: false })).status, 200);
    assert.equal((await request("/dishes/2", "admin", "DELETE")).status, 204);
});
test("listagem gerenciada respeita ownership e relação 1:N", async () => {
    const owner = await request("/dishes/managed", "restaurante");
    const ownerRows = await owner.json();
    assert.equal(ownerRows.length, 1);
    assert.equal(ownerRows[0].restaurantId, 10);
    const admin = await request("/dishes/managed", "admin");
    assert.equal((await admin.json()).length, 2);
});
test("upload sem token retorna 401 e cliente retorna 403",async()=>{
    assert.equal((await requestImage("/dishes/1/image",null,"image/jpeg",Buffer.from([0xff,0xd8,0xff]))).status,401);
    assert.equal((await requestImage("/dishes/1/image","cliente","image/jpeg",Buffer.from([0xff,0xd8,0xff]))).status,403);
});
test("rota bloqueia SVG antes do serviço",async()=>assert.equal((await requestImage("/dishes/1/image","restaurante","image/svg+xml",Buffer.from("<svg/>"))).status,415));
test("sem configuração S3 retorna 503 sem derrubar a aplicação",async()=>{
    const response=await requestImage("/dishes/1/image","restaurante","image/jpeg",Buffer.from([0xff,0xd8,0xff]));
    assert.equal(response.status,503);assert.match((await response.json()).message,/Storage S3 não configurado/);
});
