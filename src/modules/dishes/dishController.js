const service = require("./dishService");
const images=require("../images/imageService");

function handle(error, res, next) {
    if (error instanceof service.DishError) return res.status(error.status).json({ message: error.message, ...(error.errors ? { errors: error.errors } : {}) });
    next(error);
}

async function create(req, res, next) { try { res.status(201).json({ message: "Prato cadastrado com sucesso.", prato: await service.createDish(req.params.restaurantId, req.body, req.user, undefined, undefined, { ipAddress: req.ip }) }); } catch (error) { handle(error, res, next); } }
async function list(req, res, next) { try { res.json(await service.listDishes(req.params.restaurantId)); } catch (error) { handle(error, res, next); } }
async function get(req, res, next) { try { res.json(await service.getDish(req.params.dishId)); } catch (error) { handle(error, res, next); } }
async function update(req, res, next) { try { res.json({ message: "Prato atualizado.", prato: await service.updateDish(req.params.dishId, req.body, req.user, undefined, undefined, { ipAddress: req.ip }) }); } catch (error) { handle(error, res, next); } }
async function remove(req, res, next) { try { await service.deleteDish(req.params.dishId, req.user, undefined, undefined, undefined, { ipAddress: req.ip }); res.status(204).end(); } catch (error) { handle(error, res, next); } }
async function managed(req, res, next) { try { res.set("Cache-Control", "no-store"); res.json(await service.listManaged(req.user)); } catch (error) { handle(error, res, next); } }
async function uploadImage(req,res,next){try{const multipart=Boolean(req.file),processed=multipart?await images.processImage(req.file.buffer,{preset:"dish"}):{buffer:req.body};res.json({message:"Imagem atualizada.",prato:await service.uploadDishImage(req.params.dishId,req.user,processed.buffer,multipart?"image/webp":req.get("Content-Type").split(";")[0],undefined,undefined,undefined,{ipAddress:req.ip})});}catch(error){if(error instanceof images.ImageError)return res.status(error.status).json({message:error.message});handle(error,res,next);}}
async function removeImage(req, res, next) { try { res.json({ message: "Imagem removida.", prato: await service.removeDishImage(req.params.dishId, req.user, undefined, undefined, undefined, { ipAddress: req.ip }) }); } catch (error) { handle(error, res, next); } }

module.exports = { create, list, get, update, remove, managed, uploadImage, removeImage };
