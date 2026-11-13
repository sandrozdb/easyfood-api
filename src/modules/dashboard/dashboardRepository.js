const { prisma } = require("../../config/database");

async function findRestaurantByOwner(ownerId) {
    return prisma.restaurant.findUnique({ where: { owner_id: ownerId }, select: { id: true, name: true } });
}

async function restaurantMetrics(restaurantId) {
    const [dishes, reviewSummary, ratings, favoriteCount, recentReviews] = await Promise.all([
        prisma.dish.groupBy({ by: ["available"], where: { restaurantId }, _count: { _all: true } }),
        prisma.review.aggregate({ where: { restaurantId }, _avg: { rating: true }, _count: { rating: true } }),
        prisma.review.groupBy({ by: ["rating"], where: { restaurantId }, _count: { rating: true } }),
        prisma.favorite.count({ where: { restaurantId } }),
        prisma.review.findMany({ where: { restaurantId }, select: { rating: true, comment: true, createdAt: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 5 })
    ]);
    return { dishes, reviewSummary, ratings, favoriteCount, recentReviews };
}

async function adminMetrics(now = new Date()) {
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [users, usersByRole, totalRestaurants, restaurantsWithOwner, dishes, reviews, totalFavorites, totalActivities, last24h, last7d] = await Promise.all([
        prisma.user.groupBy({ by: ["active"], _count: { _all: true } }),
        prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
        prisma.restaurant.count(),
        prisma.restaurant.count({ where: { owner_id: { not: null } } }),
        prisma.dish.groupBy({ by: ["available"], _count: { _all: true } }),
        prisma.review.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
        prisma.favorite.count(),
        prisma.activityLog.count(),
        prisma.activityLog.count({ where: { createdAt: { gte: dayAgo } } }),
        prisma.activityLog.count({ where: { createdAt: { gte: weekAgo } } })
    ]);
    return { users, usersByRole, totalRestaurants, restaurantsWithOwner, dishes, reviews, totalFavorites, totalActivities, last24h, last7d };
}

module.exports = { findRestaurantByOwner, restaurantMetrics, adminMetrics };
