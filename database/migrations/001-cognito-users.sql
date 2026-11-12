-- Aplicar uma única vez após backup. MySQL faz commit implícito de DDL.
-- Os restaurantes existentes são preservados e ficam sem proprietário.
CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    cognito_sub VARCHAR(128) NOT NULL,
    email VARCHAR(254) NULL,
    name VARCHAR(120) NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'cliente',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY users_cognito_sub_key (cognito_sub),
    CONSTRAINT chk_users_role CHECK (role IN ('cliente', 'restaurante', 'admin'))
);
ALTER TABLE restaurants
    ADD COLUMN owner_id INT NULL,
    ADD UNIQUE KEY uq_restaurants_owner (owner_id),
    ADD CONSTRAINT restaurants_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
