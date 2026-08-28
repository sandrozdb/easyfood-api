const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const restaurantesIniciais = [
    {
        name: "Lapititosa",
        category: "Pizza",
        rating: 4.5,
        description: "Pizzas artesanais preparadas com ingredientes selecionados.",
        address: "Rua das Flores, 120 - Centro",
        phone: "(11) 99991-1001"
    },
    {
        name: "Lanchonete do Zé",
        category: "Burguer",
        rating: 5.0,
        description: "Hambúrgueres artesanais, porções e lanches especiais.",
        address: "Avenida Brasil, 245 - Jardim Central",
        phone: "(11) 99992-2002"
    },
    {
        name: "La Pasta",
        category: "Massa",
        rating: 3.0,
        description: "Massas frescas e pratos inspirados na culinária italiana.",
        address: "Rua Itália, 88 - Vila Nova",
        phone: "(11) 99993-3003"
    },
    {
        name: "Vida Leve",
        category: "Saudável",
        rating: 4.8,
        description: "Refeições equilibradas, saladas, sucos e opções vegetarianas.",
        address: "Rua das Palmeiras, 310 - Centro",
        phone: "(11) 99994-4004"
    },
    {
        name: "Sushi House",
        category: "Sushi",
        rating: 4.7,
        description: "Combinados, temakis e pratos tradicionais da culinária japonesa.",
        address: "Avenida Japão, 550 - Jardim Oriental",
        phone: "(11) 99995-5005"
    },
    {
        name: "Taco Loco",
        category: "Mexicana",
        rating: 4.3,
        description: "Tacos, burritos e sabores marcantes da culinária mexicana.",
        address: "Rua México, 72 - Vila América",
        phone: "(11) 99996-6006"
    },
    {
        name: "Churrascaria do Sul",
        category: "Churrasco",
        rating: 4.9,
        description: "Carnes selecionadas, acompanhamentos e buffet completo.",
        address: "Avenida dos Gaúchos, 900 - Parque Sul",
        phone: "(11) 99997-7007"
    },
    {
        name: "Doce Encanto",
        category: "Sobremesas",
        rating: 4.6,
        description: "Bolos, doces artesanais, cafés e sobremesas especiais.",
        address: "Rua do Açúcar, 45 - Jardim das Delícias",
        phone: "(11) 99998-8008"
    }
];

async function seed() {
    let criados = 0;

    for (const restaurante of restaurantesIniciais) {
        const existente = await prisma.restaurant.findUnique({
            where: {
                name_address_phone: {
                    name: restaurante.name,
                    address: restaurante.address,
                    phone: restaurante.phone
                }
            },
            select: {
                id: true
            }
        });

        if (!existente) {
            await prisma.restaurant.create({
                data: restaurante
            });

            criados += 1;
        }
    }

    console.log(`Seed Prisma concluído. Registros criados: ${criados}.`);
}

seed()
    .catch(() => {
        console.error("Não foi possível executar o seed Prisma.");
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
