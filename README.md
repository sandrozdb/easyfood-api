# EasyFood

O EasyFood é um MVP acadêmico para consultar e cadastrar restaurantes. A interface permite pesquisar por nome ou categoria, filtrar a listagem e cadastrar estabelecimentos com validação dos dados.

## Sprint 03

Nesta sprint, a API foi padronizada com as rotas em inglês e evoluiu do armazenamento temporário em memória para persistência em MySQL. O front-end e as validações existentes foram preservados, enquanto GET e POST passaram a utilizar um repository com consultas parametrizadas.

## Tecnologias

- Node.js
- Express
- MySQL 8
- mysql2
- dotenv
- HTML, CSS e JavaScript

## Arquitetura

Arquitetura anterior:

`Front-end → API Node.js/Express → array em memória`

Arquitetura atual:

`Front-end → API Node.js/Express → mysql2 → MySQL`

## Como executar

### Requisitos

- Node.js instalado.
- MySQL 8 instalado e em execução.
- Um usuário local do MySQL com permissão para criar o banco `easyfood` e suas tabelas.

### 1. Instalar as dependências

No PowerShell, acesse a pasta do projeto e execute:

```powershell
npm install
```

### 2. Configurar o ambiente local

Crie o `.env` a partir do exemplo:

```powershell
Copy-Item ".env.example" ".env"
notepad ".env"
```

Preencha as configurações locais:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=coloque_sua_senha_local
DB_NAME=easyfood
PORT=3000
```

Nunca versione o `.env` nem coloque credenciais reais no `.env.example`.

### 3. Criar o banco, a tabela e os dados iniciais

Com o serviço MySQL em execução, use:

```powershell
npm run db:setup
```

Esse comando executa `database/schema.sql` e `database/seed.sql`. O schema é idempotente, e o seed utiliza a identidade formada por nome, endereço e telefone para evitar a duplicação dos oito restaurantes iniciais.

### 4. Iniciar a aplicação

```powershell
npm start
```

Depois, abra [http://localhost:3000](http://localhost:3000) no navegador.

## Rotas disponíveis

### `GET /restaurants`

Retorna todos os restaurantes armazenados no MySQL, ordenados por ID. Uma resposta bem-sucedida usa o status HTTP 200.

Exemplo:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/restaurants" -Method Get
```

### `POST /restaurants`

Valida e cadastra um restaurante no MySQL. Um cadastro válido recebe um ID automático, começa com avaliação 0 e retorna o status HTTP 201. Dados inválidos retornam o status HTTP 400 com os erros encontrados.

Exemplo:

```powershell
$restaurante = @{
    name = "Sabor da Vila"
    category = "Pizza"
    description = "Pizzas artesanais feitas com ingredientes selecionados."
    address = "Rua das Acacias, 150 - Centro"
    phone = "(11) 99999-1234"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:3000/restaurants" `
    -Method Post `
    -ContentType "application/json" `
    -Body $restaurante
```

## Persistência

Os restaurantes são armazenados na tabela `restaurants` do MySQL. Diferentemente da arquitetura anterior com array em memória, os cadastros continuam disponíveis quando o processo Node.js é encerrado e iniciado novamente.

Para testar a persistência manualmente:

1. Inicie a aplicação e cadastre um restaurante válido.
2. Confirme que ele aparece em `GET /restaurants` e no front-end.
3. Encerre o processo Node.js.
4. Execute `npm start` novamente.
5. Repita o GET e confirme que o registro continua disponível.

O projeto disponibiliza somente GET e POST nesta etapa. PUT e DELETE ainda não fazem parte da API.

## Documentação

- [ADR-001 - Armazenar restaurantes em memória](docs/adr/ADR-001-armazenar-restaurantes-em-memoria.md)
- [ADR-002 - Adotar MySQL para persistência](docs/adr/ADR-002-adotar-mysql-para-persistencia.md)
- [Hipótese de evolução da persistência](docs/hipotese-persistencia.md)

> O `.env` contém configurações locais e nunca deve ser versionado. O arquivo `.env.example` deve conter somente valores de exemplo, sem senhas reais.
