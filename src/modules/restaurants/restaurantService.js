const restaurantRepository = require("./restaurantRepository");

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

async function listRestaurants() {
    return restaurantRepository.listRestaurants();
}

async function createRestaurant(input) {
    const restaurantData = prepareRestaurantData(input);
    return restaurantRepository.createRestaurant(restaurantData);
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
    ALLOWED_CATEGORIES
};
