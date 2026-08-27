# EasyFood

O EasyFood é um MVP acadêmico para consultar e cadastrar restaurantes. A interface permite pesquisar por nome ou categoria, filtrar a listagem e cadastrar estabelecimentos com validação dos dados.

## Sprint 03

Nesta sprint, a API foi padronizada com as rotas em inglês, o fluxo de consulta e cadastro foi validado com armazenamento temporário em memória e a decisão arquitetural atual foi documentada. Também foi registrada uma hipótese de evolução futura para MySQL, sem implementar banco de dados nesta etapa.

## Tecnologias

- Node.js
- Express
- HTML, CSS e JavaScript

## Como executar

Pré-requisito: Node.js instalado.

No PowerShell, acesse a pasta do projeto e execute:

```powershell
npm install
npm start
```

Depois, abra [http://localhost:3000](http://localhost:3000) no navegador.

## Rotas disponíveis

### `GET /restaurants`

Retorna todos os restaurantes armazenados no array em memória.

Exemplo:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/restaurants" -Method Get
```

### `POST /restaurants`

Valida e cadastra um restaurante. Um cadastro válido recebe um ID automático, começa com avaliação 0 e retorna o status HTTP 201. Dados inválidos retornam o status HTTP 400 com os erros encontrados.

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

## Armazenamento em memória

Os restaurantes ficam temporariamente em um array dentro do processo Node.js. Isso facilita a validação inicial do MVP, mas não oferece persistência: todo restaurante cadastrado durante a execução desaparece quando o servidor é encerrado ou reiniciado. Os oito restaurantes definidos originalmente no código voltam a aparecer na próxima inicialização.

## Documentação

- [ADR-001 - Armazenar restaurantes em memória](docs/adr/ADR-001-armazenar-restaurantes-em-memoria.md)
- [Hipótese de evolução da persistência](docs/hipotese-persistencia.md)

> MySQL é apenas uma hipótese de evolução. Nenhum banco de dados foi implementado nesta sprint.
