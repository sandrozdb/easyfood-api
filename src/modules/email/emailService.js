const MailerSendProvider = require("./mailerSendProvider");
const activityService = require("../activity/activityService");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
function money(value) { return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function template(title, lines) {
    const safeTitle = escapeHtml(title), safeLines = lines.map(line => escapeHtml(line));
    return { text: [`EasyFood — ${title}`, "", ...lines, "", "Esta é uma mensagem automática do EasyFood."].join("\n"),
        html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#292929"><main style="max-width:600px;margin:auto;padding:24px"><strong style="color:#e85d04">EasyFood</strong><h1>${safeTitle}</h1>${safeLines.map(line => `<p>${line}</p>`).join("")}<hr><small>Esta é uma mensagem automática do EasyFood.</small></main></body></html>` };
}
function defaultProvider() {
    if (process.env.NODE_TEST_CONTEXT && process.env.EMAIL_REAL_TEST !== "1") return null;
    return process.env.MAIL_PROVIDER === "mailersend" ? new MailerSendProvider() : null;
}
async function deliver({ type, entityType, entityId, actorId, recipient, subject, content }, provider = defaultProvider(), audit = activityService) {
    const safeAudit = async action => {
        try { await audit.recordBestEffort({ userId: actorId, action, entityType, entityId, metadata: { type, entityId } }); }
        catch (error) { console.error("EMAIL_AUDIT_FAILED", { type, entityId, reason: error.name }); }
    };
    if (!recipient || !EMAIL_PATTERN.test(recipient.email || "")) { console.warn("EMAIL_SKIPPED", { type, entityId, reason: "invalid_or_missing_recipient" }); return { status: "skipped" }; }
    if (!provider || !provider.isConfigured()) { console.warn("EMAIL_SKIPPED", { type, entityId, reason: "not_configured" }); return { status: "skipped" }; }
    try {
        await provider.send({ to: { email: recipient.email, name: recipient.name || "Usuário EasyFood" }, subject, ...content });
        console.info("EMAIL_SENT", { type, entityId }); await safeAudit("email.sent"); return { status: "sent" };
    } catch (error) {
        console.error("EMAIL_FAILED", { type, entityId, status: error.status, reason: error.name });
        await safeAudit("email.failed"); return { status: "failed" };
    }
}
function sendDishCreated(data, provider, audit) { return deliver({ ...data, type: "dish.created", entityType: "dish", subject: "Novo prato cadastrado no EasyFood",
    content: template("Novo prato cadastrado", [`Olá, ${data.recipient?.name || "usuário"}.`, `Prato: ${data.dish.name}`, `Restaurante: ${data.restaurant.name}`, `Preço: ${money(data.dish.price)}`, "O cadastro foi concluído com sucesso."]) }, provider, audit); }
function sendDishUpdated(data, provider, audit) { return deliver({ ...data, type: "dish.updated", entityType: "dish", subject: "Prato atualizado no EasyFood",
    content: template("Prato atualizado", [`Prato: ${data.dish.name}`, `Restaurante: ${data.restaurant.name}`, `Campos alterados: ${data.fields.join(", ")}`]) }, provider, audit); }
function sendDishRemoved(data, provider, audit) { return deliver({ ...data, type: "dish.removed", entityType: "dish", subject: "Prato removido do EasyFood",
    content: template("Prato removido", [`Prato: ${data.dish.name}`, `Restaurante: ${data.restaurant.name}`, `Operação realizada em: ${new Date().toLocaleString("pt-BR")}`]) }, provider, audit); }
function sendRestaurantCreated(data, provider, audit) { return deliver({ ...data, type: "restaurant.created", entityType: "restaurant", subject: "Restaurante cadastrado no EasyFood",
    content: template("Restaurante cadastrado", [`Olá, ${data.recipient?.name || "usuário"}.`, `Restaurante: ${data.restaurant.name}`, "O cadastro foi concluído com sucesso."]) }, provider, audit); }
module.exports = { EMAIL_PATTERN, escapeHtml, template, deliver, sendDishCreated, sendDishUpdated, sendDishRemoved, sendRestaurantCreated };
