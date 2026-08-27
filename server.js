const express = require ("express");
const {
    listRestaurants,
    createRestaurant
} = require("./src/repositories/restaurantRepository");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.get("/restaurants", async (req, res) => {
    try {
        const restaurants = await listRestaurants();
        return res.status(200).json(restaurants);
    } catch (error) {
        console.error("Falha interna ao consultar os restaurantes.");
        return res.status(500).json({
            message: "Não foi possível consultar os restaurantes."
        });
    }
});

app.post("/restaurants", async (req, res) => {
    const name = String(req.body.name || "").trim();
    const category = String(req.body.category || "").trim();
    const description = String(req.body.description || "").trim();
    const address = String(req.body.address || "").trim();
    const phone = String(req.body.phone || "").trim();
    const ratingRecebido = req.body.rating;
    let rating = 0;

    const categoriasPermitidas = [
        "Pizza",
        "Burguer",
        "Massa",
        "Saudável",
        "Sushi",
        "Mexicana",
        "Churrasco",
        "Sobremesas"
    ];

    const padraoNome = /^[A-Za-zÀ-ÿ0-9.'’& -]{3,60}$/;
    const padraoTelefone = /^\(\d{2}\) \d{4,5}-\d{4}$/;

    const erros = [];

    const ratingNaoInformado =
        ratingRecebido === undefined ||
        ratingRecebido === null ||
        (
            typeof ratingRecebido === "string" &&
            ratingRecebido.trim() === ""
        );

    if (!ratingNaoInformado) {
        const tipoValido =
            typeof ratingRecebido === "number" ||
            typeof ratingRecebido === "string";

        const textoRating = tipoValido
            ? String(ratingRecebido).trim()
            : "";

        const formatoValido = /^\d(?:\.\d)?$/.test(textoRating);
        const ratingConvertido = Number(textoRating);

        if (
            !tipoValido ||
            !formatoValido ||
            !Number.isFinite(ratingConvertido) ||
            ratingConvertido < 0 ||
            ratingConvertido > 5
        ) {
            erros.push(
                "A avaliação deve ser um número entre 0 e 5, com no máximo uma casa decimal."
            );
        } else {
            rating = ratingConvertido;
        }
    }

    if (!padraoNome.test(name)) {
        erros.push(
            "O nome deve ter entre 3 e 60 caracteres e não pode conter símbolos inválidos."
        );
    }

    if (!categoriasPermitidas.includes(category)) {
        erros.push("Selecione uma categoria válida.");
    }

    if (description.length < 20 || description.length > 160) {
        erros.push("A descrição deve ter entre 20 e 160 caracteres.");
    }

    if (address.length < 10 || address.length > 120) {
        erros.push("O endereço deve ter entre 10 e 120 caracteres.");
    }

    if (!padraoTelefone.test(phone)) {
        erros.push(
            "Informe o telefone no formato (11) 99999-9999."
        );
    }

    if (erros.length > 0) {
        return res.status(400).json({
            message: "Existem dados fora do padrão.",
            errors: erros
        });
    }

    const novoRestaurante = {
        name,
        category,
        rating,
        description,
        address,
        phone
    };

    try {
        const restauranteCriado = await createRestaurant(novoRestaurante);

        return res.status(201).json({
            message: "Restaurante cadastrado com sucesso!",
            restaurante: restauranteCriado
        });
    } catch (error) {
        console.error("Falha interna ao cadastrar o restaurante.");
        return res.status(500).json({
            message: "Não foi possível cadastrar o restaurante."
        });
    }
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
    console.log(`Easyfood está no ar na porta ${port}`);
});
