const restaurantRepository = require("./restaurantRepository");
const activityService = require("../activity/activityService");
const emailService = require("../email/emailService");

const ALLOWED_CATEGORIES = [
    "Pizza",
    "Burguer",
    "Massa",
    "Saudável",
    "Sushi",
    "Mexicana",
    "Churrasco",
    "Sobremesas"
];

const NAME_PATTERN = /^[A-Za-zÀ-ÿ0-9.'’& -]{3,60}$/;
const PHONE_PATTERN = /^\(\d{2}\) \d{4,5}-\d{4}$/;
const RATING_PATTERN = /^\d(?:\.\d)?$/;

class RestaurantValidationError extends Error {
    constructor(errors) {
        super("Existem dados fora do padrão.");
        this.name = "RestaurantValidationError";
        this.errors = errors;
    }
}

class RestaurantFilterError extends Error {
    constructor(errors) {
        super("Parâmetros de busca inválidos.");
        this.name = "RestaurantFilterError";
        this.errors = errors;
    }
}

const ALLOWED_MIN_RATINGS = new Set([3, 4, 4.5]);
const ALLOWED_SORTS = new Set(["default", "name_asc", "name_desc", "rating_desc", "reviews_desc", "recent_desc"]);

function normalizeRestaurantFilters(query = {}) {
    const errors = [];
    const onlyString = (value, field, max) => {
        if (value === undefined || value === "") return undefined;
        if (typeof value !== "string") { errors.push(`${field} deve ser texto.`); return undefined; }
        const normalized = value.trim().replace(/\s+/g, " ");
        if (normalized.length > max) errors.push(`${field} deve ter no máximo ${max} caracteres.`);
        return normalized || undefined;
    };
    const search = onlyString(query.search, "search", 60);
    const category = onlyString(query.category, "category", 30);
    let minRating;
    if (query.minRating !== undefined && query.minRating !== "") {
        minRating = Number(query.minRating);
        if (!ALLOWED_MIN_RATINGS.has(minRating)) errors.push("minRating deve ser 3, 4 ou 4.5.");
    }
    const sort = query.sort === undefined || query.sort === "" ? "default" : query.sort;
    if (typeof sort !== "string" || !ALLOWED_SORTS.has(sort)) errors.push("sort inválido.");
    if (errors.length) throw new RestaurantFilterError(errors);
    return { search, category, minRating, sort };
}

function parseRating(receivedRating, errors) {
    const ratingWasNotProvided =
        receivedRating === undefined ||
        receivedRating === null ||
        (
            typeof receivedRating === "string" &&
            receivedRating.trim() === ""
        );

    if (ratingWasNotProvided) {
        return 0;
    }

    const hasValidType =
        typeof receivedRating === "number" ||
        typeof receivedRating === "string";
    const ratingText = hasValidType ? String(receivedRating).trim() : "";
    const convertedRating = Number(ratingText);

    if (
        !hasValidType ||
        !RATING_PATTERN.test(ratingText) ||
        !Number.isFinite(convertedRating) ||
        convertedRating < 0 ||
        convertedRating > 5
    ) {
        errors.push(
            "A avaliação deve ser um número entre 0 e 5, com no máximo uma casa decimal."
        );
        return 0;
    }

    return convertedRating;
}

function prepareRestaurantData(input = {}) {
    const name = String(input.name || "").trim();
    const category = String(input.category || "").trim();
    const description = String(input.description || "").trim();
    const address = String(input.address || "").trim();
    const phone = String(input.phone || "").trim();
    const errors = [];
    const rating = parseRating(input.rating, errors);

    if (!NAME_PATTERN.test(name)) {
        errors.push(
            "O nome deve ter entre 3 e 60 caracteres e não pode conter símbolos inválidos."
        );
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
        errors.push("Selecione uma categoria válida.");
    }

    if (description.length < 20 || description.length > 160) {
        errors.push("A descrição deve ter entre 20 e 160 caracteres.");
    }

    if (address.length < 10 || address.length > 120) {
        errors.push("O endereço deve ter entre 10 e 120 caracteres.");
    }

    if (!PHONE_PATTERN.test(phone)) {
        errors.push("Informe o telefone no formato (11) 99999-9999.");
    }

    if (errors.length > 0) {
        throw new RestaurantValidationError(errors);
    }

    return {
        name,
        category,
        rating,
        description,
        address,
        phone
    };
}

async function listRestaurants(query = {}, repo = restaurantRepository) {
    const filters = normalizeRestaurantFilters(query);
    const restaurants = await repo.listRestaurants(filters);
    const filtered = filters.minRating === undefined ? restaurants : restaurants.filter(item => item.reviewCount > 0 && item.averageRating >= filters.minRating);
    const comparisons = {
        name_asc: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
        name_desc: (a, b) => b.name.localeCompare(a.name, "pt-BR"),
        rating_desc: (a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name, "pt-BR"),
        reviews_desc: (a, b) => b.reviewCount - a.reviewCount || b.averageRating - a.averageRating || a.name.localeCompare(b.name, "pt-BR"),
        recent_desc: (a, b) => new Date(b.created_at) - new Date(a.created_at)
    };
    return comparisons[filters.sort] ? [...filtered].sort(comparisons[filters.sort]) : filtered;
}

async function createRestaurant(input, user, repo = restaurantRepository, audit = activityService, context = {}, email = emailService) {
    const restaurantData = prepareRestaurantData(input);
    const restaurant = await repo.createRestaurant({ ...restaurantData, owner_id: user?.role === "restaurante" ? user.id : null });
    await audit.recordBestEffort({ userId: user?.id, action: "restaurant.create", entityType: "restaurant", entityId: restaurant.id,
        metadata: { restaurantId: restaurant.id }, ipAddress: context.ipAddress });
    await email.sendRestaurantCreated({ actorId: user?.id, entityId: restaurant.id,
        recipient: user?.role === "restaurante" ? { email: user.email, name: user.name } : null, restaurant }, context.emailProvider, context.emailAudit);
    return restaurant;
}

async function findRestaurantById(id) {
    return restaurantRepository.findRestaurantById(id);
}

module.exports = {
    listRestaurants,
    createRestaurant,
    findRestaurantById,
    prepareRestaurantData,
    RestaurantValidationError,
    RestaurantFilterError,
    normalizeRestaurantFilters,
    ALLOWED_CATEGORIES
};
