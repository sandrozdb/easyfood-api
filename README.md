# EasyFood

O EasyFood é um MVP acadêmico para consultar e cadastrar restaurantes. A interface permite pesquisar por nome ou categoria, filtrar a listagem e cadastrar estabelecimentos com validação dos dados.

## Sprint 03

Nesta sprint, a API foi padronizada com as rotas em inglês e evoluiu do armazenamento temporário em memória para persistência em MySQL. O front-end e as validações existentes foram preservados, enquanto GET e POST passaram a utilizar um repository com consultas parametrizadas.

## Tecnologias

- Node.js
- Express
- MySQL 8
- Prisma ORM
- Prisma Client
- dotenv
- HTML, CSS e JavaScript

## Arquitetura

Arquitetura anterior:

`Front-end → API Node.js/Express → array em memória`

Arquitetura atual:

`Front-end → API Node.js/Express → repository → Prisma ORM → MySQL`

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
PORT=3000
DATABASE_URL="mysql://usuario:senha@localhost:3306/easyfood"
```

Nunca versione o `.env` nem coloque credenciais reais no `.env.example`. Caracteres especiais no usuário ou na senha devem ser codificados para uso em URL.

### 3. Preparar o banco existente

O Prisma foi configurado por introspecção da tabela `restaurants` já existente. Para atualizar o modelo a partir do banco e gerar o Client:

```powershell
npm run prisma:pull
npm run prisma:generate
```

Em um ambiente novo, crie primeiro o banco e a tabela executando `database/schema.sql` pelo MySQL Workbench. Esse arquivo foi preservado como referência histórica e não é executado automaticamente pelo Prisma.

### 4. Executar o seed Prisma

O mecanismo oficial de seed é `prisma/seed.js`:

```powershell
npm run db:seed
```

O seed consulta a chave única formada por nome, endereço e telefone antes de criar cada restaurante inicial. Ele não atualiza restaurantes existentes, não duplica dados e não consome IDs quando os oito registros já existem.

O comando abaixo gera o Client e executa o seed em sequência:

```powershell
npm run db:setup
```

### 5. Iniciar a aplicação

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

Valida e cadastra um restaurante no MySQL. A avaliação inicial é opcional, aceita valores entre 0 e 5 com no máximo uma casa decimal e assume 0 quando não é informada. Um cadastro válido recebe um ID automático e retorna o status HTTP 201. Dados inválidos retornam o status HTTP 400 com os erros encontrados.

Exemplo:

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

Os restaurantes são armazenados na tabela `restaurants` do MySQL. Diferentemente da arquitetura anterior com array em memória, os cadastros continuam disponíveis quando o processo Node.js é encerrado e iniciado novamente.

Para testar a persistência manualmente:

1. Inicie a aplicação e cadastre um restaurante válido.
2. Confirme que ele aparece em `GET /restaurants` e no front-end.
3. Encerre o processo Node.js.
4. Execute `npm start` novamente.
5. Repita o GET e confirme que o registro continua disponível.

O projeto disponibiliza somente GET e POST nesta etapa. PUT e DELETE ainda não fazem parte da API.

## Prisma e SQL direto

O repository utiliza Prisma para `findMany`, `findUnique` e `create`, mantendo o `server.js` independente dos detalhes do banco. Os arquivos em `database/` preservam o schema e o seed SQL anteriores como documentação histórica. SQL direto poderá ser usado futuramente apenas em consultas que realmente exijam recursos específicos, de forma isolada, parametrizada e documentada.

## Interface

As páginas de listagem e cadastro usam a mesma moldura de celular no desktop: 390px de largura, 844px de altura, borda de 8px e cantos de 42px. O conteúdo possui uma única rolagem interna, mantendo a moldura fixa quando novos restaurantes são exibidos. Em telas de até 430px, a interface ocupa toda a largura e a altura disponível do dispositivo, sem borda ou cantos arredondados.

## Documentação

- [ADR-001 - Armazenar restaurantes em memória](docs/adr/ADR-001-armazenar-restaurantes-em-memoria.md)
- [ADR-002 - Adotar MySQL para persistência](docs/adr/ADR-002-adotar-mysql-para-persistencia.md)
- [ADR-003 - Adotar Prisma como ORM](docs/adr/ADR-003-adotar-prisma-como-orm.md)
- [Hipótese de evolução da persistência](docs/hipotese-persistencia.md)

> O `.env` contém configurações locais e nunca deve ser versionado. O arquivo `.env.example` deve conter somente valores de exemplo, sem senhas reais.
