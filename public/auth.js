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
        if (response.status === 401) return null;
        const data = await response.json();
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
