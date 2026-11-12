
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { generateKeyPairSync, sign } = require("node:crypto");
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { createAuthMiddleware } = require("../src/middlewares/authMiddleware");
const { allowRoles } = require("../src/middlewares/roleMiddleware");
const { createUpdateHandler } = require("../src/modules/restaurants/restaurantManagement");
const pool = "us-east-1_TestPool", client = "testclient";
const issuer = "https://cognito-idp.us-east-1.amazonaws.com/" + pool;
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const verifier = CognitoJwtVerifier.create({ userPoolId: pool, clientId: client, tokenUse: "access", scope: "openid" });
verifier.cacheJwks({ keys: [{ ...keys.publicKey.export({ format: "jwk" }), kid: "test-key", use: "sig", alg: "RS256" }] });
function token(overrides = {}, privateKey = keys.privateKey) {
    const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: "cliente", iss: issuer, token_use: "access", client_id: client,
        scope: "openid email profile", exp: Math.floor(Date.now()/1000)+300, ...overrides })).toString("base64url");
    const input = header + "." + payload;
    return input + "." + sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url");
}
const restaurant = { id: 10, owner_id: 2, name: "Pizza Teste", category: "Pizza",
    description: "Descrição de restaurante para os testes.", address: "Rua dos Testes, 100", phone: "(11) 99999-9999", rating: 4.5 };
let writes = 0;
const repo = {
    findOwnedRestaurant: async id => id === 10 ? { ...restaurant } : null,
    updateRestaurant: async (id, owner, data) => { assert.ok(owner === 2 || owner === undefined); writes++; return { ...restaurant, ...data }; }
};
const app = express();
app.use(express.json());
const auth = createAuthMiddleware({ verify: value => verifier.verify(value),
    resolveUser: async claims => ({ id: claims.sub === "restaurante" ? 2 : claims.sub === "outro" ? 3 : 1,
        role: claims.sub === "outro" ? "restaurante" : claims.sub, active: claims.sub !== "bloqueado" }) });
app.get("/admin", auth, allowRoles("admin"), (req,res)=>res.json({ok:true}));
app.post("/restaurants", auth, allowRoles("restaurante","admin"), (req,res)=>res.status(201).json({ok:true}));
app.patch("/restaurants/:id", auth, allowRoles("restaurante","admin"), createUpdateHandler(repo));
app.delete("/restaurants/:id", auth, allowRoles("admin"), (req,res)=>res.status(204).end());
app.use((error,req,res,next)=>res.status(error.name === "RestaurantValidationError" ? 400 : 500).json({message:"Erro"}));
let server, base;
test.before(async()=> { server = await new Promise(resolve=>{ const s=app.listen(0,"127.0.0.1",()=>resolve(s)); }); base="http://127.0.0.1:"+server.address().port; });
test.after(async()=>{ await new Promise(resolve=>server.close(resolve)); });
async function request(route, jwt, method="GET", body) {
    return fetch(base+route,{method,headers:{ ...(jwt?{Authorization:"Bearer "+jwt}:{}), "Content-Type":"application/json" },body:body?JSON.stringify(body):undefined});
}
test("sem token retorna 401",async()=>assert.equal((await request("/admin")).status,401));
test("token malformado retorna 401",async()=>assert.equal((await request("/admin","invalido")).status,401));
for (const [name, claims] of [
    ["expiração ausente",{exp:undefined}],["nbf futuro",{nbf:Math.floor(Date.now()/1000)+300}],["expirado",{exp:1}],["issuer errado",{iss:"https://invalid.example"}],["client errado",{client_id:"other"}],
    ["ID token",{token_use:"id",aud:client}],["scope ausente",{scope:"email"}],["sub ausente",{sub:""}]
]) test(name+" retorna 401",async()=>assert.equal((await request("/admin",token(claims))).status,401));
test("assinatura de outra chave retorna 401",async()=>{
    const other=generateKeyPairSync("rsa",{modulusLength:2048});
    assert.equal((await request("/admin",token({},other.privateKey))).status,401);
});
test("cliente em admin retorna 403",async()=>assert.equal((await request("/admin",token())).status,403));
test("admin em admin permitido",async()=>assert.equal((await request("/admin",token({sub:"admin"}))).status,200));
test("cliente não cadastra",async()=>assert.equal((await request("/restaurants",token(),"POST",{})).status,403));
test("restaurante edita próprio registro",async()=>{
    const before=writes;
    const response=await request("/restaurants/10",token({sub:"restaurante"}),"PATCH",{name:"Pizza Nova"});
    assert.equal(response.status,200); assert.equal(writes,before+1);
});
test("restaurante não edita outro registro",async()=>{
    const before=writes;
    assert.equal((await request("/restaurants/10",token({sub:"outro"}),"PATCH",{name:"Pizza Nova"})).status,403);
    assert.equal(writes,before);
});
test("admin edita qualquer registro",async()=>assert.equal((await request("/restaurants/10",token({sub:"admin"}),"PATCH",{rating:5})).status,200));
test("não permite injetar owner_id",async()=>assert.equal((await request("/restaurants/10",token({sub:"restaurante"}),"PATCH",{owner_id:3})).status,400));
test("restaurante não exclui",async()=>assert.equal((await request("/restaurants/10",token({sub:"restaurante"}),"DELETE")).status,403));
test("admin pode excluir",async()=>assert.equal((await request("/restaurants/10",token({sub:"admin"}),"DELETE")).status,204));
test("conta bloqueada retorna 403",async()=>assert.equal((await request("/admin",token({sub:"bloqueado"}))).status,403));
test("edição inválida mantém validação anterior",async()=>assert.equal((await request("/restaurants/10",token({sub:"restaurante"}),"PATCH",{rating:10})).status,400));
test("restaurante inexistente retorna 404",async()=>assert.equal((await request("/restaurants/99",token({sub:"restaurante"}),"PATCH",{rating:4})).status,404));
test("mudança de dono durante edição não permite escrita", async()=>{
    let status;
    const handler=createUpdateHandler({findOwnedRestaurant:repo.findOwnedRestaurant,updateRestaurant:async()=>null});
    await handler({params:{id:"10"},user:{id:2,role:"restaurante"},method:"PATCH",body:{rating:3}},
        {status(code){status=code;return this;},json(){}});
    assert.equal(status,403);
});
