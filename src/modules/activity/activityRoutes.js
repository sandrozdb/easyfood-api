const service = require("./activityService");
const { authMiddleware } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

function createActivityRouter({ auth = authMiddleware, roleGuard = allowRoles("admin"), activity = service } = {}) {
    const router = require("express").Router();
    router.get("/", auth, roleGuard, async (req, res, next) => {
        try { res.set("Cache-Control", "no-store"); res.json(await activity.list(req.query)); }
        catch (error) {
            if (error instanceof service.ActivityValidationError) return res.status(400).json({ message: error.message });
            next(error);
        }
    });
    return router;
}

module.exports = createActivityRouter();
module.exports.createActivityRouter = createActivityRouter;
