-- Migration aditiva para armazenar somente a chave do objeto no S3.
-- image_url é preservado para compatibilidade com registros anteriores.
ALTER TABLE dishes
    ADD COLUMN image_key VARCHAR(512) NULL AFTER image_url;
