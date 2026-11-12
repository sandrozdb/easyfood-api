const { prisma } = require("../../config/database");

function normalizeRestaurant(restaurant, review = {}) {
    if (!restaurant) {
        return null;
    }

    return {
        id: restaurant.id, name: restaurant.name, category: restaurant.category,
        description: restaurant.description, address: restaurant.address,
        phone: restaurant.phone, created_at: restaurant.created_at,
        rating: Number(restaurant.rating), averageRating: review.averageRating || 0, reviewCount: review.reviewCount || 0
    };
}

async function listRestaurants(filters = {}) {
    const where = {};
    if (filters.search) where.name = { contains: filters.search };
    if (filters.category) where.category = filters.category;
    const restaurants = await prisma.restaurant.findMany({
        where,
        orderBy: {
            id: "asc"
        }
    });

    const restaurantIds = restaurants.map(item => item.id);
    const grouped = restaurantIds.length ? await prisma.review.groupBy({ by: ["restaurantId"], where: { restaurantId: { in: restaurantIds } }, _avg: { rating: true }, _count: { rating: true } }) : [];
    const reviews = new Map(grouped.map(item => [item.restaurantId, { averageRating: Number(Number(item._avg.rating).toFixed(1)), reviewCount: item._count.rating }]));
    return restaurants.map(row => normalizeRestaurant(row, reviews.get(row.id)));
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


async function findOwnedRestaurant(id) { return prisma.restaurant.findUnique({ where: { id } }); }
async function updateRestaurant(id, ownerId, data) {
    const result = await prisma.restaurant.updateMany({ where: { id, ...(ownerId === undefined ? {} : { owner_id: ownerId }) }, data });
    return result.count ? findRestaurantById(id) : null;
}
async function deleteRestaurant(id) { return prisma.restaurant.deleteMany({ where: { id } }); }
async function listManagedRestaurants(user) {
    const rows = await prisma.restaurant.findMany({ where: user.role === "admin" ? {} : { owner_id: user.id }, orderBy: { id: "asc" } });
    return rows.map(row => ({ ...normalizeRestaurant(row), owner_id: row.owner_id }));
}
module.exports = {
    findOwnedRestaurant, updateRestaurant, deleteRestaurant, listManagedRestaurants,

    listRestaurants,
    createRestaurant,
    findRestaurantById
};
