# ADR-003 - Adotar Prisma como ORM

## Status

Aceita

## Data

27/08/2026

## Responsável

Equipe EasyFood

## Contexto

O EasyFood adotou MySQL para persistir restaurantes e inicialmente acessava o banco pelo pacote `mysql2`, com consultas SQL escritas diretamente no repository. Essa solução funcionou e comprovou a persistência, mas a evolução acadêmica e funcional do projeto exige uma camada de acesso mais centralizada e preparada para novos relacionamentos.

O banco MySQL, a tabela `restaurants` e todos os dados existentes devem ser preservados. Esta decisão trata apenas da estratégia de acesso ao banco, sem substituir a decisão pelo MySQL registrada no ADR-002.

## Alternativas consideradas

1. **mysql2 com SQL direto**
   - Vantagem: oferece controle explícito das consultas e pouca abstração.
   - Desvantagem: exige mais SQL repetitivo, conversões manuais e manutenção distribuída.
2. **Prisma**
   - Vantagem: centraliza o modelo, gera um Client com tipagem e oferece suporte a relações e migrations.
   - Desvantagem: adiciona uma camada de abstração e exige geração do Client.
3. **Sequelize**
   - Vantagem: é um ORM consolidado no ecossistema Node.js.
   - Desvantagem: possui APIs e configuração diferentes do padrão adotado na disciplina.
4. **TypeORM**
   - Vantagem: possui recursos completos de entidades, relações e migrations.
   - Desvantagem: é mais associado a projetos TypeScript e pode adicionar complexidade ao projeto CommonJS atual.

## Decisão

Adotar Prisma como ORM entre o repository e o MySQL, substituindo o acesso direto da aplicação por `mysql2`.

## Justificativa

- Alinhamento com a disciplina.
- Modelos de dados centralizados no `schema.prisma`.
- Client gerado com tipagem e API consistente.
- Suporte a migrations para evoluções futuras.
- Facilidade para representar relacionamentos.
- Redução de SQL repetitivo na aplicação.
- Melhor manutenção e evolução do repository.

## Consequências positivas

- O contrato do banco fica representado em um modelo central.
- O repository utiliza operações de alto nível como `findMany`, `findUnique` e `create`.
- A evolução para novas entidades e relacionamentos fica mais organizada.
- Conversões específicas, como `Decimal` para número, ficam concentradas no repository.
- O código da API deixa de depender diretamente de um driver MySQL.

## Consequências negativas

- O Prisma Client precisa ser gerado após a instalação e após mudanças no schema.
- A aplicação passa a depender das versões do Prisma CLI e do Prisma Client.
- A abstração pode não representar todos os recursos específicos do MySQL.
- A equipe precisa compreender introspecção, schema e ciclo de geração do Client.
- Consultas muito específicas podem exigir recursos avançados ou SQL direto controlado.

## Critérios de revisão

Esta decisão deve ser revista quando:

- o Prisma não atender a uma consulta crítica;
- desempenho ou volume exigirem otimizações específicas;
- o custo da abstração superar os benefícios de manutenção;
- houver mudança significativa na linguagem ou arquitetura da aplicação;
- surgirem requisitos incompatíveis com as versões suportadas do Prisma.

## Uso excepcional de SQL direto

SQL direto poderá ser utilizado no futuro quando uma consulta comprovadamente exigir recursos ou desempenho que o Prisma Client não ofereça adequadamente. Essa exceção deverá ser isolada, parametrizada, testada e documentada, sem expor credenciais ou comprometer a segurança da aplicação.
