const test = require("node:test");
const assert = require("node:assert/strict");
const { prisma } = require("../src/config/database");
const provider = require("../src/modules/auth/authProvider");
const { resolveUser, deriveRole } = require("../src/modules/users/userRepository");
const { createAuthMiddleware } = require("../src/middlewares/authMiddleware");

for (const [name, groups, role] of [
    ["grupo cliente", ["cliente"], "cliente"],
    ["grupo restaurante", ["restaurante"], "restaurante"],
    ["grupo admin", ["admin"], "admin"],
    ["cliente + admin prioriza admin", ["cliente", "admin"], "admin"],
    ["cliente + restaurante prioriza restaurante", ["cliente", "restaurante"], "restaurante"],
    ["grupo desconhecido não ganha privilégio", ["superuser"], "cliente"],
    ["token sem grupos usa padrão seguro", undefined, "cliente"],
    ["claim que não é array usa padrão seguro", "admin", "cliente"]
]) test(name, () => assert.equal(deriveRole(groups), role));

test("role igual não executa update no MySQL", async () => {
    const existing = { id:1,cognito_sub:"known",role:"cliente",active:true };
    prisma.user.findUnique = async () => existing;
    prisma.user.update = async () => assert.fail("Não deve atualizar role idêntico");
    const audit = { recordBestEffort: async () => assert.fail("Não deve gerar log sem mudança") };
    assert.equal(await resolveUser({ sub:"known", "cognito:groups":["cliente"] }, "fake", {}, audit), existing);
});

for (const [name, from, groups, to] of [
    ["mudança cliente para admin atualiza MySQL", "cliente", ["cliente","admin"], "admin"],
    ["mudança admin para cliente atualiza MySQL", "admin", ["cliente"], "cliente"]
]) test(name, async () => {
    const existing = { id:7,cognito_sub:"known",role:from,active:false,email:"preserve@example.invalid" };
    prisma.user.findUnique = async ({where}) => { assert.equal(where.cognito_sub,"known"); return existing; };
    prisma.user.update = async args => {
        assert.deepEqual(args,{where:{id:7},data:{role:to}});
        return {...existing,role:to};
    };
    provider.getUserInfo = async () => assert.fail("Usuário existente não consulta userInfo");
    const entries = [], audit = { recordBestEffort: async entry => entries.push(entry) };
    const user = await resolveUser({sub:"known","cognito:groups":groups},"fake",{},audit);
    assert.equal(user.role,to); assert.equal(user.active,false); assert.equal(user.cognito_sub,"known");
    assert.equal(entries[0].action,"user.role.sync");
    assert.deepEqual(entries[0].metadata,{from,to});
});

for (const [groups, role] of [[[],"cliente"],[["restaurante"],"restaurante"],[["admin"],"admin"],[["unknown"],"cliente"]]) {
    test("primeiro provisionamento: "+JSON.stringify(groups)+" -> "+role,async()=>{
        prisma.user.findUnique=async()=>null;
        provider.getUserInfo=async(token,sub)=>{assert.equal(sub,"new-sub");return {name:"Teste",email:"test@example.invalid"};};
        prisma.user.upsert=async args=>{assert.equal(args.where.cognito_sub,"new-sub");assert.deepEqual(args.update,{role});return args.create;};
        const user=await resolveUser({sub:"new-sub","cognito:groups":groups},"fake");assert.equal(user.role,role);assert.equal(user.cognito_sub,"new-sub");
    });
}

test("falha userInfo não cria usuário local",async()=>{
    prisma.user.findUnique=async()=>null;provider.getUserInfo=async()=>{throw new Error("Identidade divergente");};prisma.user.upsert=async()=>assert.fail("Não pode criar");
    await assert.rejects(resolveUser({sub:"new-sub"},"fake"));
});

test("JWT inválido não chama sincronização", async () => {
    let synchronized = 0, status;
    const middleware = createAuthMiddleware({ verify:async()=>{throw new Error("assinatura inválida");}, resolveUser:async()=>{synchronized++;} });
    await middleware({get:()=>"Bearer inválido"},{status(code){status=code;return this;},json(){}},()=>assert.fail("Não deve chamar next"));
    assert.equal(status,401);assert.equal(synchronized,0);
});
