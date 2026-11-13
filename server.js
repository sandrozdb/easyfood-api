const app = require("./src/app");

const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
    console.log(`EasyFood está no ar na porta ${port}`);
});

// Mantém uma referência explícita ao socket HTTP durante toda a execução.
server.ref();
server.on("error", error => {
    console.error(`Não foi possível iniciar o EasyFood na porta ${port}:`, error.message);
    process.exitCode = 1;
});
