const service = require("./dashboardService");

async function restaurant(req, res, next) {
    try { res.json(await service.restaurantDashboard(req.user.id)); }
    catch (error) { next(error); }
}
async function admin(req, res, next) {
    try { res.json(await service.adminDashboard()); }
    catch (error) { next(error); }
}

module.exports = { restaurant, admin };
