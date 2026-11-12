(async () => {
    const status = document.getElementById("status");
    const adminPage = location.pathname === "/admin.html";
    function element(tag, text) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; return el; }
    async function request(url, options) {
        const response = await EasyAuth.api(url, options);
        const data = response.status === 204 ? null : await response.json();
        if (!response.ok) throw new Error(data?.message || "Operação recusada.");
        return data;
    }
    function button(parent, text, action) {
        const el = element("button", text); parent.append(el);
        el.onclick = async () => { el.disabled = true; status.textContent = ""; try { await action(); } catch (error) { status.textContent = error.message; } finally { el.disabled = false; } };
    }
    function json(method, body) { return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }; }
    try {
        const user = await EasyAuth.me();
        if (!user) return location.replace("/login.html");
        if (!["restaurante", "admin"].includes(user.role) || adminPage && user.role !== "admin") { status.textContent = "Você não tem acesso a este painel."; return; }
        if (adminPage) document.getElementById("admin-content").hidden = false;
        async function restaurants() {
            const rows = await request("/restaurants/managed");
            const container = document.getElementById("restaurants"); container.replaceChildren();
            if (!adminPage) document.getElementById("create").hidden = user.role === "restaurante" && rows.length > 0;
            if (!rows.length) container.append(element("p", "Nenhum restaurante vinculado."));
            for (const row of rows) {
                const card = element("article"); card.append(element("h3", row.name), element("p", row.address));
                const edit = element("a", "Editar"); edit.href = "/cadastro.html?id=" + row.id; card.append(edit);
                const addDish = element("a", "Adicionar prato"); addDish.href = "/dish-form.html?restaurantId=" + row.id; card.append(addDish);
                if (adminPage) {
                    const label = element("label", "ID do proprietário (vazio remove vínculo): ");
                    const owner = element("input"); owner.type = "number"; owner.min = "1"; owner.value = row.owner_id || ""; label.append(owner); card.append(label);
                    button(card, "Salvar proprietário", async () => {
                        await request("/admin/restaurants/" + row.id + "/owner", json("PUT", { owner_id: owner.value ? Number(owner.value) : null }));
                        status.textContent = "Proprietário atualizado.";
                    });
                    button(card, "Excluir", async () => {
                        if (!confirm("Excluir o restaurante " + row.name + "?")) return;
                        await request("/restaurants/" + row.id, { method: "DELETE" }); await restaurants();
                    });
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
                    const role = element("select"); role.setAttribute("aria-label", "Perfil de " + (item.name || item.id));
                    for (const name of ["cliente", "restaurante", "admin"]) { const option = element("option", name); option.value = name; role.append(option); }
                    role.value = item.role; card.append(role);
                    const label = element("label", "Ativo"); const active = element("input"); active.type = "checkbox"; active.checked = item.active; label.append(active); card.append(label);
                    if (item.id !== user.id) button(card, "Salvar usuário", async () => { await request("/admin/users/" + item.id, json("PATCH", { role: role.value, active: active.checked })); status.textContent = "Usuário atualizado."; });
                    else { role.disabled = true; active.disabled = true; }
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
