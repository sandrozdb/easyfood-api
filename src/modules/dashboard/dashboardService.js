const repository = require("./dashboardRepository");

function countGroups(groups, field, value) {
    return groups.find(item => item[field] === value)?._count?._all || 0;
}

function ratingDistribution(groups = []) {
    const distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const item of groups) if (distribution[String(item.rating)] !== undefined) distribution[String(item.rating)] = item._count.rating;
    return distribution;
}

async function restaurantDashboard(userId, repo = repository) {
    const restaurant = await repo.findRestaurantByOwner(userId);
    if (!restaurant) return { hasRestaurant: false };
    const data = await repo.restaurantMetrics(restaurant.id);
    const availableDishes = countGroups(data.dishes, "available", true);
    const unavailableDishes = countGroups(data.dishes, "available", false);
    return {
        hasRestaurant: true,
        restaurant,
        metrics: {
            totalDishes: availableDishes + unavailableDishes,
            availableDishes,
            unavailableDishes,
            averageRating: data.reviewSummary._avg.rating === null ? 0 : Number(Number(data.reviewSummary._avg.rating).toFixed(1)),
            reviewCount: data.reviewSummary._count.rating,
            favoriteCount: data.favoriteCount
        },
        ratingDistribution: ratingDistribution(data.ratings),
        recentReviews: data.recentReviews.map(item => ({ rating: item.rating, comment: item.comment, createdAt: item.createdAt, authorName: item.user?.name || null }))
    };
}

async function adminDashboard(repo = repository, now = new Date()) {
    const data = await repo.adminMetrics(now);
    const active = countGroups(data.users, "active", true);
    const inactive = countGroups(data.users, "active", false);
    const available = countGroups(data.dishes, "available", true);
    const unavailable = countGroups(data.dishes, "available", false);
    const byRole = { cliente: 0, restaurante: 0, admin: 0 };
    for (const item of data.usersByRole) if (Object.hasOwn(byRole, item.role)) byRole[item.role] = item._count._all;
    return {
        users: { total: active + inactive, active, inactive, byRole },
        restaurants: { total: data.totalRestaurants, withOwner: data.restaurantsWithOwner, withoutOwner: data.totalRestaurants - data.restaurantsWithOwner },
        dishes: { total: available + unavailable, available, unavailable },
        reviews: { total: data.reviews._count.rating, averageRating: data.reviews._avg.rating === null ? 0 : Number(Number(data.reviews._avg.rating).toFixed(1)) },
        favorites: { total: data.totalFavorites },
        activities: { total: data.totalActivities, last24h: data.last24h, last7d: data.last7d }
    };
}

module.exports = { countGroups, ratingDistribution, restaurantDashboard, adminDashboard };
