const express = require("express");
const {
    listRestaurants,
    createRestaurant
} = require("./restaurantController");

const router = express.Router();

router.get("/", listRestaurants);
router.post("/", createRestaurant);

module.exports = router;
