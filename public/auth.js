window.EasyAuth = (() => {
    const key = "easyfood.access";
    async function config() {
        const response = await fetch("/auth/config");
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data;
    }
    function clear() { sessionStorage.removeItem(key); }
    async function api(url, options = {}) {
        const token = sessionStorage.getItem(key);
        const response = await fetch(url, { ...options, headers: { ...options.headers, ...(token ? { Authorization: "Bearer " + token } : {}) } });
        if (response.status === 401) clear();
        return response;
    }
    async function me() {
        const response = await api("/auth/me");
        const data = await response.json();
        if (response.status === 401) return null;
        if (!response.ok) throw new Error(data.message);
        return data;
    }
    function base64url(bytes) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
    async function login() {
        const c = await config();
        const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
        const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
        const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
        clear();
        sessionStorage.setItem("easyfood.oauth", JSON.stringify({ verifier, state, created: Date.now() }));
        const url = new URL(c.domain + "/oauth2/authorize");
        url.search = new URLSearchParams({ response_type: "code", client_id: c.clientId, redirect_uri: c.redirectUri,
            scope: c.scope, identity_provider: "Google", state, code_challenge: challenge, code_challenge_method: "S256" });
        location.assign(url);
    }
    async function callback() {
        const params = new URLSearchParams(location.search);
        history.replaceState({}, "", location.pathname);
        const raw = sessionStorage.getItem("easyfood.oauth");
        sessionStorage.removeItem("easyfood.oauth");
        let pending;
        try { pending = JSON.parse(raw || "null"); } catch { pending = null; }
        if (!pending || !/^[A-Za-z0-9_-]{43}$/.test(pending.state || "") ||
            !/^[A-Za-z0-9_-]{43}$/.test(pending.verifier || "") ||
            !Number.isFinite(pending.created) || pending.created > Date.now() ||
            Date.now() - pending.created > 600000 ||
            params.getAll("state").length !== 1 || params.get("state") !== pending.state ||
            params.getAll("code").length !== 1 || !params.get("code") || params.has("error")) {
            throw new Error("Login cancelado ou sessão de login inválida. Tente novamente.");
        }
        const c = await config();
        const response = await fetch(c.domain + "/oauth2/token", { method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ grant_type: "authorization_code", client_id: c.clientId,
                code: params.get("code"), redirect_uri: c.redirectUri, code_verifier: pending.verifier }) });
        const tokens = await response.json();
        if (!response.ok || typeof tokens.access_token !== "string") throw new Error("Não foi possível concluir o login.");
        sessionStorage.setItem(key, tokens.access_token);
        // ID token e refresh token não são persistidos. A API verifica o access token.
        const user = await me();
        if (!user) throw new Error("Token não aceito pela API.");
        location.replace("/perfil.html");
    }
    async function logout() {
        clear();
        sessionStorage.removeItem("easyfood.oauth");
        const c = await config();
        const url = new URL(c.domain + "/logout");
        url.search = new URLSearchParams({ client_id: c.clientId, logout_uri: c.logoutUri });
        location.assign(url);
    }
    return { api, me, login, callback, logout, clear };
})();

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", async () => {
    const publicAuthPage = ["/login.html", "/callback.html"].includes(location.pathname);
    let user = null;
    if (!publicAuthPage) {
        try { user = await EasyAuth.me(); } catch {}
    }
    const items = [{ href: "/index.html", label: "Início" }];
    if (user?.role === "cliente") items.push({ href: "/favorites.html", label: "Meus favoritos" });
    if (user?.role === "restaurante") {
        items.push({ href: "/dashboard.html", label: "Dashboard" });
    }
    if (user?.role === "admin") {
        items.push({ href: "/admin.html", label: "Administração" });
    }
    items.push({ href: user ? "/perfil.html" : "/login.html", label: user ? "Meu perfil" : "Entrar com Google" });
    if (user) items.push({ action: "logout", label: "Sair" });

    const nav = document.createElement("nav");
    nav.className = "app-menu";
    nav.id = "app-menu";
    nav.setAttribute("aria-label", "Navegação principal");
    for (const item of items) {
        if (item.action === "logout") {
            const logout = document.createElement("button");
            logout.type = "button";
            logout.className = "app-menu-action";
            logout.textContent = item.label;
            logout.addEventListener("click", () => EasyAuth.logout());
            nav.append(logout);
            continue;
        }
        const link = document.createElement("a");
        link.href = item.href;
        if (location.pathname === item.href || location.pathname === "/" && item.href === "/index.html") link.className = "active";
        link.textContent = item.label;
        nav.append(link);
    }

    let button = document.querySelector(".menu");
    if (!button) {
        const bar = document.createElement("div");
        bar.className = "app-topbar";
        const logo = document.createElement("a");
        logo.href = "/index.html";
        logo.className = "app-logo";
        logo.append("Easy");
        const logoAccent = document.createElement("span");
        logoAccent.textContent = "Food";
        logo.append(logoAccent);
        button = document.createElement("button");
        button.className = "menu";
        bar.append(logo, button);
        document.querySelector(".account")?.prepend(bar);
    }
    button.type = "button";
    button.classList.add("app-menu-button");
    button.textContent = "☰";
    button.setAttribute("aria-label", "Abrir menu de navegação");
    button.setAttribute("aria-controls", nav.id);
    button.setAttribute("aria-expanded", "false");
    button.insertAdjacentElement("afterend", nav);

    const closeMenu = () => {
        nav.classList.remove("open");
        button.setAttribute("aria-expanded", "false");
    };
    button.addEventListener("click", (event) => {
        event.stopPropagation();
        const open = nav.classList.toggle("open");
        button.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (event) => {
        if (!nav.contains(event.target)) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
    });
});
