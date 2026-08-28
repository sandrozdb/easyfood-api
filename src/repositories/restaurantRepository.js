const { prisma } = require("../config/database");

function normalizarRestaurante(restaurante) {
    if (!restaurante) {
        return null;
    }

    return {
        ...restaurante,
        rating: Number(restaurante.rating)
    };
}

async function listRestaurants() {
    const restaurants = await prisma.restaurant.findMany({
        orderBy: {
            id: "asc"
        }
    });

    return restaurants.map(normalizarRestaurante);
}

async function findRestaurantById(id) {
    const restaurant = await prisma.restaurant.findUnique({
        where: {
            id
        }
    });

    return normalizarRestaurante(restaurant);
}

async function createRestaurant(data) {
    const restaurant = await prisma.restaurant.create({
        data
    });

    return normalizarRestaurante(restaurant);
}

module.exports = {
    listRestaurants,
    createRestaurant,
    findRestaurantById
};
