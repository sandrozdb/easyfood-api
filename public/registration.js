(async () => {
    const form = document.getElementById("formulario-cadastro");
    const notice = document.createElement("p"); notice.setAttribute("role", "status"); form.before(notice);
    try {
        const user = await EasyAuth.me();
        if (!user) return location.replace("/login.html");
        if (!["restaurante", "admin"].includes(user.role)) { notice.textContent = "Seu perfil não permite cadastrar ou editar restaurantes."; return; }
        window.restaurantManagementUrl = user.role === "admin" ? "/admin.html#restaurants" : "/dashboard.html";
        const idText = new URLSearchParams(location.search).get("id");
        if (idText !== null) {
            const id = Number(idText);
            if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID inválido.");
            const response = await EasyAuth.api("/restaurants/managed");
            const rows = await response.json();
            if (!response.ok) throw new Error(rows.message);
            const row = rows.find(item => item.id === id);
            if (!row) throw new Error("Restaurante indisponível para edição.");
            window.editRestaurantId = id;
            for (const field of ["name","category","description","address","phone","rating"]) document.getElementById(field).value = row[field];
            document.getElementById("category").dispatchEvent(new Event("change", { bubbles: true }));
            document.getElementById("contador").textContent = row.description.length + "/160";
            document.getElementById("botao-cadastrar").textContent = "Salvar alterações";
        }
        form.hidden = false;
    } catch (error) { notice.textContent = error.message; }
})();
