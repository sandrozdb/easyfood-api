const { prisma } = require("../../config/database");
const author = { select: { id: true, name: true } };
function normalize(row) { return row ? { id: row.id, userId: row.userId, restaurantId: row.restaurantId, rating: row.rating,
    comment: row.comment, createdAt: row.createdAt, updatedAt: row.updatedAt, ...(row.user ? { author: row.user } : {}) } : null; }
async function restaurantExists(id) { return Boolean(await prisma.restaurant.findUnique({ where: { id }, select: { id: true } })); }
async function listByRestaurant(restaurantId) { return (await prisma.review.findMany({ where: { restaurantId }, include: { user: author }, orderBy: { createdAt: "desc" } })).map(normalize); }
async function summary(restaurantId) { const value = await prisma.review.aggregate({ where: { restaurantId }, _avg: { rating: true }, _count: { rating: true } }); return { averageRating: value._avg.rating === null ? 0 : Number(Number(value._avg.rating).toFixed(1)), reviewCount: value._count.rating }; }
async function listMine(userId) { return (await prisma.review.findMany({ where: { userId }, include: { user: author, restaurant: { select: { id: true, name: true } } }, orderBy: { updatedAt: "desc" } })).map(row => ({ ...normalize(row), restaurant: row.restaurant })); }
async function findById(id) { return normalize(await prisma.review.findUnique({ where: { id }, include: { user: author } })); }
async function create(data) { return normalize(await prisma.review.create({ data, include: { user: author } })); }
async function update(id, userId, data) { const result = await prisma.review.updateMany({ where: { id, userId }, data }); return result.count ? findById(id) : null; }
async function remove(id, userId) { return prisma.review.deleteMany({ where: { id, userId } }); }
module.exports = { restaurantExists, listByRestaurant, summary, listMine, findById, create, update, remove };
