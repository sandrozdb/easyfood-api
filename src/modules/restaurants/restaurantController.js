const restaurantService = require("./restaurantService");
const { RestaurantValidationError } = restaurantService;

async function listRestaurants(req, res) {
    try {
        const restaurants = await restaurantService.listRestaurants();
        return res.status(200).json(restaurants);
    } catch (error) {
        console.error("Falha interna ao consultar os restaurantes.");
        return res.status(500).json({
            message: "Não foi possível consultar os restaurantes."
        });
    }
}

async function createRestaurant(req, res) {
    try {
        const restaurant = await restaurantService.createRestaurant(req.body);

        return res.status(201).json({
            message: "Restaurante cadastrado com sucesso!",
            restaurante: restaurant
        });
    } catch (error) {
        if (error instanceof RestaurantValidationError) {
            return res.status(400).json({
                message: "Existem dados fora do padrão.",
                errors: error.errors
            });
        }

        console.error("Falha interna ao cadastrar o restaurante.");
        return res.status(500).json({
            message: "Não foi possível cadastrar o restaurante."
        });
    }
}

module.exports = {
    listRestaurants,
    createRestaurant
};
