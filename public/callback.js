EasyAuth.callback().catch(error => { EasyAuth.clear(); document.getElementById("status").textContent = error.message; });
