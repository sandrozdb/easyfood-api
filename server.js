const express = require ("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const restaurantes = [
    {
        id: 1,
        name: "Lapititosa",
        category: "Pizza",
        rating: 4.5,
        description: "Pizzas artesanais preparadas com ingredientes selecionados.",
        address: "Rua das Flores, 120 - Centro",
        phone: "(11) 99991-1001"
    },
    {
        id: 2,
        name: "Lanchonete do Zé",
        category: "Burguer",
        rating: 5.0,
        description: "Hambúrgueres artesanais, porções e lanches especiais.",
        address: "Avenida Brasil, 245 - Jardim Central",
        phone: "(11) 99992-2002"
    },
    {
        id: 3,
        name: "La Pasta",
        category: "Massa",
        rating: 3.0,
        description: "Massas frescas e pratos inspirados na culinária italiana.",
        address: "Rua Itália, 88 - Vila Nova",
        phone: "(11) 99993-3003"
    },
    {
        id: 4,
        name: "Vida Leve",
        category: "Saudável",
        rating: 4.8,
        description: "Refeições equilibradas, saladas, sucos e opções vegetarianas.",
        address: "Rua das Palmeiras, 310 - Centro",
        phone: "(11) 99994-4004"
    },
    {
        id: 5,
        name: "Sushi House",
        category: "Sushi",
        rating: 4.7,
        description: "Combinados, temakis e pratos tradicionais da culinária japonesa.",
        address: "Avenida Japão, 550 - Jardim Oriental",
        phone: "(11) 99995-5005"
    },
    {
        id: 6,
        name: "Taco Loco",
        category: "Mexicana",
        rating: 4.3,
        description: "Tacos, burritos e sabores marcantes da culinária mexicana.",
        address: "Rua México, 72 - Vila América",
        phone: "(11) 99996-6006"
    },
    {
        id: 7,
        name: "Churrascaria do Sul",
        category: "Churrasco",
        rating: 4.9,
        description: "Carnes selecionadas, acompanhamentos e buffet completo.",
        address: "Avenida dos Gaúchos, 900 - Parque Sul",
        phone: "(11) 99997-7007"
    },
    {
        id: 8,
        name: "Doce Encanto",
        category: "Sobremesas",
        rating: 4.6,
        description: "Bolos, doces artesanais, cafés e sobremesas especiais.",
        address: "Rua do Açúcar, 45 - Jardim das Delícias",
        phone: "(11) 99998-8008"
    }
];

app.get("/restaurants", (req, res) => {
    res.json(restaurantes);
});
app.post("/restaurants", (req, res) => {
    const name = String(req.body.name || "").trim();
    const category = String(req.body.category || "").trim();
    const description = String(req.body.description || "").trim();
    const address = String(req.body.address || "").trim();
    const phone = String(req.body.phone || "").trim();

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
        id: restaurantes.length + 1,
        name,
        category,
        rating: 0,
        description,
        address,
        phone
    };

    restaurantes.push(novoRestaurante);

    return res.status(201).json({
        message: "Restaurante cadastrado com sucesso!",
        restaurante: novoRestaurante
    });
});

app.listen(3000, () => {
    console.log("Easyfood está no ar na porta 3000");
});
