(async () => {
    const restaurantId = Number(new URLSearchParams(location.search).get("id"));
    if (!Number.isSafeInteger(restaurantId) || restaurantId < 1) return;
    let user;
    try { user = await EasyAuth.me(); } catch { return; }
    if (user?.role !== "cliente") return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "favorite-action";
    document.getElementById("restaurant").append(button);
    let isFavorite = false;

    function render() {
        button.textContent = isFavorite ? "♥ Remover dos favoritos" : "♡ Adicionar aos favoritos";
        button.setAttribute("aria-pressed", String(isFavorite));
    }

    try {
        const response = await EasyAuth.api(`/restaurants/${restaurantId}/favorite`);
        if (!response.ok) return button.remove();
        isFavorite = (await response.json()).isFavorite;
        render();
    } catch { return button.remove(); }

    button.addEventListener("click", async () => {
        button.disabled = true;
        const response = await EasyAuth.api(`/restaurants/${restaurantId}/favorite`, { method: isFavorite ? "DELETE" : "POST" });
        if (response.ok) { isFavorite = !isFavorite; render(); }
        button.disabled = false;
    });
})();
