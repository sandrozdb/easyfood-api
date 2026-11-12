(async () => {
    const list = document.getElementById("favorites");
    const status = document.getElementById("status");
    function element(tag, text) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; }
    try {
        const user = await EasyAuth.me();
        if (user?.role !== "cliente") { location.href = "/perfil.html"; return; }
        const response = await EasyAuth.api("/favorites/me");
        if (!response.ok) throw new Error("Não foi possível carregar seus favoritos.");
        const favorites = await response.json();
        list.replaceChildren();
        if (!favorites.length) { list.append(element("p", "Você ainda não adicionou restaurantes aos favoritos.")); return; }
        for (const restaurant of favorites) {
            const card = element("article"), title = element("h2"), link = element("a", restaurant.name);
            link.href = `/restaurant.html?id=${encodeURIComponent(restaurant.id)}`;
            title.append(link);
            card.append(title, element("p", restaurant.category), element("p", restaurant.description || "Sem descrição."), element("p", restaurant.reviewCount ? `${Number(restaurant.averageRating).toFixed(1)} ★ (${restaurant.reviewCount})` : "Sem avaliações"), element("p", `Favoritado em ${new Date(restaurant.favoritedAt).toLocaleDateString("pt-BR")}`));
            list.append(card);
        }
    } catch (error) { list.replaceChildren(); status.textContent = error.message; }
})();
