<p align="center">
  <img src="assets/cover.svg" alt="EasyFood — API de restaurantes" width="100%">
</p>

<p align="center">
  <a href="https://github.com/sandrozdb/easyfood-api/actions/workflows/ci.yml"><img src="https://github.com/sandrozdb/easyfood-api/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/Prisma-6.12-2D3748?logo=prisma&logoColor=white" alt="Prisma 6.12">
</p>

# EasyFood — API de Restaurantes

Aplicação acadêmica para **consulta e cadastro de restaurantes**, construída com Node.js, Express, Prisma ORM e MySQL. O projeto evoluiu de uma implementação simples com armazenamento em memória para uma arquitetura modular com persistência real, validação de dados, testes automatizados e decisões arquiteturais documentadas em ADRs.

> **Status:** MVP funcional da camada de restaurantes, com GET/POST, persistência MySQL, testes automatizados e CI. A autenticação com AWS Cognito está documentada como evolução arquitetural e ainda não faz parte da versão executável da `main`.

## Problema

Uma aplicação de restaurantes precisa ir além de uma lista estática: os dados precisam ser validados, persistidos e organizados de forma que novas funcionalidades possam ser adicionadas sem concentrar toda a lógica em um único arquivo.

O EasyFood foi usado para praticar justamente essa evolução: **de um protótipo simples para uma aplicação com separação de responsabilidades e decisões técnicas documentadas**.

## Solução

A arquitetura atual segue um monólito modular:

```text
Front-end
   ↓
Routes
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
Prisma ORM
   ↓
MySQL
```

Cada camada possui uma responsabilidade clara, reduzindo acoplamento e facilitando manutenção, testes e evolução futura.

## Funcionalidades atuais

- listagem de restaurantes com `GET /restaurants`;
- cadastro de restaurantes com `POST /restaurants`;
- validação de campos obrigatórios;
- avaliação opcional entre 0 e 5, com uma casa decimal;
- persistência em MySQL;
- seed idempotente dos dados iniciais;
- interface web para consulta e cadastro;
- testes automatizados das regras de negócio;
- CI com GitHub Actions;
- documentação de decisões arquiteturais com ADRs.

## Tecnologias

| Tecnologia | Uso |
|---|---|
| Node.js | runtime da aplicação |
| Express | servidor HTTP e rotas |
| Prisma ORM | acesso ao banco e abstração de persistência |
| MySQL 8 | armazenamento dos restaurantes |
| HTML, CSS e JavaScript | interface web |
| `node:test` | testes automatizados |
| GitHub Actions | integração contínua |

## Organização do código

```text
src/
├── app.js
├── config/
│   └── database.js
└── modules/
    ├── auth/
    │   └── README.md
    └── restaurants/
        ├── restaurantRoutes.js
        ├── restaurantController.js
        ├── restaurantService.js
        └── restaurantRepository.js
```

O módulo `restaurants` está implementado. O diretório `auth` registra o planejamento de autenticação e não deve ser interpretado como funcionalidade já entregue.

## Rotas disponíveis

### `GET /restaurants`

Retorna os restaurantes persistidos no MySQL, ordenados por ID.

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/restaurants" -Method Get
```

### `POST /restaurants`

Valida e cadastra um novo restaurante. Um cadastro válido retorna HTTP `201`; dados inválidos retornam HTTP `400` com os erros encontrados.

```powershell
$restaurante = @{
    name = "Sabor da Vila"
    category = "Pizza"
    description = "Pizzas artesanais feitas com ingredientes selecionados."
    address = "Rua das Acacias, 150 - Centro"
    phone = "(11) 99999-1234"
    rating = 4.5
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:3000/restaurants" `
    -Method Post `
    -ContentType "application/json" `
    -Body $restaurante
```

## Persistência

Os restaurantes são armazenados em MySQL por meio do Prisma ORM. Diferentemente da versão inicial em memória, os registros continuam disponíveis após reiniciar a aplicação.

O seed oficial é `prisma/seed.js` e evita duplicar os restaurantes iniciais.

## Testes e qualidade

Execute:

```bash
npm test
```

A suíte atual valida:

- valor padrão da avaliação;
- avaliação válida com uma casa decimal;
- rejeição de avaliações fora do intervalo permitido;
- rejeição de payloads sem os campos obrigatórios.

A workflow de **CI** executa os testes automaticamente em pushes e pull requests para `main`.

## Como executar

### Pré-requisitos

- Node.js 20+;
- MySQL 8;
- usuário MySQL com permissão para criar e acessar o banco local.

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar ambiente

Crie `.env` a partir de `.env.example`:

```env
PORT=3000
DATABASE_URL="mysql://usuario:senha@localhost:3306/easyfood"
```

Nunca versione credenciais reais.

### 3. Preparar o banco

Em uma base já existente:

```bash
npm run prisma:pull
npm run prisma:generate
```

Em um ambiente novo, use `database/schema.sql` como referência para criação inicial.

### 4. Executar seed

```bash
npm run db:seed
```

Ou:

```bash
npm run db:setup
```

### 5. Iniciar

```bash
npm start
```

Depois abra `http://localhost:3000`.

## Decisões arquiteturais

O histórico técnico está registrado em ADRs:

- [ADR-001 — Armazenar restaurantes em memória](docs/adr/ADR-001-armazenar-restaurantes-em-memoria.md)
- [ADR-002 — Adotar MySQL para persistência](docs/adr/ADR-002-adotar-mysql-para-persistencia.md)
- [ADR-003 — Adotar Prisma como ORM](docs/adr/ADR-003-adotar-prisma-como-orm.md)
- [ADR-004 — Organizar como monólito modular](docs/adr/ADR-004-organizar-como-monolito-modular.md)
- [ADR-005 — Planejar autenticação com AWS Cognito](docs/adr/ADR-005-planejar-autenticacao-com-aws-cognito.md)

Também estão disponíveis:

- [Pesquisa de alternativas de autenticação](docs/pesquisa-autenticacao.md)
- [Hipótese de evolução da persistência](docs/hipotese-persistencia.md)

## Próximas evoluções

- implementar autenticação e autorização planejadas no ADR-005;
- adicionar rotas de atualização e remoção;
- ampliar cobertura de testes para controller, repository e integração;
- adicionar documentação OpenAPI/Swagger;
- preparar ambiente público de demonstração quando a camada de autenticação estiver definida.

## Estrutura do repositório

```text
easyfood-api/
├── .github/workflows/ci.yml
├── assets/cover.svg
├── database/
├── docs/
│   └── adr/
├── prisma/
├── public/
├── src/
│   ├── config/
│   └── modules/
├── test/
├── .env.example
├── package.json
├── server.js
└── LICENSE
```

## Segurança

- `.env` não é versionado;
- `.env.example` contém somente valores de exemplo;
- consultas de persistência são realizadas via Prisma;
- o repositório público não deve conter credenciais, tokens ou dados sensíveis.

## Licença

Distribuído sob a licença MIT. Consulte [`LICENSE`](LICENSE).

## Autor

**Sandro Ferreira**  
Consultoria · Inteligência Artificial · Dados · Automação

[LinkedIn](https://linkedin.com/in/sandrozdb) · [GitHub](https://github.com/sandrozdb) · [Portfólio](https://sandrozdb.com)
