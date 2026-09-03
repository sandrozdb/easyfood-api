const test = require("node:test");
const assert = require("node:assert/strict");

const {
    RestaurantValidationError,
    prepareRestaurantData,
} = require("../src/modules/restaurants/restaurantService");

const validRestaurant = {
    name: "Restaurante Teste",
    category: "Pizza",
    description: "Descrição válida para o restaurante de teste.",
    address: "Rua de Teste, 123 - Centro",
    phone: "(11) 99999-9999",
};

test("define rating 0 quando a avaliação não é informada", () => {
    const restaurant = prepareRestaurantData(validRestaurant);
    assert.equal(restaurant.rating, 0);
});

test("aceita uma avaliação válida com uma casa decimal", () => {
    const restaurant = prepareRestaurantData({ ...validRestaurant, rating: 4.5 });
    assert.equal(restaurant.rating, 4.5);
});

test("rejeita uma avaliação fora do intervalo permitido", () => {
    assert.throws(
        () => prepareRestaurantData({ ...validRestaurant, rating: 5.1 }),
        RestaurantValidationError,
    );
});

test("rejeita os campos obrigatórios ausentes", () => {
    assert.throws(
        () => prepareRestaurantData({}),
        (error) => {
            assert.ok(error instanceof RestaurantValidationError);
            assert.equal(error.errors.length, 5);
            return true;
        },
    );
});
