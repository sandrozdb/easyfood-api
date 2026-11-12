
const test = require("node:test");
const assert = require("node:assert/strict");
const provider = require("../src/modules/auth/authProvider");
const users = require("../src/modules/users/userRepository");
const { prisma } = require("../src/config/database");
const repository = require("../src/modules/restaurants/restaurantRepository");
// Somente os limites externos são substituídos: as rotas reais e serviços são carregados abaixo.
provider.verifyAccessToken = async token => { if (!["cliente","restaurante","admin"].includes(token)) throw new Error("Inválido"); return { sub:token, exp:Math.floor(Date.now()/1000)+300 }; };
users.resolveUser = async claims => ({ id:claims.sub === "restaurante" ? 2 : 1, role:claims.sub, active:true });
const row = { id:10, owner_id:2, name:"Pizza Teste",category:"Pizza",rating:4.5,
 description:"Descrição de restaurante de teste.",address:"Rua dos Testes, 100",phone:"(11) 99999-9999",created_at:new Date(0) };
let created;
prisma.restaurant.findMany = async () => [row];
prisma.restaurant.findUnique = async ({where}) => where.id === 10 ? row : null;
prisma.restaurant.create = async ({data}) => { created=data; return {...row,...data}; };
prisma.restaurant.updateMany = async ({where}) => ({count: where.id === 10 && (where.owner_id === undefined || where.owner_id === 2) ? 1 : 0});
prisma.restaurant.deleteMany = async () => ({count:1});
prisma.user.findMany = async () => [{id:2,role:"restaurante"}];
const app = require("../src/app");
let server,base;
test.before(async()=> { server=await new Promise(resolve=>{ const s=app.listen(0,"127.0.0.1",()=>resolve(s)); }); base="http://127.0.0.1:"+server.address().port; });
test.after(async()=>{await new Promise(resolve=>server.close(resolve));await prisma.$disconnect();});
async function req(url,role,method="GET",body) {
 return fetch(base+url,{method,headers:{"Content-Type":"application/json",...(role?{Authorization:"Bearer "+role}:{})},body:body?JSON.stringify(body):undefined});
}
test("GET público preserva contrato e rating numérico",async()=>{
 const res=await req("/restaurants"); assert.equal(res.status,200); const [data]=await res.json();
 assert.deepEqual(Object.keys(data).sort(),["id","name","category","rating","averageRating","reviewCount","description","address","phone","created_at"].sort());
 assert.equal(typeof data.rating,"number");
});
test("POST real exige autenticação",async()=>assert.equal((await req("/restaurants",null,"POST",row)).status,401));
test("POST real impede cliente",async()=>assert.equal((await req("/restaurants","cliente","POST",row)).status,403));
test("POST real atribui dono autenticado e ignora escalada",async()=>{
 const response=await req("/restaurants","restaurante","POST",{...row,owner_id:999,role:"admin"});
 assert.equal(response.status,201); assert.equal(created.owner_id,2); assert.equal(created.role,undefined);
 assert.equal(typeof (await response.json()).restaurante.rating,"number");
});
test("POST real mantém validações",async()=>assert.equal((await req("/restaurants","admin","POST",{...row,rating:9})).status,400));
test("PATCH real usa ownership",async()=>assert.equal((await req("/restaurants/10","restaurante","PATCH",{rating:4})).status,200));
test("DELETE real não aceita restaurante",async()=>assert.equal((await req("/restaurants/10","restaurante","DELETE")).status,403));
test("rota admin real permite admin",async()=>assert.equal((await req("/admin/users","admin")).status,200));
test("rota admin real recusa cliente",async()=>assert.equal((await req("/admin/users","cliente")).status,403));
test("perfil exige autenticação e retorna identidade local",async()=>{
 assert.equal((await req("/auth/me")).status,401); const response=await req("/auth/me","cliente");
 assert.equal(response.status,200);assert.equal((await response.json()).role,"cliente");
});
test("admin não altera seu próprio acesso",async()=>assert.equal((await req("/admin/users/1","admin","PATCH",{role:"cliente"})).status,403));
test("admin rejeita perfil arbitrário",async()=>assert.equal((await req("/admin/users/2","admin","PATCH",{role:"superuser"})).status,400));
