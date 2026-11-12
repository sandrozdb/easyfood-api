(async () => {
    const params = new URLSearchParams(location.search), dishId = Number(params.get("dishId")), requestedRestaurantId = Number(params.get("restaurantId"));
    const form = document.getElementById("dish-form"), status = document.getElementById("status"), restaurantSelect = document.getElementById("restaurantId");
    const fileInput = document.getElementById("imageFile"), preview = document.getElementById("image-preview"), currentSection = document.getElementById("current-image"), currentPreview = document.getElementById("current-image-preview"), removeImage = document.getElementById("remove-image");
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]), maxBytes = 5 * 1024 * 1024;
    let previewUrl;
    function value(id) { return document.getElementById(id).value; }
    function validateFile(file) {
        if (!allowedTypes.has(file.type)) throw new Error("Escolha uma imagem JPEG, PNG ou WEBP.");
        if (file.size > maxBytes) throw new Error("A imagem deve ter no máximo 5 MB.");
    }
    fileInput.onchange = () => {
        status.textContent = "";
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const file = fileInput.files[0];
        if (!file) { preview.src = "/assets/dish-placeholder.svg"; return; }
        try { validateFile(file); previewUrl = URL.createObjectURL(file); preview.src = previewUrl; }
        catch (error) { fileInput.value = ""; preview.src = "/assets/dish-placeholder.svg"; status.textContent = error.message; }
    };
    try {
        const user = await EasyAuth.me();
        if (!user) return location.replace("/login.html");
        if (!["restaurante", "admin"].includes(user.role)) { form.hidden = true; status.textContent = "Você não tem permissão para gerenciar pratos."; return; }
        const restaurantsResponse = await EasyAuth.api("/restaurants/managed");
        if (!restaurantsResponse.ok) throw new Error("Não foi possível carregar os restaurantes.");
        const restaurants = await restaurantsResponse.json();
        for (const restaurant of restaurants) { const option = document.createElement("option"); option.value = restaurant.id; option.textContent = restaurant.name; restaurantSelect.append(option); }
        if (requestedRestaurantId) restaurantSelect.value = String(requestedRestaurantId);
        if (!restaurants.some(item => item.id === Number(restaurantSelect.value))) throw new Error("Nenhum restaurante disponível para este usuário.");
        if (dishId) {
            document.getElementById("title").textContent = "Editar prato";
            const response = await EasyAuth.api(`/dishes/${dishId}`); if (!response.ok) throw new Error("Prato não encontrado.");
            const dish = await response.json();
            if (!restaurants.some(item => item.id === dish.restaurantId)) throw new Error("Você não administra o restaurante deste prato.");
            restaurantSelect.value = dish.restaurantId; restaurantSelect.disabled = true;
            for (const field of ["name", "category", "description", "price"]) document.getElementById(field).value = dish[field] ?? "";
            document.getElementById("available").checked = dish.available;
            if (dish.imageUrl) { currentPreview.src = dish.imageUrl; currentSection.hidden = false; }
            removeImage.hidden = !dish.hasImage;
            removeImage.onclick = async () => {
                removeImage.disabled = true; status.textContent = "Removendo imagem...";
                try {
                    const result = await EasyAuth.api(`/dishes/${dishId}/image`, { method: "DELETE" });
                    const data = await result.json(); if (!result.ok) throw new Error(data.message || "Não foi possível remover a imagem.");
                    currentSection.hidden = true; removeImage.hidden = true; preview.src = "/assets/dish-placeholder.svg"; status.textContent = "Imagem removida.";
                } catch (error) { status.textContent = error.message; } finally { removeImage.disabled = false; }
            };
        }
        form.onsubmit = async event => {
            event.preventDefault(); status.textContent = "Salvando...";
            try {
                const file = fileInput.files[0]; if (file) validateFile(file);
                const body = { name: value("name"), category: value("category"), description: value("description"), price: value("price"), available: document.getElementById("available").checked };
                const url = dishId ? `/dishes/${dishId}` : `/restaurants/${restaurantSelect.value}/dishes`;
                const response = await EasyAuth.api(url, { method: dishId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                const data = await response.json(); if (!response.ok) throw new Error([data.message, ...(data.errors || [])].join(" "));
                const savedId = data.prato.id;
                if (file) {
                    status.textContent = "Enviando imagem...";
                    const formData = new FormData(); formData.append("image", file);
                    const upload = await EasyAuth.api(`/dishes/${savedId}/image`, { method: "POST", body: formData });
                    const uploadData = await upload.json(); if (!upload.ok) throw new Error(uploadData.message || "Prato salvo, mas a imagem não foi enviada.");
                }
                status.textContent = dishId ? "Prato atualizado." : "Prato cadastrado.";
                setTimeout(() => location.assign(user.role === "admin" ? "/admin.html" : "/dashboard.html"), 500);
            } catch (error) { status.textContent = error.message; }
        };
    } catch (error) { status.textContent = error.message; }
})();
