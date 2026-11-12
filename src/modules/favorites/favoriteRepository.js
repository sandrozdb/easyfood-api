const { prisma } = require("../../config/database");

async function restaurantExists(id) {
    return Boolean(await prisma.restaurant.findUnique({ where: { id }, select: { id: true } }));
}

async function create(userId, restaurantId) {
    return prisma.favorite.create({ data: { userId, restaurantId } });
}

async function remove(userId, restaurantId) {
    return prisma.favorite.deleteMany({ where: { userId, restaurantId } });
}

async function exists(userId, restaurantId) {
    return Boolean(await prisma.favorite.findUnique({
        where: { userId_restaurantId: { userId, restaurantId } },
        select: { id: true }
    }));
}

async function listMine(userId) {
    const favorites = await prisma.favorite.findMany({
        where: { userId },
        include: { restaurant: true },
        orderBy: { createdAt: "desc" }
    });
    const restaurantIds = favorites.map(item => item.restaurantId);
    const grouped = restaurantIds.length ? await prisma.review.groupBy({
        by: ["restaurantId"],
        where: { restaurantId: { in: restaurantIds } },
        _avg: { rating: true },
        _count: { rating: true }
    }) : [];
    const ratings = new Map(grouped.map(item => [item.restaurantId, {
        averageRating: item._avg.rating === null ? 0 : Number(Number(item._avg.rating).toFixed(1)),
        reviewCount: item._count.rating
    }]));
    return favorites.map(item => ({
        ...item.restaurant,
        rating: Number(item.restaurant.rating),
        ...(ratings.get(item.restaurantId) || { averageRating: 0, reviewCount: 0 }),
        favoritedAt: item.createdAt
    }));
}

module.exports = { restaurantExists, create, remove, exists, listMine };
