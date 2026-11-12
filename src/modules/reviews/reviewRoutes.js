const express=require("express"),controller=require("./reviewController"),{authMiddleware}=require("../../middlewares/authMiddleware"),{allowRoles}=require("../../middlewares/roleMiddleware");
const restaurantReviewRoutes=express.Router(),reviewRoutes=express.Router();
restaurantReviewRoutes.get("/:restaurantId/reviews",controller.list);
restaurantReviewRoutes.post("/:restaurantId/reviews",authMiddleware,allowRoles("cliente"),controller.create);
reviewRoutes.get("/me",authMiddleware,allowRoles("cliente"),controller.mine);
reviewRoutes.patch("/:reviewId",authMiddleware,allowRoles("cliente"),controller.update);
reviewRoutes.put("/:reviewId",authMiddleware,allowRoles("cliente"),controller.update);
reviewRoutes.delete("/:reviewId",authMiddleware,allowRoles("cliente"),controller.remove);
module.exports={restaurantReviewRoutes,reviewRoutes};
