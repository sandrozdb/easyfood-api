const { CognitoJwtVerifier } = require("aws-jwt-verify");
require("dotenv").config({ quiet: true });
let verifier;
function getConfig() {
    const config = {
        userPoolId: process.env.COGNITO_USER_POOL_ID, clientId: process.env.COGNITO_CLIENT_ID,
        domain: process.env.COGNITO_DOMAIN, redirectUri: process.env.COGNITO_CALLBACK_URL,
        logoutUri: process.env.COGNITO_LOGOUT_URL
    };
    if (Object.values(config).some(value => !value)) throw new Error("Configure as variáveis COGNITO.");
    const domain = new URL(config.domain);
    if (domain.protocol !== "https:" || domain.pathname !== "/" || domain.search || domain.hash || domain.username || domain.password) throw new Error("Domínio Cognito inválido.");
    config.domain = domain.origin;
    for (const uri of [config.redirectUri, config.logoutUri]) {
        const url = new URL(uri);
        if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) throw new Error("Use HTTPS ou localhost.");
    }
    return config;
}
function getVerifier() {
    if (!verifier) {
        const { userPoolId, clientId } = getConfig();
        verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "access", scope: "openid" });
    }
    return verifier;
}
module.exports = { getConfig, getVerifier };
