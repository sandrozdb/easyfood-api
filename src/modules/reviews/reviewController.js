const service = require("./reviewService");
function handle(error, res, next) { if (error instanceof service.ReviewError) return res.status(error.status).json({ message: error.message }); next(error); }
async function list(req,res,next){try{res.json(await service.list(req.params.restaurantId));}catch(e){handle(e,res,next);}}
async function create(req,res,next){try{res.status(201).json({message:"Avaliação cadastrada.",review:await service.create(req.params.restaurantId,req.body,req.user,undefined,undefined,{ipAddress:req.ip})});}catch(e){handle(e,res,next);}}
async function mine(req,res,next){try{res.json(await require("./reviewRepository").listMine(req.user.id));}catch(e){next(e);}}
async function update(req,res,next){try{res.json({message:"Avaliação atualizada.",review:await service.update(req.params.reviewId,req.body,req.user,undefined,undefined,{ipAddress:req.ip})});}catch(e){handle(e,res,next);}}
async function remove(req,res,next){try{await service.remove(req.params.reviewId,req.user,undefined,undefined,{ipAddress:req.ip});res.status(204).end();}catch(e){handle(e,res,next);}}
module.exports={list,create,mine,update,remove};
