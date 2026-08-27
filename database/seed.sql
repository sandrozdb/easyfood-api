USE easyfood;

-- A chave única formada por nome, endereço e telefone permite usar
-- INSERT IGNORE para que novas execuções não dupliquem os registros iniciais.
INSERT IGNORE INTO restaurants
    (name, category, rating, description, address, phone)
VALUES
    (
        'Lapititosa',
        'Pizza',
        4.5,
        'Pizzas artesanais preparadas com ingredientes selecionados.',
        'Rua das Flores, 120 - Centro',
        '(11) 99991-1001'
    ),
    (
        'Lanchonete do Zé',
        'Burguer',
        5.0,
        'Hambúrgueres artesanais, porções e lanches especiais.',
        'Avenida Brasil, 245 - Jardim Central',
        '(11) 99992-2002'
    ),
    (
        'La Pasta',
        'Massa',
        3.0,
        'Massas frescas e pratos inspirados na culinária italiana.',
        'Rua Itália, 88 - Vila Nova',
        '(11) 99993-3003'
    ),
    (
        'Vida Leve',
        'Saudável',
        4.8,
        'Refeições equilibradas, saladas, sucos e opções vegetarianas.',
        'Rua das Palmeiras, 310 - Centro',
        '(11) 99994-4004'
    ),
    (
        'Sushi House',
        'Sushi',
        4.7,
        'Combinados, temakis e pratos tradicionais da culinária japonesa.',
        'Avenida Japão, 550 - Jardim Oriental',
        '(11) 99995-5005'
    ),
    (
        'Taco Loco',
        'Mexicana',
        4.3,
        'Tacos, burritos e sabores marcantes da culinária mexicana.',
        'Rua México, 72 - Vila América',
        '(11) 99996-6006'
    ),
    (
        'Churrascaria do Sul',
        'Churrasco',
        4.9,
        'Carnes selecionadas, acompanhamentos e buffet completo.',
        'Avenida dos Gaúchos, 900 - Parque Sul',
        '(11) 99997-7007'
    ),
    (
        'Doce Encanto',
        'Sobremesas',
        4.6,
        'Bolos, doces artesanais, cafés e sobremesas especiais.',
        'Rua do Açúcar, 45 - Jardim das Delícias',
        '(11) 99998-8008'
    );
