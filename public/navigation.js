(async () => {
    const register = document.querySelector('a[href="/cadastro.html"]');
    if (register) register.hidden = true;
    const link = document.createElement("a"); link.href = "/login.html"; link.textContent = "Entrar com Google";
    if (register) register.parentNode.insertBefore(link, register);
    try {
        const user = await EasyAuth.me();
        if (user) {
            link.href = "/perfil.html"; link.textContent = "Meu perfil";
            if (register) register.hidden = !["restaurante", "admin"].includes(user.role);
            if (user.role === "cliente" && register) {
                const favorites = document.createElement("a"); favorites.href = "/favorites.html"; favorites.textContent = "Meus favoritos";
                register.parentNode.insertBefore(favorites, register);
            }
        }
    } catch { link.textContent = "Acessar minha conta"; }
})();
