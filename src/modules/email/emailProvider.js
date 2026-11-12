class EmailProvider {
    isConfigured() { return false; }
    async send() { throw new Error("Provider de e-mail não configurado."); }
}
module.exports = EmailProvider;
