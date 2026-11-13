const path = require("path");
const express = require("express");
const restaurantRoutes = require("./modules/restaurants/restaurantRoutes");
const { restaurantDishRoutes, dishRoutes } = require("./modules/dishes/dishRoutes");
const { restaurantReviewRoutes, reviewRoutes } = require("./modules/reviews/reviewRoutes");
const { restaurantFavoriteRoutes, favoriteRoutes } = require("./modules/favorites/favoriteRoutes");

const app = express();


app.use((req, res, next) => {
    res.set("Referrer-Policy", "no-referrer");
    res.set("X-Content-Type-Options", "nosniff");
    next();
});
app.use(express.json({ limit: "16kb" }));

app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/restaurants", restaurantDishRoutes);
app.use("/restaurants", restaurantReviewRoutes);
app.use("/restaurants", restaurantFavoriteRoutes);
app.use("/restaurants", restaurantRoutes);
app.use("/dishes", dishRoutes);
app.use("/reviews", reviewRoutes);
app.use("/favorites", favoriteRoutes);
app.use("/dashboard", require("./modules/dashboard/dashboardRoutes"));


app.use("/auth", require("./modules/auth/authRoutes"));
app.use("/admin/activity", require("./modules/activity/activityRoutes"));
app.use("/admin", require("./modules/users/userRoutes"));
app.use((error, req, res, next) => {
    if (error.name === "RestaurantValidationError") return res.status(400).json({ message: error.message, errors: error.errors });
    if (error.code === "P2002") return res.status(409).json({ message: "Restaurante ou proprietário já vinculado." });
    if (error.type === "entity.parse.failed") return res.status(400).json({ message: "JSON inválido." });
    if (error.type === "entity.too.large") return res.status(413).json({ message: "Corpo da requisição muito grande." });
    res.status(500).json({ message: "Não foi possível concluir a operação." });
});
module.exports = app;
