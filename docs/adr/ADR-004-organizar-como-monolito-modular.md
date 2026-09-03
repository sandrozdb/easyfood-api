# ADR-004 - Organizar o EasyFood como monólito modular

## Status

Aceita

## Data

03/09/2026

## Responsável

Equipe EasyFood

## Contexto

O EasyFood continua sendo uma aplicação monolítica adequada ao tamanho atual do MVP. Entretanto, o `server.js` concentrava configuração do Express, rotas HTTP, validações, regras de negócio e chamadas ao repository. A inclusão futura de novos domínios, como pedidos, aumentaria o acoplamento e dificultaria a manutenção.

## Problema

Como organizar as responsabilidades atuais e preparar a aplicação para novos domínios sem introduzir prematuramente a complexidade operacional de microserviços?

## Alternativas consideradas

1. **Manter todas as responsabilidades no `server.js`**
   - Vantagem: menor quantidade de arquivos.
   - Desvantagem: alto acoplamento e crescimento desorganizado.
2. **Separar imediatamente em microserviços**
   - Vantagem: implantação e escala independentes por domínio.
   - Desvantagem: adiciona comunicação pela rede, observabilidade distribuída, consistência eventual e maior custo operacional sem necessidade comprovada.
3. **Adotar um monólito modular**
   - Vantagem: separa responsabilidades e domínios mantendo uma única aplicação e um único processo de implantação.
   - Desvantagem: os módulos ainda compartilham o mesmo processo e não podem ser escalados separadamente.

## Decisão

Manter o EasyFood como uma aplicação monolítica e organizar o domínio de restaurantes em um módulo próprio, separado nas camadas Routes, Controller, Service e Repository.

## Justificativa

O EasyFood ainda é um MVP desenvolvido por uma equipe pequena e não possui volume, equipes independentes ou necessidades de escala que justifiquem microserviços. O monólito modular preserva a simplicidade operacional e cria limites internos claros para regras de negócio e acesso aos dados.

## Responsabilidades

- `server.js` inicia o servidor.
- `src/app.js` configura o Express e registra os módulos.
- Routes define caminhos e métodos HTTP.
- Controller traduz requisições e respostas HTTP.
- Service concentra regras de negócio e validações.
- Repository concentra o acesso aos dados com Prisma.
- Prisma ORM intermedeia o acesso ao MySQL.

## Consequências positivas

- O `server.js` deixa de concentrar responsabilidades.
- As regras de negócio ficam independentes da camada HTTP.
- O acesso ao banco permanece isolado no repository.
- Novos domínios podem ser adicionados com estrutura semelhante.
- A aplicação fica mais fácil de testar e manter.
- Uma futura extração para microserviço se torna mais segura.

## Consequências negativas e trade-offs

- A quantidade de arquivos e abstrações aumenta.
- A equipe precisa compreender a responsabilidade de cada camada.
- Todos os módulos continuam sendo implantados e escalados juntos.
- Separação excessiva em funcionalidades pequenas pode gerar complexidade desnecessária.

## Critérios de revisão

Esta decisão deverá ser revista quando:

- um domínio precisar de implantação ou escala independente;
- equipes diferentes precisarem desenvolver módulos com autonomia;
- uma falha em determinado domínio precisar ser isolada do restante da aplicação;
- o custo de manter tudo no mesmo processo superar a simplicidade do monólito;
- métricas reais de volume, disponibilidade ou desempenho justificarem microserviços.

## Possível evolução

O domínio de pedidos deverá começar como outro módulo interno. Se os critérios de revisão ocorrerem, ele poderá ser extraído para uma aplicação independente, com API e banco próprios, mediante uma nova decisão arquitetural registrada em ADR.
