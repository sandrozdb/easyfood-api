EasyAuth.callback().catch(error => {
    EasyAuth.clear();
    document.body.classList.add("auth-error");
    document.getElementById("callback-title").textContent = "Não foi possível entrar";
    document.querySelector(".callback-message").textContent = "Confira sua sessão e tente novamente.";
    document.getElementById("status").textContent = error.message;
});
