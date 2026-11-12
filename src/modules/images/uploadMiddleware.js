const multer=require("multer");
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
function singleImage(req,res,next){upload.single("image")(req,res,error=>{if(!error)return next();if(error.code==="LIMIT_FILE_SIZE")return res.status(413).json({message:"A imagem deve ter no máximo 5 MB."});res.status(400).json({message:"Upload de imagem inválido."});});}
module.exports={singleImage};
