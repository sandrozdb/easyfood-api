const router = require("express").Router();
const { getConfig } = require("../../config/cognito");
const { authMiddleware } = require("../../middlewares/authMiddleware");
const {singleImage}=require("../images/uploadMiddleware"),profileImages=require("../users/profileImageService");
router.get("/config", (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        const { clientId, domain, redirectUri, logoutUri } = getConfig();
        res.json({ clientId, domain, redirectUri, logoutUri, scope: "openid email profile" });
    } catch { res.status(503).json({ message: "Login indisponível: configure o Cognito no servidor." }); }
});
router.get("/me", authMiddleware, async(req,res,next)=>{try{res.set("Cache-Control","no-store");res.json(await profileImages.present(req.user));}catch(e){next(e);}});
router.post("/me/image",authMiddleware,singleImage,async(req,res,next)=>{try{res.json(await profileImages.upload(req.user,req.file));}catch(e){if(e.status)return res.status(e.status).json({message:e.message});next(e);}});
router.delete("/me/image",authMiddleware,async(req,res,next)=>{try{res.json(await profileImages.remove(req.user));}catch(e){next(e);}});
module.exports = router;
