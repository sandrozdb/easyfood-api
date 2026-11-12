const test = require("node:test");
const assert = require("node:assert/strict");
const email = require("../src/modules/email/emailService");
const MailerSendProvider = require("../src/modules/email/mailerSendProvider");
const dishService = require("../src/modules/dishes/dishService");
const restaurantService = require("../src/modules/restaurants/restaurantService");

function provider({ fail = false, configured = true } = {}) {
    const messages = [];
    return { messages, isConfigured: () => configured, send: async message => { messages.push(message); if (fail) { const error = new Error("segredo-nunca-logado"); error.status = 503; throw error; } } };
}
function audit({ fail = false } = {}) { const entries = []; return { entries, recordBestEffort: async entry => { entries.push(entry); if (fail) throw new Error("audit offline"); } }; }
function data() { return { actorId: 7, entityId: 9, recipient: { email: "owner@example.invalid", name: "Dono" }, dish: { id: 9, name: "Pizza", price: 42.9 }, restaurant: { id: 2, name: "Casa", owner_id: 7, owner: { email: "owner@example.invalid", name: "Dono" } }, fields: ["price"] }; }
function repo() { const record = { ...data().dish, category: "Pizza", description: "", available: true, imageKey: null, imageUrl: null, restaurantId: 2, restaurant: data().restaurant }; return { findRestaurantById: async () => data().restaurant, create: async input => ({ ...record, ...input }), findRecordById: async () => record, update: async (id, owner, input) => ({ ...record, ...input }), remove: async () => ({ count: 1 }) }; }
const noAudit = { recordBestEffort: async () => null }, noStorage = { remove: async () => {} };

test("EmailService envia evento de prato criado", async () => { const p = provider(); await email.sendDishCreated(data(), p, noAudit); assert.match(p.messages[0].subject, /Novo prato/); });
test("EmailService envia evento de prato atualizado", async () => { const p = provider(); await email.sendDishUpdated(data(), p, noAudit); assert.match(p.messages[0].subject, /atualizado/); });
test("EmailService envia evento de prato removido", async () => { const p = provider(); await email.sendDishRemoved(data(), p, noAudit); assert.match(p.messages[0].subject, /removido/); });
test("EmailService envia evento de restaurante criado", async () => { const p = provider(); await email.sendRestaurantCreated(data(), p, noAudit); assert.match(p.messages[0].subject, /Restaurante/); });
test("provider recebe destinatário confiável", async () => { const p = provider(); await email.sendDishCreated(data(), p, noAudit); assert.equal(p.messages[0].to.email, "owner@example.invalid"); });
test("e-mail inválido é ignorado", async () => { const p = provider(); await email.sendDishCreated({ ...data(), recipient: { email: "invalido" } }, p, noAudit); assert.equal(p.messages.length, 0); });
test("serviço desconfigurado é ignorado", async () => assert.deepEqual(await email.sendDishCreated(data(), provider({ configured: false }), noAudit), { status: "skipped" }));
test("template HTML escapa conteúdo malicioso", () => { const result = email.template("<script>x</script>", ["<img onerror=x>"]); assert.doesNotMatch(result.html, /<script>|<img/); assert.match(result.html, /&lt;script&gt;/); });
test("sucesso registra email.sent sem endereço", async () => { const a = audit(); await email.sendDishCreated(data(), provider(), a); assert.equal(a.entries[0].action, "email.sent"); assert.deepEqual(a.entries[0].metadata, { type: "dish.created", entityId: 9 }); });
test("falha registra email.failed", async () => { const a = audit(); assert.deepEqual(await email.sendDishCreated(data(), provider({ fail: true }), a), { status: "failed" }); assert.equal(a.entries[0].action, "email.failed"); });
test("falha do Activity Log não quebra envio", async () => assert.deepEqual(await email.sendDishCreated(data(), provider(), audit({ fail: true })), { status: "sent" }));
test("falha simultânea do provider e auditoria é controlada", async () => assert.deepEqual(await email.sendDishCreated(data(), provider({ fail: true }), audit({ fail: true })), { status: "failed" }));
test("logs de falha não expõem mensagem ou credencial", async () => { const original = console.error, logs = []; console.error = (...args) => logs.push(JSON.stringify(args)); try { await email.sendDishCreated(data(), provider({ fail: true }), noAudit); } finally { console.error = original; } assert.doesNotMatch(logs.join(""), /segredo-nunca-logado|owner@example/); });
test("MailerSend monta requisição sem expor segredo no corpo", async () => { let request; const p = new MailerSendProvider({ apiKey: "secret", fromEmail: "from@example.invalid", fetch: async (url, options) => (request = { url, options }, { ok: true }) }); await p.send({ to: { email: "to@example.invalid", name: "To" }, subject: "S", text: "T", html: "H" }); assert.doesNotMatch(request.options.body, /secret/); });
test("frontend não escolhe destinatário arbitrário", async () => { const p = provider(); await assert.rejects(() => dishService.createDish(2, { name: "Pizza", category: "Pizza", description: "", price: 10, email: "attacker@example.invalid" }, { id: 7, role: "restaurante" }, repo(), noAudit, { emailProvider: p, emailAudit: noAudit }), /Campos inválidos/); assert.equal(p.messages.length, 0); });
test("falha do provider não desfaz criação", async () => { const result = await dishService.createDish(2, { name: "Pizza", category: "Pizza", description: "", price: 10 }, { id: 7, role: "restaurante" }, repo(), noAudit, { emailProvider: provider({ fail: true }), emailAudit: noAudit }); assert.equal(result.id, 9); });
test("falha do provider não desfaz atualização", async () => { const result = await dishService.updateDish(9, { price: 11 }, { id: 7, role: "restaurante" }, repo(), noAudit, { emailProvider: provider({ fail: true }), emailAudit: noAudit }); assert.equal(result.id, 9); });
test("falha do provider não desfaz exclusão", async () => { await assert.doesNotReject(() => dishService.deleteDish(9, { id: 7, role: "restaurante" }, repo(), noStorage, noAudit, { emailProvider: provider({ fail: true }), emailAudit: noAudit })); });
test("restaurante criado tenta envio somente para responsável", async () => { const p = provider(), mail = { sendRestaurantCreated: (...args) => email.sendRestaurantCreated(...args) }; const input = { name: "Restaurante Teste", category: "Pizza", description: "Descrição válida para o restaurante.", address: "Rua de Teste, 123", phone: "(11) 99999-9999" }; const r = { createRestaurant: async row => ({ id: 12, ...row }) }; await restaurantService.createRestaurant(input, { id: 7, role: "restaurante", email: "owner@example.invalid", name: "Dono" }, r, noAudit, { emailProvider: p, emailAudit: noAudit }, mail); assert.equal(p.messages[0].to.email, "owner@example.invalid"); });
test("testes automáticos não usam MailerSend real", () => assert.ok(process.env.NODE_TEST_CONTEXT));
