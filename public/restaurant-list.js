(() => {
    const list = document.getElementById("lista-restaurantes");
    const count = document.getElementById("quantidade");
    const search = document.getElementById("busca");
    const category = document.getElementById("categoria");
    const minRating = document.getElementById("nota-minima");
    const sort = document.getElementById("ordenacao");
    const clear = document.getElementById("limpar-filtros");
    const favorites = new Set();
    let currentUser = null;
    let restaurants = [];
    let visible = 3;
    let debounceTimer;

    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    function iconFor(value) {
        return { Pizza: "🍕", Burguer: "🍔", Massa: "🍝", "Saudável": "🥗", Sushi: "🍣", Mexicana: "🌮", Churrasco: "🥩", Sobremesas: "🍰" }[value] || "🍽️";
    }

    function queryParams() {
        const params = new URLSearchParams();
        if (search.value.trim()) params.set("search", search.value.trim());
        if (category.value) params.set("category", category.value);
        if (minRating.value) params.set("minRating", minRating.value);
        if (sort.value !== "default") params.set("sort", sort.value);
        return params;
    }

    function updateUrl(params) {
        const query = params.toString();
        history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
    }

    function favoriteButton(restaurant) {
        const active = favorites.has(restaurant.id);
        const button = element("button", active ? "♥" : "♡", `favorito${active ? " ativo" : ""}`);
        button.type = "button";
        button.dataset.restaurantId = String(restaurant.id);
        button.setAttribute("aria-label", `${active ? "Remover dos" : "Adicionar aos"} favoritos`);
        button.addEventListener("click", () => toggleFavorite(button, restaurant.id));
        return button;
    }

    function restaurantCard(restaurant) {
        const card = element("article", undefined, "restaurante");
        const icon = element("div", iconFor(restaurant.category), "icone");
        const info = element("div", undefined, "informacoes");
        const heading = element("h3"), link = element("a", restaurant.name, "nome-restaurante");
        link.href = `/restaurant.html?id=${encodeURIComponent(restaurant.id)}`;
        heading.append(link);
        info.append(
            heading,
            element("p", restaurant.category, "categoria-restaurante"),
            element("p", restaurant.description || "Descrição não informada.", "descricao"),
            element("p", `📍 ${restaurant.address || "Endereço não informado"}`, "detalhe"),
            element("p", `📞 ${restaurant.phone || "Telefone não informado"}`, "detalhe")
        );
        const footer = element("div", undefined, "rodape-card");
        footer.append(element("span", restaurant.reviewCount ? `${Number(restaurant.averageRating).toFixed(1)} ★ (${restaurant.reviewCount})` : "Sem avaliações", "nota"));
        info.append(footer);
        card.append(icon, info, favoriteButton(restaurant));
        return card;
    }

    function render() {
        count.textContent = `${restaurants.length} ${restaurants.length === 1 ? "resultado" : "resultados"}`;
        list.replaceChildren();
        if (!restaurants.length) {
            list.append(element("p", "Nenhum restaurante encontrado com esses filtros.", "mensagem"));
            const reset = element("button", "Limpar filtros", "botao-ver-mais");
            reset.type = "button"; reset.addEventListener("click", resetFilters); list.append(reset); return;
        }
        for (const restaurant of restaurants.slice(0, visible)) list.append(restaurantCard(restaurant));
        if (visible < restaurants.length) {
            const more = element("button", `Ver mais restaurantes (${restaurants.length - visible})`, "botao-ver-mais");
            more.type = "button"; more.addEventListener("click", () => { visible += 3; render(); }); list.append(more);
        }
    }

    async function loadRestaurants() {
        const params = queryParams();
        updateUrl(params);
        const response = await fetch(`/restaurants${params.size ? `?${params}` : ""}`);
        if (!response.ok) throw new Error("Não foi possível carregar os restaurantes.");
        restaurants = await response.json();
        visible = 3;
        render();
    }

    async function toggleFavorite(button, restaurantId) {
        if (currentUser?.role !== "cliente") { location.href = "/login.html"; return; }
        const active = favorites.has(restaurantId);
        button.disabled = true;
        try {
            const response = await EasyAuth.api(`/restaurants/${restaurantId}/favorite`, { method: active ? "DELETE" : "POST" });
            if (!response.ok) throw new Error("Favorito não atualizado.");
            if (active) favorites.delete(restaurantId); else favorites.add(restaurantId);
            render();
        } catch (error) { button.disabled = false; console.error(error); }
    }

    function resetFilters() {
        search.value = ""; category.value = ""; minRating.value = ""; sort.value = "default";
        loadRestaurants().catch(showError);
    }

    function showError(error) {
        count.textContent = ""; list.replaceChildren(element("p", error.message, "mensagem"));
    }

    async function initialize() {
        const url = new URLSearchParams(location.search);
        search.value = url.get("search") || "";
        minRating.value = url.get("minRating") || "";
        sort.value = url.get("sort") || "default";
        const allResponse = await fetch("/restaurants");
        if (!allResponse.ok) throw new Error("Não foi possível carregar as categorias.");
        const all = await allResponse.json();
        for (const name of [...new Set(all.map(item => item.category))].sort((a, b) => a.localeCompare(b, "pt-BR"))) {
            const option = element("option", name); option.value = name; category.append(option);
        }
        category.value = url.get("category") || "";
        try {
            currentUser = await EasyAuth.me();
            if (currentUser?.role === "cliente") {
                const response = await EasyAuth.api("/favorites/me");
                if (response.ok) for (const item of await response.json()) favorites.add(item.id);
            }
        } catch { currentUser = null; }
        await loadRestaurants();
    }

    search.addEventListener("input", () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(() => loadRestaurants().catch(showError), 300); });
    for (const select of [category, minRating, sort]) select.addEventListener("change", () => loadRestaurants().catch(showError));
    clear.addEventListener("click", resetFilters);
    initialize().catch(showError);
})();
