const path = require("path");
const express = require("express");
const restaurantRoutes = require("./modules/restaurants/restaurantRoutes");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/restaurants", restaurantRoutes);

module.exports = app;
