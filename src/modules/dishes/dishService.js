const repository = require("./dishRepository");
const storageService = require("../../services/storage/storageService");
const activityService = require("../activity/activityService");
const emailService = require("../email/emailService");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = {
    "image/jpeg": { extension: "jpg", matches: buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
    "image/png": { extension: "png", matches: buffer => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) },
    "image/webp": { extension: "webp", matches: buffer => buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP" }
};

class DishError extends Error {
    constructor(status, message, errors) {
        super(message);
        this.name = "DishError";
        this.status = status;
        this.errors = errors;
    }
}

function parseId(value, label = "ID") {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) throw new DishError(400, `${label} inválido.`);
    return id;
}

function validateData(input, { partial = false } = {}) {
    if (!input || Array.isArray(input) || typeof input !== "object") throw new DishError(400, "Dados do prato inválidos.");
    const allowed = ["name", "category", "description", "price", "imageUrl", "available"];
    if (Object.keys(input).some(key => !allowed.includes(key))) throw new DishError(400, "Campos inválidos para o prato.");
    const errors = [];
    const data = {};
    function required(field) { return !partial && input[field] === undefined; }
    if (required("name") || typeof input.name !== "string" && input.name !== undefined || typeof input.name === "string" && !input.name.trim()) errors.push("Nome é obrigatório.");
    else if (input.name !== undefined) { data.name = input.name.trim(); if (data.name.length > 120) errors.push("Nome deve ter até 120 caracteres."); }
    if (required("category") || typeof input.category !== "string" && input.category !== undefined || typeof input.category === "string" && !input.category.trim()) errors.push("Categoria é obrigatória.");
    else if (input.category !== undefined) { data.category = input.category.trim(); if (data.category.length > 60) errors.push("Categoria deve ter até 60 caracteres."); }
    if (input.description === undefined) { if (!partial) data.description = ""; }
    else if (typeof input.description !== "string") errors.push("Descrição deve ser texto.");
    else { data.description = input.description.trim(); if (data.description.length > 500) errors.push("Descrição deve ter até 500 caracteres."); }
    if (required("price")) errors.push("Preço é obrigatório.");
    else if (input.price !== undefined) {
        const priceText = typeof input.price === "number" || typeof input.price === "string" ? String(input.price).trim() : "";
        const price = Number(priceText);
        if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(priceText) || !Number.isFinite(price) || price < 0) errors.push("Preço deve ser um número maior ou igual a zero, com até duas casas decimais.");
        else data.price = price;
    }
    if (input.available === undefined) { if (!partial) data.available = true; }
    else if (typeof input.available !== "boolean") errors.push("Disponibilidade deve ser booleana.");
    else data.available = input.available;
    if (input.imageUrl === undefined) { if (!partial) data.imageUrl = null; }
    else if (input.imageUrl === null || input.imageUrl === "") data.imageUrl = null;
    else errors.push("Use o endpoint de upload para definir a imagem.");
    if (errors.length) throw new DishError(400, "Existem dados inválidos no prato.", errors);
    if (partial && !Object.keys(data).length) throw new DishError(400, "Informe ao menos um campo para editar.");
    return data;
}

function validateImageFile(buffer, contentType) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new DishError(400, "Arquivo de imagem ausente.");
    if (buffer.length > MAX_IMAGE_BYTES) throw new DishError(413, "A imagem deve ter no máximo 5 MB.");
    const type = IMAGE_TYPES[String(contentType || "").toLowerCase()];
    if (!type) throw new DishError(415, "Formato não permitido. Use JPEG, PNG ou WEBP.");
    if (!type.matches(buffer)) throw new DishError(400, "O conteúdo do arquivo não corresponde ao formato informado.");
    return type.extension;
}

function safeLegacyUrl(value) {
    return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value) ? value : null;
}

function isStorageNotConfigured(error, storage) {
    return error instanceof storageService.StorageNotConfiguredError || (typeof storage.StorageNotConfiguredError === "function" && error instanceof storage.StorageNotConfiguredError);
}

async function presentDish(dish, storage = storageService) {
    if (!dish) return null;
    let imageUrl = safeLegacyUrl(dish.imageUrl);
    if (dish.imageKey) {
        try { imageUrl = await storage.getReadUrl(dish.imageKey); }
        catch (error) { console.error("IMAGE_READ_URL_FAILED", { dishId: dish.id, reason: error.name }); imageUrl = null; }
    }
    const { imageKey, ...publicDish } = dish;
    return { ...publicDish, imageUrl, hasImage: Boolean(imageKey || imageUrl) };
}

async function presentMany(rows, storage = storageService) { return Promise.all(rows.map(row => presentDish(row, storage))); }

function assertCanManage(user, restaurant) {
    if (user.role === "admin") return;
    if (user.role !== "restaurante" || restaurant.owner_id !== user.id) throw new DishError(403, "Você não administra este restaurante.");
}

async function createDish(restaurantIdValue, input, user, repo = repository, audit = activityService, context = {}, email = emailService) {
    const restaurantId = parseId(restaurantIdValue, "ID do restaurante");
    const restaurant = await repo.findRestaurantById(restaurantId);
    if (!restaurant) throw new DishError(404, "Restaurante não encontrado.");
    assertCanManage(user, restaurant);
    const dish = await presentDish(await repo.create({ ...validateData(input), restaurantId }));
    await audit.recordBestEffort({ userId: user.id, action: "dish.create", entityType: "dish", entityId: dish.id,
        metadata: { dishId: dish.id, restaurantId }, ipAddress: context.ipAddress });
    await email.sendDishCreated({ actorId: user.id, entityId: dish.id, recipient: restaurant.owner,
        dish, restaurant }, context.emailProvider, context.emailAudit);
    return dish;
}

async function listDishes(restaurantIdValue, repo = repository) {
    const restaurantId = parseId(restaurantIdValue, "ID do restaurante");
    if (!await repo.findRestaurantById(restaurantId)) throw new DishError(404, "Restaurante não encontrado.");
    return presentMany(await repo.listByRestaurant(restaurantId));
}

async function getDish(dishIdValue, repo = repository) {
    const dish = await repo.findById(parseId(dishIdValue, "ID do prato"));
    if (!dish) throw new DishError(404, "Prato não encontrado.");
    return presentDish(dish);
}

async function updateDish(dishIdValue, input, user, repo = repository, audit = activityService, context = {}, email = emailService) {
    const id = parseId(dishIdValue, "ID do prato");
    const record = await repo.findRecordById(id);
    if (!record) throw new DishError(404, "Prato não encontrado.");
    assertCanManage(user, record.restaurant);
    const updated = await repo.update(id, user.role === "admin" ? undefined : user.id, validateData(input, { partial: true }));
    if (!updated) throw new DishError(403, "O acesso ao restaurante foi alterado.");
    const dish = await presentDish(updated);
    await audit.recordBestEffort({ userId: user.id, action: "dish.update", entityType: "dish", entityId: id,
        metadata: { dishId: id, restaurantId: record.restaurantId, fields: Object.keys(input) }, ipAddress: context.ipAddress });
    await email.sendDishUpdated({ actorId: user.id, entityId: id, recipient: record.restaurant.owner,
        dish, restaurant: record.restaurant, fields: Object.keys(input) }, context.emailProvider, context.emailAudit);
    return dish;
}

async function deleteDish(dishIdValue, user, repo = repository, storage = storageService, audit = activityService, context = {}, email = emailService) {
    const id = parseId(dishIdValue, "ID do prato");
    const record = await repo.findRecordById(id);
    if (!record) throw new DishError(404, "Prato não encontrado.");
    assertCanManage(user, record.restaurant);
    if (record.imageKey) {
        try { await storage.remove(record.imageKey); console.info("IMAGE_DELETED", { dishId: id }); }
        catch (error) {
            console.error("IMAGE_DELETE_FAILED", { dishId: id, reason: error.name });
            if (isStorageNotConfigured(error, storage)) throw new DishError(503, error.message);
            throw new DishError(502, "Não foi possível remover a imagem do storage.");
        }
    }
    const result = await repo.remove(id, user.role === "admin" ? undefined : user.id);
    if (!result.count) throw new DishError(403, "O acesso ao restaurante foi alterado.");
    await audit.recordBestEffort({ userId: user.id, action: "dish.delete", entityType: "dish", entityId: id,
        metadata: { dishId: id, restaurantId: record.restaurantId }, ipAddress: context.ipAddress });
    await email.sendDishRemoved({ actorId: user.id, entityId: id, recipient: record.restaurant.owner,
        dish: record, restaurant: record.restaurant }, context.emailProvider, context.emailAudit);
}

async function uploadDishImage(dishIdValue, user, buffer, contentType, repo = repository, storage = storageService, audit = activityService, context = {}) {
    const id = parseId(dishIdValue, "ID do prato");
    const record = await repo.findRecordById(id);
    if (!record) throw new DishError(404, "Prato não encontrado.");
    assertCanManage(user, record.restaurant);
    const extension = validateImageFile(buffer, contentType);
    const newKey = storage.buildDishKey({ restaurantId: record.restaurantId, dishId: id, extension });
    try { await storage.upload({ key: newKey, body: buffer, contentType }); }
    catch (error) {
        console.error("IMAGE_UPLOAD_FAILED", { dishId: id, reason: error.name });
        if (isStorageNotConfigured(error, storage)) throw new DishError(503, error.message);
        throw new DishError(502, "Falha ao enviar a imagem para o storage.");
    }
    let updated;
    try {
        updated = await repo.updateImageReference(id, user.role === "admin" ? undefined : user.id, { imageKey: newKey, imageUrl: null });
        if (!updated) throw new DishError(403, "O acesso ao restaurante foi alterado.");
    } catch (error) {
        try { await storage.remove(newKey); } catch (cleanupError) { console.error("IMAGE_UPLOAD_CLEANUP_FAILED", { dishId: id, reason: cleanupError.name }); }
        throw error;
    }
    if (record.imageKey) {
        try { await storage.remove(record.imageKey); console.info("IMAGE_REPLACED", { dishId: id }); }
        catch (error) { console.error("IMAGE_OLD_DELETE_FAILED", { dishId: id, reason: error.name }); }
    } else console.info("IMAGE_UPLOAD_SUCCESS", { dishId: id });
    const dish = await presentDish(updated, storage);
    await audit.recordBestEffort({ userId: user.id, action: record.imageKey ? "dish.image.replace" : "dish.image.upload",
        entityType: "dish", entityId: id, metadata: { dishId: id, restaurantId: record.restaurantId }, ipAddress: context.ipAddress });
    return dish;
}

async function removeDishImage(dishIdValue, user, repo = repository, storage = storageService, audit = activityService, context = {}) {
    const id = parseId(dishIdValue, "ID do prato"), record = await repo.findRecordById(id);
    if (!record) throw new DishError(404, "Prato não encontrado.");
    assertCanManage(user, record.restaurant);
    if (record.imageKey) {
        try { await storage.remove(record.imageKey); }
        catch (error) {
            console.error("IMAGE_DELETE_FAILED", { dishId: id, reason: error.name });
            if (isStorageNotConfigured(error, storage)) throw new DishError(503, error.message);
            throw new DishError(502, "Não foi possível remover a imagem do storage.");
        }
    }
    const updated = await repo.updateImageReference(id, user.role === "admin" ? undefined : user.id, { imageKey: null, imageUrl: null });
    if (!updated) throw new DishError(403, "O acesso ao restaurante foi alterado.");
    console.info("IMAGE_DELETED", { dishId: id });
    const dish = await presentDish(updated, storage);
    await audit.recordBestEffort({ userId: user.id, action: "dish.image.remove", entityType: "dish", entityId: id,
        metadata: { dishId: id, restaurantId: record.restaurantId }, ipAddress: context.ipAddress });
    return dish;
}

async function listManaged(user, repo = repository) { return presentMany(await repo.listManaged(user)); }

module.exports = { DishError, MAX_IMAGE_BYTES, IMAGE_TYPES, validateData, validateImageFile, presentDish, createDish, listDishes, getDish, updateDish, deleteDish, uploadDishImage, removeDishImage, listManaged };
