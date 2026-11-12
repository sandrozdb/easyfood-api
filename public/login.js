document.getElementById("login").onclick = () => EasyAuth.login().catch(error => { document.getElementById("status").textContent = error.message; });
