const EmailProvider = require("./emailProvider");

class MailerSendProvider extends EmailProvider {
    constructor(config = {}) {
        super();
        this.apiKey = config.apiKey ?? process.env.MAILERSEND_API_KEY;
        this.fromEmail = config.fromEmail ?? process.env.MAIL_FROM_EMAIL;
        this.fromName = config.fromName ?? process.env.MAIL_FROM_NAME ?? "EasyFood";
        this.timeoutMs = Number(config.timeoutMs ?? process.env.MAIL_TIMEOUT_MS ?? 8000);
        this.fetch = config.fetch ?? globalThis.fetch;
    }
    isConfigured() { return Boolean(this.apiKey && this.fromEmail && this.fetch); }
    async send(message) {
        if (!this.isConfigured()) { const error = new Error("MailerSend não configurado."); error.name = "EmailNotConfiguredError"; throw error; }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await this.fetch("https://api.mailersend.com/v1/email", {
                method: "POST", signal: controller.signal,
                headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ from: { email: this.fromEmail, name: this.fromName }, to: [{ email: message.to.email, name: message.to.name }],
                    subject: message.subject, text: message.text, html: message.html })
            });
            if (!response.ok) { const error = new Error("MailerSend recusou o envio."); error.name = "EmailProviderError"; error.status = response.status; throw error; }
        } finally { clearTimeout(timer); }
    }
}
module.exports = MailerSendProvider;
