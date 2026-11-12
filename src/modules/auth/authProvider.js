const { getVerifier, getConfig } = require("../../config/cognito");
async function verifyAccessToken(token) { return getVerifier().verify(token); }
async function getUserInfo(token, sub) {
    const response = await fetch(getConfig().domain + "/oauth2/userInfo", {
        headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error("Falha ao consultar identidade.");
    const info = await response.json();
    if (info.sub !== sub) throw new Error("Identidade divergente.");
    return { email: typeof info.email === "string" ? info.email.slice(0,254) : null,
        name: typeof info.name === "string" ? info.name.slice(0,120) : null };
}
module.exports = { verifyAccessToken, getUserInfo };
