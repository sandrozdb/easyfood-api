-- Migration aditiva: cria somente a tabela de pratos.
-- Não altera nem remove registros das tabelas restaurants ou users.
CREATE TABLE dishes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(60) NOT NULL,
    description VARCHAR(500) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(2048) NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    restaurant_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_dishes_restaurant_id (restaurant_id),
    CONSTRAINT dishes_restaurant_id_fkey
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_dishes_price CHECK (price >= 0)
);
