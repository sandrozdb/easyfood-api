# Roteiro de demonstração — EasyFood

Este roteiro organiza uma apresentação curta do projeto sem depender de improviso.

## Objetivo da demo

Mostrar que o EasyFood não é apenas um CRUD: ele possui autenticação real, segurança por perfis, ownership, imagens privadas, avaliações, favoritos, analytics e experiência mobile-first.

## Duração sugerida

**5 a 7 minutos.**

## 1. Abertura — 30s

Apresentar o problema:

> O EasyFood é uma plataforma de descoberta e gestão de restaurantes. O cliente encontra e avalia estabelecimentos; o restaurante administra seu próprio negócio; e o administrador acompanha a plataforma.

Destacar rapidamente:

- Node.js + Express;
- MySQL + Prisma;
- Google + AWS Cognito;
- AWS S3;
- três perfis;
- monólito modular.

## 2. Visitante / Cliente — 1min30

Mostrar no celular ou viewport mobile:

1. Home.
2. Busca por restaurante.
3. Categoria/filtro/ordenação.
4. Página de restaurante.
5. Cardápio.
6. Login com Google.
7. Favoritar restaurante.
8. Criar ou mostrar Review.
9. Perfil/foto.

Mensagem-chave:

> O usuário não precisa criar senha no EasyFood; a identidade vem do Cognito e as ações pessoais usam o usuário validado pelo backend.

## 3. Restaurante — 1min30

Entrar com usuário do grupo `restaurante`.

Mostrar:

1. Dashboard.
2. KPIs reais.
3. Distribuição de avaliações.
4. Reviews recentes.
5. Meu restaurante.
6. Meus pratos.
7. Criar/editar prato.
8. Disponibilidade e imagem.

Mensagem-chave:

> O restaurante não escolhe qual estabelecimento consultar no dashboard. O backend resolve o restaurante pelo `owner_id` do usuário autenticado, reduzindo risco de IDOR.

## 4. Admin — 1min30

Entrar com usuário `admin`.

Mostrar:

1. Visão geral.
2. Indicadores globais.
3. Restaurantes.
4. Pratos.
5. Usuários.
6. Role apenas para consulta — gerenciada pelo Cognito.
7. Ativar/bloquear acesso local.
8. Activity Log.

Mensagem-chave:

> O painel não recebeu credenciais administrativas da AWS. Os grupos permanecem no Cognito; o EasyFood controla apenas o estado local de acesso.

## 5. Arquitetura — 1min

Mostrar o diagrama de `docs/architecture.md`.

Explicar:

```text
Frontend
→ Route
→ Controller
→ Service
→ Repository
→ Prisma
→ MySQL
```

E integrações:

```text
Google → Cognito → JWT
Multer → Sharp → S3 privado
EmailService → MailerSend
```

Citar que a escolha foi por monólito modular, não microserviços prematuros.

## 6. Qualidade — 30s

Mostrar GitHub Actions verde e mencionar:

- 355 testes aprovados;
- 0 falhas;
- Prisma válido;
- `npm audit` sem vulnerabilidades na validação final;
- validação manual ponta a ponta dos três perfis.

Ser preciso: o projeto não possui Playwright/Cypress no repositório atual.

## Capturas recomendadas

Para README, apresentação ou portfólio, registrar em viewport próximo de **390×844**:

1. `01-home.png` — home mobile-first;
2. `02-restaurante.png` — detalhe + cardápio;
3. `03-login.png` — login Google;
4. `04-cliente-favoritos.png` — favoritos;
5. `05-perfil.png` — perfil do usuário;
6. `06-dashboard-restaurante.png` — KPIs;
7. `07-pratos-restaurante.png` — gestão de pratos;
8. `08-admin-resumo.png` — visão geral admin;
9. `09-admin-usuarios.png` — usuários/role Cognito/active;
10. `10-activity-log.png` — auditoria;
11. `11-github-actions.png` — CI verde;
12. `12-arquitetura.png` — diagrama renderizado no GitHub.

Evitar capturar:

- JWTs;
- variáveis de ambiente;
- chaves AWS;
- connection strings;
- e-mails ou dados pessoais desnecessários.

## Ordem de slides sugerida

1. EasyFood — visão do produto.
2. Problema e proposta.
3. Experiência mobile e três perfis.
4. Arquitetura.
5. Segurança e autenticação.
6. Cliente.
7. Restaurante + analytics.
8. Admin + auditoria.
9. Qualidade e testes.
10. Evolução técnica e aprendizados.

## Fechamento

> O principal ganho do EasyFood foi evoluir de um CRUD simples para uma aplicação modular com decisões arquiteturais explícitas, segurança por identidade real e funcionalidades diferentes para cada perfil, sem introduzir complexidade de microserviços que o escopo não exigia.
