const { prisma } = require("../../config/database");
const authProvider = require("../auth/authProvider");
const activityService = require("../activity/activityService");
const ROLES = ["cliente", "restaurante", "admin"];
function deriveRole(groups) {
    const recognized = new Set(Array.isArray(groups) ? groups.filter(group => ROLES.includes(group)) : []);
    if (recognized.has("admin")) return "admin";
    if (recognized.has("restaurante")) return "restaurante";
    return "cliente";
}
async function resolveUser(claims, token, context = {}, audit = activityService) {
    const role = deriveRole(claims["cognito:groups"]);
    const existing = await prisma.user.findUnique({ where: { cognito_sub: claims.sub } });
    if (existing) {
        if (existing.role === role) return existing;
        const updated = await prisma.user.update({ where: { id: existing.id }, data: { role } });
        await audit.recordBestEffort({ userId: updated.id, action: "user.role.sync", entityType: "user", entityId: updated.id,
            metadata: { from: existing.role, to: role }, ipAddress: context.ipAddress });
        return updated;
    }
    const info = await authProvider.getUserInfo(token, claims.sub);
    return prisma.user.upsert({ where: { cognito_sub: claims.sub }, update: { role },
        create: { cognito_sub: claims.sub, ...info, role } });
}
module.exports = { resolveUser, deriveRole, ROLES };
