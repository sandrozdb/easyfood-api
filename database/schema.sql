CREATE DATABASE IF NOT EXISTS easyfood
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE easyfood;

CREATE TABLE IF NOT EXISTS restaurants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    category VARCHAR(30) NOT NULL,
    rating DECIMAL(2,1) NOT NULL DEFAULT 0.0,
    description VARCHAR(160) NOT NULL,
    address VARCHAR(120) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_restaurants_rating
        CHECK (rating >= 0.0 AND rating <= 5.0),
    CONSTRAINT chk_restaurants_category
        CHECK (category IN (
            'Pizza',
            'Burguer',
            'Massa',
            'Saudável',
            'Sushi',
            'Mexicana',
            'Churrasco',
            'Sobremesas'
        )),
    UNIQUE KEY uq_restaurants_identity (name, address, phone)
) ENGINE=InnoDB;
