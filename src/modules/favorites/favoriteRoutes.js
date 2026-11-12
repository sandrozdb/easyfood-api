const express = require("express");
const controller = require("./favoriteController");
const { authMiddleware } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");

const restaurantFavoriteRoutes = express.Router();
const favoriteRoutes = express.Router();
const clientOnly = [authMiddleware, allowRoles("cliente")];

restaurantFavoriteRoutes.post("/:restaurantId/favorite", ...clientOnly, controller.add);
restaurantFavoriteRoutes.delete("/:restaurantId/favorite", ...clientOnly, controller.remove);
restaurantFavoriteRoutes.get("/:restaurantId/favorite", ...clientOnly, controller.status);
favoriteRoutes.get("/me", ...clientOnly, controller.mine);

module.exports = { restaurantFavoriteRoutes, favoriteRoutes };
