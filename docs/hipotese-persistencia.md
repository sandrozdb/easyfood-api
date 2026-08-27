# Hipótese de evolução da persistência

Este documento registra uma hipótese para a evolução do EasyFood. O MySQL foi escolhido apenas como hipótese nesta etapa: nenhum banco de dados, conexão ou dependência de persistência foi implementado.

## 1. Qual banco escolheríamos?

MySQL.

## 2. Por que MySQL?

O MySQL atende aos dados estruturados do EasyFood e oferece persistência, integridade, transações e relacionamentos entre restaurantes, categorias, cardápios, usuários, pedidos e avaliações. Também possui boa integração com Node.js.

Além dos aspectos técnicos, o MySQL já está instalado no ambiente e a equipe possui familiaridade prévia com essa tecnologia. Reutilizá-lo reduz o prazo, o risco e o custo de adoção. PostgreSQL também atenderia ao projeto, mas atualmente não oferece uma vantagem que justifique adicionar uma nova tecnologia ao ambiente.

## 3. O que mudaria no `server.js`?

O array em memória seria substituído por consultas ao banco. O servidor precisaria configurar uma conexão, executar operações assíncronas e tratar falhas de conexão e de consulta sem interromper a aplicação.

## 4. Onde o restaurante seria salvo?

Em uma tabela chamada `restaurants` no MySQL.

## 5. Como `GET /restaurants` buscaria os dados?

Por meio de uma consulta compatível com MySQL, como `SELECT * FROM restaurants;`, retornando os registros encontrados.

## 6. Como `POST /restaurants` salvaria os dados?

Por meio de um `INSERT` parametrizado compatível com MySQL, usando marcadores `?`, por exemplo:

```sql
INSERT INTO restaurants (name, category, rating, description, address, phone)
VALUES (?, ?, ?, ?, ?, ?);
```

Após a inserção, o ID gerado seria obtido por `result.insertId`, fornecido pelo `mysql2`. Se a API precisar retornar o registro completo, poderá consultá-lo com `SELECT * FROM restaurants WHERE id = ?;`.

## 7. Qual dependência seria necessária?

O pacote `mysql2`, que conecta o Node.js ao MySQL e oferece suporte a Promises e consultas parametrizadas, e, caso ainda não exista no projeto, o pacote `dotenv` para carregar configurações de ambiente sem colocar credenciais no código.

## 8. A arquitetura mudaria?

Sim. O banco passaria a ser um novo componente e o pacote `mysql2` seria o conector entre a API e o MySQL.

## 9. Como ficaria o desenho?

`Front-end → API Node.js/Express → mysql2 → MySQL`

## 10. Quais seriam as vantagens?

- Persistência dos dados após reinicializações.
- Integridade e validações no banco.
- Consultas mais completas.
- Relacionamentos entre entidades.
- Melhor suporte à concorrência.
- Possibilidade de crescimento do sistema.

## 11. Quais seriam os trade-offs?

- Mais configuração inicial.
- Dependência da disponibilidade do banco.
- Necessidade de tratar conexões e falhas.
- Proteção das credenciais de acesso.
- Controle de alterações do esquema por migrations.
- Estratégia de backup e recuperação.
- Custo operacional de hospedagem e manutenção.

## Comparação das alternativas

| Alternativa | Persistência | Pontos fortes | Limitações principais | Adequação ao momento |
| --- | --- | --- | --- | --- |
| Array em memória | Não | Simples, rápido e sem infraestrutura | Perde dados ao reiniciar e não escala bem | Ideal para validar o fluxo atual |
| MySQL | Sim | Integridade, transações, relacionamentos e boa integração com Node.js | Exige configuração, manutenção e tratamento de conexão | Hipótese escolhida; já instalado e conhecido pela equipe |
| PostgreSQL | Sim | Integridade, SQL, relacionamentos e concorrência | Adicionaria uma nova tecnologia ao ambiente atual | Atenderia ao projeto, mas não traz vantagem suficiente neste momento |
| MongoDB | Sim | Flexibilidade de documentos e boa integração com Node.js | Requer cuidado adicional com consistência e modelagem | Possível, mas menos alinhado aos relacionamentos previstos |
| SQLite | Sim | Banco local simples e sem servidor separado | Concorrência e escalabilidade mais limitadas | Útil para protótipos locais persistentes |

## Conclusão

MySQL é somente a hipótese escolhida para orientar uma futura decisão. PostgreSQL também seria tecnicamente adequado, mas não justifica a adoção de uma nova tecnologia no ambiente atual. Nesta etapa, o EasyFood continua usando exclusivamente o array em memória; MySQL ainda não foi implementado.
