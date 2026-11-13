const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("schema e migration definem Restaurant 1:N Dish sem DDL destrutivo", () => {
    const schema = fs.readFileSync(require.resolve("../prisma/schema.prisma"), "utf8");
    const migration = fs.readFileSync(require.resolve("../database/migrations/002-create-dishes.sql"), "utf8");
    assert.match(schema, /dishes\s+Dish\[\]/);
    assert.match(schema, /restaurant\s+Restaurant\s+@relation/);
    assert.match(migration, /FOREIGN KEY \(restaurant_id\) REFERENCES restaurants\(id\)/i);
    assert.doesNotMatch(migration, /^\s*(?:DROP\b|TRUNCATE\b|DELETE\s+FROM\b|ALTER\s+TABLE\s+restaurants\b)/im);
});

test("migration de imageKey é aditiva e preserva image_url", () => {
    const schema = fs.readFileSync(require.resolve("../prisma/schema.prisma"), "utf8");
    const migration = fs.readFileSync(require.resolve("../database/migrations/003-add-dish-image-key.sql"), "utf8");
    assert.match(schema, /imageKey\s+String\?\s+@map\("image_key"\)/);
    assert.match(schema, /imageUrl\s+String\?/);
    assert.match(migration, /ADD COLUMN image_key VARCHAR\(512\) NULL/i);
    assert.doesNotMatch(migration, /^\s*(?:DROP|TRUNCATE|DELETE|UPDATE)\b/im);
});

test("páginas de cardápio e gerenciamento possuem os campos e ações essenciais", () => {
    const restaurant = fs.readFileSync(require.resolve("../public/restaurant.html"), "utf8");
    const form = fs.readFileSync(require.resolve("../public/dish-form.html"), "utf8");
    const dashboard = fs.readFileSync(require.resolve("../public/dashboard.html"), "utf8");
    const admin = fs.readFileSync(require.resolve("../public/admin.html"), "utf8");
    assert.match(restaurant, /Cardápio/);
    for (const id of ["name", "category", "description", "price", "imageFile", "available"]) assert.match(form, new RegExp(`id="${id}"`));
    assert.match(form, /dish-placeholder\.svg/);
    assert.match(dashboard, /Meus pratos/);
    assert.match(admin, /<h2>Pratos<\/h2>/);
});

test("renderização dos pratos usa APIs de texto em vez de HTML injetado", () => {
    for (const file of ["../public/restaurant.js", "../public/dashboard.js"]) {
        const source = fs.readFileSync(require.resolve(file), "utf8");
        assert.match(source, /textContent/);
        assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML/);
    }
});
