USE easyfood;

-- A seleção retorna somente restaurantes que ainda não existem. Se todos os
-- oito já estiverem cadastrados, nenhuma linha chega ao INSERT e o contador
-- AUTO_INCREMENT não é consumido desnecessariamente.
INSERT INTO restaurants
    (name, category, rating, description, address, phone)
SELECT
    seed.name,
    seed.category,
    seed.rating,
    seed.description,
    seed.address,
    seed.phone
FROM (
    SELECT
        'Lapititosa' AS name,
        'Pizza' AS category,
        4.5 AS rating,
        'Pizzas artesanais preparadas com ingredientes selecionados.' AS description,
        'Rua das Flores, 120 - Centro' AS address,
        '(11) 99991-1001' AS phone
    UNION ALL
    SELECT
        'Lanchonete do Zé',
        'Burguer',
        5.0,
        'Hambúrgueres artesanais, porções e lanches especiais.',
        'Avenida Brasil, 245 - Jardim Central',
        '(11) 99992-2002'
    UNION ALL
    SELECT
        'La Pasta',
        'Massa',
        3.0,
        'Massas frescas e pratos inspirados na culinária italiana.',
        'Rua Itália, 88 - Vila Nova',
        '(11) 99993-3003'
    UNION ALL
    SELECT
        'Vida Leve',
        'Saudável',
        4.8,
        'Refeições equilibradas, saladas, sucos e opções vegetarianas.',
        'Rua das Palmeiras, 310 - Centro',
        '(11) 99994-4004'
    UNION ALL
    SELECT
        'Sushi House',
        'Sushi',
        4.7,
        'Combinados, temakis e pratos tradicionais da culinária japonesa.',
        'Avenida Japão, 550 - Jardim Oriental',
        '(11) 99995-5005'
    UNION ALL
    SELECT
        'Taco Loco',
        'Mexicana',
        4.3,
        'Tacos, burritos e sabores marcantes da culinária mexicana.',
        'Rua México, 72 - Vila América',
        '(11) 99996-6006'
    UNION ALL
    SELECT
        'Churrascaria do Sul',
        'Churrasco',
        4.9,
        'Carnes selecionadas, acompanhamentos e buffet completo.',
        'Avenida dos Gaúchos, 900 - Parque Sul',
        '(11) 99997-7007'
    UNION ALL
    SELECT
        'Doce Encanto',
        'Sobremesas',
        4.6,
        'Bolos, doces artesanais, cafés e sobremesas especiais.',
        'Rua do Açúcar, 45 - Jardim das Delícias',
        '(11) 99998-8008'
) AS seed
WHERE NOT EXISTS (
    SELECT 1
    FROM restaurants AS existing
    WHERE existing.name = seed.name
      AND existing.address = seed.address
      AND existing.phone = seed.phone
);
