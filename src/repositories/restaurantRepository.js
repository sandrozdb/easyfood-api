const { pool } = require("../config/database");

const camposRestaurante = `
    id,
    name,
    category,
    rating,
    description,
    address,
    phone,
    created_at
`;

async function listRestaurants() {
    const [restaurants] = await pool.execute(`
        SELECT ${camposRestaurante}
        FROM restaurants
        ORDER BY id
    `);

    return restaurants;
}

async function findRestaurantById(id) {
    const [restaurants] = await pool.execute(
        `
            SELECT ${camposRestaurante}
            FROM restaurants
            WHERE id = ?
        `,
        [id]
    );

    return restaurants[0] || null;
}

async function createRestaurant(data) {
    const [result] = await pool.execute(
        `
            INSERT INTO restaurants
                (name, category, rating, description, address, phone)
            VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
            data.name,
            data.category,
            data.rating,
            data.description,
            data.address,
            data.phone
        ]
    );

    return findRestaurantById(result.insertId);
}

module.exports = {
    listRestaurants,
    createRestaurant,
    findRestaurantById
};
