const express = require("express");
const controller = require("./dishController");
const { authMiddleware } = require("../../middlewares/authMiddleware");
const { allowRoles } = require("../../middlewares/roleMiddleware");
const {singleImage}=require("../images/uploadMiddleware");
const legacyRaw=express.raw({type:()=>true,limit:5*1024*1024});
function receiveImage(req,res,next){if(/^multipart\/form-data/i.test(req.get("Content-Type")||""))return singleImage(req,res,next);const type=String(req.get("Content-Type")||"").split(";")[0].toLowerCase();if(!["image/jpeg","image/png","image/webp"].includes(type))return res.status(415).json({message:"Formato não permitido. Use JPEG, PNG ou WEBP."});legacyRaw(req,res,next);}

const restaurantDishRoutes = express.Router();
restaurantDishRoutes.get("/:restaurantId/dishes", controller.list);
restaurantDishRoutes.post("/:restaurantId/dishes", authMiddleware, allowRoles("restaurante", "admin"), controller.create);

const dishRoutes = express.Router();
dishRoutes.get("/managed", authMiddleware, allowRoles("restaurante", "admin"), controller.managed);
dishRoutes.post("/:dishId/image", authMiddleware, allowRoles("restaurante", "admin"), receiveImage, controller.uploadImage);
dishRoutes.delete("/:dishId/image", authMiddleware, allowRoles("restaurante", "admin"), controller.removeImage);
dishRoutes.get("/:dishId", controller.get);
dishRoutes.put("/:dishId", authMiddleware, allowRoles("restaurante", "admin"), controller.update);
dishRoutes.patch("/:dishId", authMiddleware, allowRoles("restaurante", "admin"), controller.update);
dishRoutes.delete("/:dishId", authMiddleware, allowRoles("restaurante", "admin"), controller.remove);

module.exports = { restaurantDishRoutes, dishRoutes };
