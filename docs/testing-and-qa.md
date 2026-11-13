# Testing and QA — EasyFood

Este documento registra o estado de qualidade da baseline final do EasyFood.

## Baseline funcional

Validação final local informada para o fechamento do projeto:

```text
tests 355
pass 355
fail 0
```

Também foram executados:

```powershell
npx prisma validate
npm audit
npm audit --omit=dev
git diff --check
```

Resultados registrados:

- Prisma schema válido;
- 0 vulnerabilidades no `npm audit`;
- 0 vulnerabilidades no `npm audit --omit=dev`;
- `git diff --check` aprovado, com apenas avisos normais de LF/CRLF no Windows.

## CI

A workflow `.github/workflows/ci.yml` executa em pushes e pull requests para `main`.

Pipeline atual:

```text
checkout
→ Node.js 20
→ npm install
→ prisma generate
→ npm test
```

O commit funcional `3435f64` (`feat: add analytics dashboards and mobile-first redesign`) foi validado com **GitHub Actions SUCCESS**.

A CI atual ainda não mede coverage, não executa `npm audit` e não possui browser E2E automatizado.

## Escopo da suíte automatizada

Os testes em `test/` cobrem:

- validação de restaurantes;
- arquitetura de pratos;
- autenticação e claims JWT;
- sincronização de usuário/role;
- RBAC;
- ownership;
- proteção contra IDOR;
- CRUD de pratos;
- upload de imagens;
- Multer;
- Sharp/ImageService;
- S3 por adapters/mocks;
- foto de perfil;
- Reviews;
- Favoritos;
- busca, filtros e ordenação;
- dashboards analíticos;
- Activity Log;
- EmailService;
- UI de autenticação/perfil;
- XSS e renderização segura.

## Dashboard analítico

A suíte adicionada para dashboards cobre, entre outros pontos:

### Restaurante

- autenticação obrigatória;
- role `restaurante` obrigatória;
- identificação do restaurante por `req.user.id`;
- ausência de `restaurantId` arbitrário vindo do frontend;
- restaurante ausente;
- total de pratos;
- disponíveis/indisponíveis;
- média e quantidade de Reviews;
- distribuição completa 1–5;
- máximo de cinco Reviews recentes;
- favorito apenas como total agregado;
- ausência de dados privados de clientes.

### Admin

- role `admin` obrigatória;
- usuários total/ativos/inativos;
- roles reconhecidas;
- restaurantes com/sem proprietário;
- pratos disponíveis/indisponíveis;
- Reviews total/média;
- Favoritos total;
- Activity Log total/24h/7d.

## Validação ponta a ponta manual

Os três perfis foram validados manualmente no ambiente local:

### Cliente

Fluxos principais verificados:

- login Google/Cognito;
- perfil;
- listagem e detalhes de restaurantes;
- busca/filtros;
- Favoritos;
- Reviews;
- logout.

### Restaurante

Fluxos principais verificados:

- login com role `restaurante` obtida do Cognito;
- acesso ao dashboard correto;
- visualização apenas do restaurante vinculado;
- gestão de restaurante;
- gestão de pratos;
- métricas do dashboard;
- logout.

### Admin

Fluxos principais verificados:

- login com role `admin`;
- dashboard global;
- restaurantes;
- pratos;
- usuários;
- consulta da role Cognito;
- ativação/bloqueio local de usuário;
- Activity Log;
- logout.

## Observação sobre E2E

O repositório **não contém Playwright, Cypress ou outra suíte E2E automatizada de navegador**.

Por isso, a expressão “validação E2E” neste projeto deve ser entendida como **validação manual ponta a ponta dos fluxos reais**, não como automação browser-driven.

Uma evolução futura possível seria adicionar Playwright para automatizar os fluxos críticos sem alterar a arquitetura funcional.

## Banco de dados

A implementação do Dashboard Analítico foi feita com operações de leitura (`findUnique`, `findMany`, `count`, `aggregate`, `groupBy`) e sem migrations novas.

Durante a implementação dessa feature foi registrado que os 11 restaurantes existentes permaneceram inalterados e com o mesmo hash de referência.

## Segurança validada

A suíte inclui regressões para:

- JWT inválido;
- role inadequada;
- ownership incorreto;
- tentativa de IDOR;
- autoria de Review;
- identidade de Favoritos;
- exposição de dados privados em analytics;
- conteúdo dinâmico/XSS;
- upload e formatos de imagem.

## Checklist final recomendado

Antes de uma entrega:

```powershell
npm test
npx prisma validate
npm audit
npm audit --omit=dev
git diff --check
git status
```

