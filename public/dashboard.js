(async () => {
    const status = document.getElementById("status");
    const adminPage = location.pathname === "/admin.html";
    function setupAdminTabs() {
        if (!adminPage || typeof document.querySelectorAll !== "function") return;
        const tabs = [...document.querySelectorAll("[data-admin-tab]")];
        const panels = [...document.querySelectorAll("[data-admin-panel]")];
        for (const tab of tabs) {
            tab.addEventListener("click", () => {
                const selected = tab.dataset.adminTab;
                for (const item of tabs) {
                    const active = item === tab;
                    item.classList.toggle("is-active", active);
                    item.setAttribute("aria-selected", String(active));
                }
                for (const panel of panels) {
                    const active = panel.dataset.adminPanel === selected;
                    panel.classList.toggle("is-active", active);
                    panel.hidden = !active;
                }
            });
        }
        const requestedTab = location.hash?.slice(1);
        tabs.find(tab => tab.dataset.adminTab === requestedTab)?.click();
    }
    setupAdminTabs();
    function element(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
    async function request(url, options) {
        const response = await EasyAuth.api(url, options);
        const data = response.status === 204 ? null : await response.json();
        if (!response.ok) throw new Error(data?.message || "Operação recusada.");
        return data;
    }
    function button(parent, text, action) {
        const el = element("button", text); parent.append(el);
        el.onclick = async () => { el.disabled = true; status.textContent = ""; try { await action(); } catch (error) { status.textContent = error.message; } finally { el.disabled = false; } };
        return el;
    }
    function json(method, body) { return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }; }
    try {
        const user = await EasyAuth.me();
        if (!user) return location.replace("/login.html");
        if (!["restaurante", "admin"].includes(user.role) || adminPage && user.role !== "admin") { status.textContent = "Você não tem acesso a este painel."; return; }
        if (adminPage) document.getElementById("admin-content").hidden = false;
        function metric(parent, label, value) {
            const card = element("article"); card.append(element("span", label), element("strong", String(value))); parent.append(card);
        }
        async function analytics() {
            const loading = document.getElementById("analytics-loading"), metrics = document.getElementById("analytics-metrics"), analyticsStatus = document.getElementById("analytics-status");
            try {
                const data = await request(adminPage ? "/dashboard/admin" : "/dashboard/restaurant");
                loading.hidden = true; metrics.replaceChildren();
                if (!adminPage && !data.hasRestaurant) {
                    document.body.classList.add("dashboard-without-restaurant");
                    analyticsStatus.textContent = "Você ainda não possui um restaurante cadastrado. Crie seu espaço e comece a montar o cardápio.";
                    return;
                }
                if (!adminPage) document.body.classList.remove("dashboard-without-restaurant");
                if (adminPage) {
                    for (const [label, value] of [["Usuários",data.users.total],["Restaurantes",data.restaurants.total],["Pratos",data.dishes.total],["Avaliações",data.reviews.total],["Média das avaliações",Number(data.reviews.averageRating).toFixed(1)],["Atividades 24h",data.activities.last24h]]) metric(metrics,label,value);
                    const pending = [];
                    if (data.users.inactive > 0) pending.push(`${data.users.inactive} ${data.users.inactive === 1 ? "usuário inativo" : "usuários inativos"}`);
                    if (data.restaurants.withoutOwner > 0) pending.push(`${data.restaurants.withoutOwner} ${data.restaurants.withoutOwner === 1 ? "restaurante sem proprietário" : "restaurantes sem proprietário"}`);
                    analyticsStatus.textContent = pending.length ? `Pendências: ${pending.join(" e ")}.` : "";
                    return;
                }
                for (const [label, value] of [["Pratos",data.metrics.totalDishes],["Disponíveis",data.metrics.availableDishes],["Indisponíveis",data.metrics.unavailableDishes],["Avaliação média",Number(data.metrics.averageRating).toFixed(1)],["Avaliações",data.metrics.reviewCount],["Favoritos",data.metrics.favoriteCount]]) metric(metrics,label,value);
                const distribution = document.getElementById("rating-distribution"); distribution.replaceChildren();
                const maximum = Math.max(1, ...Object.values(data.ratingDistribution));
                for (let rating = 5; rating >= 1; rating--) { const value=data.ratingDistribution[rating],row=element("div",undefined,"rating-row"),label=element("span",`${rating} ★`),track=element("span",undefined,"rating-track"),fill=element("span",undefined,"rating-fill"); fill.style.width=`${value/maximum*100}%`; track.append(fill); row.append(label,track,element("strong",String(value))); distribution.append(row); }
                const reviews = document.getElementById("recent-reviews"); reviews.replaceChildren();
                if (!data.recentReviews.length) reviews.append(element("p", "Seu restaurante ainda não recebeu avaliações."));
                for (const review of data.recentReviews) { const card=element("article"); card.append(element("h3", `${review.rating} estrelas`),element("p",review.comment||"Sem comentário."),element("p",review.authorName||"Cliente"),element("p",new Date(review.createdAt).toLocaleDateString("pt-BR"))); reviews.append(card); }
            } catch (error) { loading.hidden = true; analyticsStatus.textContent = "Não foi possível carregar os indicadores."; }
        }
        await analytics();
        async function restaurants() {
            const rows = await request("/restaurants/managed");
            const container = document.getElementById("restaurants"); container.replaceChildren();
            if (!adminPage) document.getElementById("create").hidden = user.role === "restaurante" && rows.length > 0;
            if (!rows.length) container.append(element("p", "Nenhum restaurante vinculado."));
            for (const row of rows) {
                const card = element("article", undefined, adminPage ? "admin-restaurant-card" : "");
                card.append(element("h3", row.name), element("p", row.category || "Sem categoria", "admin-restaurant-category"));
                const edit = element("a", "Editar", "admin-card-link"); edit.href = "/cadastro.html?id=" + row.id; card.append(edit);
                const addDish = element("a", "Adicionar prato", "admin-card-link"); addDish.href = "/dish-form.html?restaurantId=" + row.id; card.append(addDish);
                if (adminPage) {
                    const label = element("label", "Proprietário", "admin-owner-field");
                    const owner = element("input"); owner.type = "number"; owner.min = "1"; owner.value = row.owner_id || ""; label.append(owner); card.append(label);
                    const saveOwner = button(card, "Salvar proprietário", async () => {
                        await request("/admin/restaurants/" + row.id + "/owner", json("PUT", { owner_id: owner.value ? Number(owner.value) : null }));
                        status.textContent = "Proprietário atualizado.";
                    });
                    saveOwner.className = "admin-owner-save";
                    const removeRestaurant = button(card, "Excluir", async () => {
                        if (!confirm("Excluir o restaurante " + row.name + "?")) return;
                        await request("/restaurants/" + row.id, { method: "DELETE" }); await restaurants();
                    });
                    removeRestaurant.className = "admin-restaurant-delete";
                }
                container.append(card);
            }
        }
        await restaurants();
        async function dishes() {
            const rows = await request("/dishes/managed");
            const container = document.getElementById("dishes"); container.replaceChildren();
            if (!rows.length) { container.append(element("p", "Nenhum prato cadastrado.")); return; }
            for (const row of rows) {
                const card = element("article");
                if (row.imageUrl) { const image = element("img"); image.src = row.imageUrl; image.alt = "Foto de " + row.name; image.loading = "lazy"; image.onerror = () => image.remove(); card.append(image); }
                else { const image = element("img"); image.src = "/assets/dish-placeholder.svg"; image.alt = "Prato sem imagem"; card.append(image); }
                card.append(element("h3", row.name || "Prato"), element("p", (row.category || "Sem categoria") + " · " + Number(row.price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })), element("p", row.available ? "🟢 Disponível" : "🔴 Indisponível"));
                if (adminPage && row.restaurant) card.append(element("p", "Restaurante: " + row.restaurant.name));
                const edit = element("a", "Editar"); edit.href = "/dish-form.html?dishId=" + row.id; card.append(edit);
                const imageAction = element("a", "Alterar foto"); imageAction.href = "/dish-form.html?dishId=" + row.id; card.append(imageAction);
                button(card, row.available ? "Marcar indisponível" : "Marcar disponível", async () => { await request("/dishes/" + row.id, json("PATCH", { available: !row.available })); await dishes(); });
                button(card, "Excluir", async () => { if (!confirm("Excluir o prato " + row.name + "?")) return; await request("/dishes/" + row.id, { method: "DELETE" }); await dishes(); });
                container.append(card);
            }
        }
        await dishes();
        if (adminPage) {
            let offset = 0;
            async function users() {
                const rows = await request("/admin/users?offset=" + offset); offset += rows.length;
                document.getElementById("more").hidden = rows.length < 100;
                for (const item of rows) {
                    const card = element("article"); card.append(element("h3", "#" + item.id + " — " + (item.name || item.email || "Usuário")));
                    const roleLabel = element("p", "Permissão", "admin-user-role-label");
                    const role = element("strong", item.role, "admin-user-role");
                    const roleHint = element("p", "Gerenciada pelos grupos do AWS Cognito.", "admin-user-role-hint");
                    card.append(roleLabel, role, roleHint);
                    const label = element("label", "Ativo"); const active = element("input"); active.type = "checkbox"; active.checked = item.active; label.append(active); card.append(label);
                    if (item.id !== user.id) button(card, "Salvar acesso", async () => { await request("/admin/users/" + item.id, json("PATCH", { active: active.checked })); status.textContent = "Acesso do usuário atualizado."; });
                    else active.disabled = true;
                    document.getElementById("users").append(card);
                }
            }
            document.getElementById("more").onclick = () => users().catch(error => { status.textContent = error.message; });
            await users();
            let activityPage = 1;
            async function activities() {
                const data = await request("/admin/activity?page=" + activityPage + "&limit=20");
                const items = Array.isArray(data?.items) ? data.items : [];
                for (const item of items) {
                    const card = element("article");
                    card.append(
                        element("h3", item.action),
                        element("p", new Date(item.createdAt).toLocaleString("pt-BR")),
                        element("p", "Usuário: " + (item.user?.name || (item.userId ? "#" + item.userId : "removido/sistema"))),
                        element("p", "Entidade: " + item.entityType + (item.entityId ? " #" + item.entityId : ""))
                    );
                    if (item.metadata) {
                        const details = element("details"), summary = element("summary", "Ver detalhes");
                        details.append(summary, element("pre", JSON.stringify(item.metadata, null, 2))); card.append(details);
                    }
                    document.getElementById("activity").append(card);
                }
                document.getElementById("activity-more").hidden = activityPage >= (data?.pages || 0);
                activityPage += 1;
            }
            document.getElementById("activity-more").onclick = () => activities().catch(error => { status.textContent = error.message; });
            await activities();
        }
    } catch (error) { status.textContent = error.message; }
})();
