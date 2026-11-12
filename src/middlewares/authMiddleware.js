const authProvider = require("../modules/auth/authProvider");
const users = require("../modules/users/userRepository");
function createAuthMiddleware({ verify = authProvider.verifyAccessToken, resolveUser = users.resolveUser } = {}) {
    return async (req, res, next) => {
        const match = /^Bearer ([^\s]+)$/i.exec(req.get("Authorization") || "");
        if (!match) return res.status(401).json({ message: "Autenticação necessária." });
        let claims;
        try {
            claims = await verify(match[1]);
            if (!Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000) throw new Error("Expiração ausente ou inválida.");
            if (typeof claims.sub !== "string" || !claims.sub) throw new Error("Identidade ausente.");
        } catch {
            return res.status(401).json({ message: "Token inválido ou expirado." });
        }
        try {
            req.user = await resolveUser(claims, match[1], { ipAddress: req.ip });
            if (!req.user.active) return res.status(403).json({ message: "Usuário desativado." });
            next();
        } catch {
            res.status(503).json({ message: "Não foi possível consultar o usuário. Tente novamente." });
        }
    };
}
module.exports = { authMiddleware: createAuthMiddleware(), createAuthMiddleware };
