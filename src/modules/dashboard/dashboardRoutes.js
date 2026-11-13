const router = require("express").Router();
const controller = require("./dashboardController");
const { authMiddleware } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

router.get("/restaurant", authMiddleware, allowRoles("restaurante"), controller.restaurant);
router.get("/admin", authMiddleware, allowRoles("admin"), controller.admin);

module.exports = router;
