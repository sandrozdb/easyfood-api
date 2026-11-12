const { prisma } = require("../../config/database");

function normalizeDish(dish) {
    if (!dish) return null;
    return {
        id: dish.id,
        name: dish.name,
        category: dish.category,
        description: dish.description,
        price: Number(dish.price),
        imageUrl: dish.imageUrl,
        imageKey: dish.imageKey,
        available: dish.available,
        restaurantId: dish.restaurantId,
        createdAt: dish.createdAt,
        updatedAt: dish.updatedAt,
        ...(dish.restaurant ? { restaurant: { id: dish.restaurant.id, name: dish.restaurant.name } } : {})
    };
}

async function findRestaurantById(id) {
    return prisma.restaurant.findUnique({ where: { id }, select: { id: true, owner_id: true, name: true, owner: { select: { id: true, name: true, email: true } } } });
}

async function listByRestaurant(restaurantId) {
    const rows = await prisma.dish.findMany({ where: { restaurantId }, orderBy: [{ category: "asc" }, { name: "asc" }] });
    return rows.map(normalizeDish);
}

async function findRecordById(id) {
    return prisma.dish.findUnique({ where: { id }, include: { restaurant: { select: { id: true, name: true, owner_id: true, owner: { select: { id: true, name: true, email: true } } } } } });
}

async function findById(id) {
    return normalizeDish(await findRecordById(id));
}

async function create(data) {
    return normalizeDish(await prisma.dish.create({ data }));
}

async function update(id, ownerId, data) {
    const result = await prisma.dish.updateMany({
        where: { id, ...(ownerId === undefined ? {} : { restaurant: { owner_id: ownerId } }) },
        data
    });
    return result.count ? findById(id) : null;
}

async function remove(id, ownerId) {
    return prisma.dish.deleteMany({ where: { id, ...(ownerId === undefined ? {} : { restaurant: { owner_id: ownerId } }) } });
}

async function updateImageReference(id, ownerId, data) {
    const result = await prisma.dish.updateMany({
        where: { id, ...(ownerId === undefined ? {} : { restaurant: { owner_id: ownerId } }) },
        data: { imageKey: data.imageKey, imageUrl: data.imageUrl }
    });
    return result.count ? findById(id) : null;
}

async function listManaged(user) {
    const rows = await prisma.dish.findMany({
        where: user.role === "admin" ? {} : { restaurant: { owner_id: user.id } },
        include: { restaurant: { select: { id: true, name: true } } },
        orderBy: [{ restaurantId: "asc" }, { category: "asc" }, { name: "asc" }]
    });
    return rows.map(normalizeDish);
}

module.exports = { normalizeDish, findRestaurantById, listByRestaurant, findRecordById, findById, create, update, remove, updateImageReference, listManaged };
