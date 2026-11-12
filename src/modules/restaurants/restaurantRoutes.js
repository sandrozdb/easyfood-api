const express = require("express");
const {
    listRestaurants,
    createRestaurant
} = require("./restaurantController");

const router = express.Router();

router.get("/", listRestaurants);

const { authMiddleware } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");
const { createUpdateHandler, deleteRestaurant } = require("./restaurantManagement");
const repository = require("./restaurantRepository");
router.get("/managed", authMiddleware, allowRoles("restaurante", "admin"), async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(await repository.listManagedRestaurants(req.user));
});
router.post("/", authMiddleware, allowRoles("restaurante", "admin"), createRestaurant);
router.put("/:id", authMiddleware, allowRoles("restaurante", "admin"), createUpdateHandler());
router.patch("/:id", authMiddleware, allowRoles("restaurante", "admin"), createUpdateHandler());
router.delete("/:id", authMiddleware, allowRoles("admin"), deleteRestaurant);


module.exports = router;
