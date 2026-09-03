const { prisma } = require("../../config/database");

function normalizeRestaurant(restaurant) {
    if (!restaurant) {
        return null;
    }

    return {
        ...restaurant,
        rating: Number(restaurant.rating)
    };
}

async function listRestaurants() {
    const restaurants = await prisma.restaurant.findMany({
        orderBy: {
            id: "asc"
        }
    });

    return restaurants.map(normalizeRestaurant);
}

async function findRestaurantById(id) {
    const restaurant = await prisma.restaurant.findUnique({
        where: {
            id
        }
    });

    return normalizeRestaurant(restaurant);
}

async function createRestaurant(data) {
    const restaurant = await prisma.restaurant.create({ data });
    return normalizeRestaurant(restaurant);
}

module.exports = {
    listRestaurants,
    createRestaurant,
    findRestaurantById
};
