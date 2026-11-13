(async () => {
    const list = document.getElementById("favorites");
    const status = document.getElementById("status");
    function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
    try {
        const user = await EasyAuth.me();
        if (user?.role !== "cliente") { location.href = "/perfil.html"; return; }
        const response = await EasyAuth.api("/favorites/me");
        if (!response.ok) throw new Error("Não foi possível carregar seus favoritos.");
        const favorites = await response.json();
        list.replaceChildren();
        if (!favorites.length) { const empty=element("article"),title=element("h2","Você ainda não salvou nenhum restaurante"),description=element("p","Explore restaurantes e toque no coração para guardar seus favoritos aqui."),link=element("a","Explorar restaurantes"); link.href="/index.html"; link.className="action"; empty.append(title,description,link); list.append(empty); return; }
        for (const restaurant of favorites) {
            const card = element("article", undefined, "favorite-card"), head = element("div", undefined, "favorite-card-head"), icon = element("span", "♥", "favorite-card-icon"), identity = element("div"), title = element("h2"), link = element("a", restaurant.name), category = element("span", restaurant.category, "favorite-category");
            link.href = `/restaurant.html?id=${encodeURIComponent(restaurant.id)}`;
            title.append(link);
            identity.append(title, category); head.append(icon, identity);
            const details = element("div", undefined, "favorite-card-details");
            details.append(element("span", restaurant.reviewCount ? `${Number(restaurant.averageRating).toFixed(1)} ★ · ${restaurant.reviewCount} ${restaurant.reviewCount === 1 ? "avaliação" : "avaliações"}` : "Ainda sem avaliações", "favorite-rating"), element("span", `Salvo em ${new Date(restaurant.favoritedAt).toLocaleDateString("pt-BR")}`, "favorite-date"));
            card.append(head, element("p", restaurant.description || "Sem descrição.", "favorite-description"), details);
            list.append(card);
        }
    } catch (error) { list.replaceChildren(); status.textContent = error.message; }
})();
