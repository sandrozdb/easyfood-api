# Configurar Google + AWS Cognito no EasyFood

## Fluxo e decisões

O navegador abre o Cognito, que encaminha o login ao Google. O Cognito devolve um código ao callback do EasyFood. O frontend troca esse código por tokens usando PKCE S256 e envia somente o access token em `Authorization: Bearer <token>`. A API verifica assinatura RS256 com JWKS do User Pool, issuer, expiração, client_id, token_use=access e scope openid usando aws-jwt-verify. Ela identifica o usuário pelo sub verificado, nunca pelo e-mail enviado pelo navegador.

Não há senha local nem Client Secret no frontend. O App Client Cognito é público. O Client Secret do Google fica exclusivamente na configuração do provedor Google dentro do Cognito. A API não precisa de access key AWS, segredo Google, Identity Pool nem SDK administrativo AWS.

O access token fica em sessionStorage, restrito à aba; ID token e refresh token não são persistidos. PKCE protege a troca do código e state protege o retorno contra login CSRF. O callback limpa código e state da URL. Há prazo de 10 minutos e uso único do estado local. Ao expirar o token, faça login novamente; não há renovação automática. O logout limpa o token local e abre /logout do Cognito. Isso não encerra a conta Google e não revoga instantaneamente uma cópia de JWT já emitida: a verificação é local, até expirar. Configure access tokens curtos (por exemplo, 5 a 15 minutos). Desativar o usuário local bloqueia imediatamente o acesso à API.

SessionStorage pode ser lido por JavaScript da mesma origem: mantenha a prevenção de XSS e use HTTPS em produção. Conteúdo novo de usuários nos painéis é inserido com textContent. O projeto usa scripts inline existentes; uma política CSP estrita ou sessão em cookie HttpOnly exigiria trabalho adicional. Não registre tokens no console ou em logs.

## 1. Preparar o User Pool e domínio

1. No console AWS, abra Amazon Cognito e crie um User Pool para uma aplicação web com provedor social.
2. Use um pool regional padrão, com issuer `https://cognito-idp.<região>.amazonaws.com/<user-pool-id>`. Esta implementação não foi configurada para issuer de pool multirregional.
3. Configure atributos email e name, mutáveis para o mapeamento do Google. Não exija atributos que o Google não fornece.
4. Em domínio/managed login, escolha um domínio Cognito disponível. Anote a origem HTTPS completa, sem caminhos.
5. Anote o User Pool ID. Não confunda User Pool com Identity Pool.

Os nomes das seções do console podem variar; os valores abaixo são os contratos necessários.

## 2. Google Cloud

1. Crie ou selecione um projeto no Google Cloud Console.
2. Abra Google Auth Platform (ou APIs e serviços → Tela de consentimento OAuth).
3. Configure nome EasyFood, e-mail de suporte, contato e audiência. Para teste externo, cadastre os e-mails das contas de teste. Configure domínios autorizados quando solicitados.
4. Em acesso a dados, selecione os escopos de identidade openid, email e profile.
5. Em clientes/credenciais, crie um OAuth Client ID do tipo **Aplicativo da Web**.
6. Em URIs de redirecionamento autorizados, use exatamente:
   `https://SEU-DOMINIO.auth.SUA-REGIAO.amazoncognito.com/oauth2/idpresponse`
7. Guarde o Client ID e Client Secret do Google para a próxima etapa. Não coloque esses valores no Git, frontend ou .env do EasyFood.
8. Para disponibilizar a outros usuários, revise audiência, publicação e verificações exigidas pelo Google.

A URI do Google termina em **/oauth2/idpresponse**, no Cognito. A callback do EasyFood é outra URL.

## 3. Conectar Google e criar App Client

1. No User Pool, abra provedores de identidade/login social e adicione **Google**.
2. Informe Client ID e Client Secret obtidos no Google.
3. Configure scopes `openid email profile`.
4. Mapeie email → email e name → name; mantenha esses atributos permitidos para leitura/escrita no App Client conforme as exigências de federação.
5. Crie um App Client público, tipo SPA quando essa opção existir, **sem Client Secret**.
6. Habilite Google como provedor do App Client.
7. Habilite Authorization Code Grant; não habilite implicit grant. O código usa PKCE S256.
8. Configure scopes openid, email e profile.
9. Configure callback: `http://localhost:3000/callback.html`.
10. Configure logout/sign-out URL: `http://localhost:3000/index.html`.
11. Em produção, adicione URLs HTTPS exatas e atualize o ambiente. Não use curingas.
12. Configure prazo curto para access tokens e anote o App Client ID.

## 4. Variáveis do .env

Se .env já existe, adicione apenas as novas chaves. Não o sobrescreva.

| Variável | Origem |
| --- | --- |
| PORT | Porta HTTP local, normalmente 3000 |
| DATABASE_URL | Conexão MySQL existente |
| COGNITO_USER_POOL_ID | ID do User Pool na AWS |
| COGNITO_CLIENT_ID | ID do App Client Cognito público, não o Client ID Google |
| COGNITO_DOMAIN | Origem HTTPS do domínio Cognito |
| COGNITO_CALLBACK_URL | URL exata de callback cadastrada no App Client |
| COGNITO_LOGOUT_URL | URL exata de logout cadastrada no App Client |

A região AWS é incorporada no User Pool ID e no domínio; não existe variável AWS_REGION nesta implementação. Client ID/Secret Google, consentimento, redirect URI Google, scopes e grupos são configurados nos consoles, não em variáveis adicionais do .env.

Use os placeholders de .env.example apenas como referência. Não invente valores reais. /auth/config expõe somente os parâmetros públicos de login, nunca DATABASE_URL. Se o Cognito não estiver configurado, esse endpoint retorna 503 e a listagem pública continua disponível quando o banco está preparado.

## 5. Banco e migração sem apagar dados

1. Inicie o MySQL e faça backup do banco pelo MySQL Workbench.
2. Para banco novo, execute primeiro database/schema.sql.
3. Para banco novo ou existente ainda sem autenticação, execute **uma única vez** database/migrations/001-cognito-users.sql no banco EasyFood.
4. A migração cria users e adiciona owner_id nullable em restaurants. Os registros anteriores ficam com owner_id NULL.
5. Verifique as quantidades e valores dos restaurantes antes/depois.
6. Execute no PowerShell:

```powershell
npm install
npm run prisma:generate
npm test
npm start
```

Não rode prisma:pull antes de aplicar a migração, pois isso apagaria do schema local os modelos ainda ausentes no banco. Não use reset, db push com perda de dados nem recrie o banco. MySQL confirma DDL implicitamente: se houver falha parcial, inspecione users e owner_id antes de tentar novamente; não apague tabelas para repetir.

Um usuário restaurante pode ter um único restaurante, garantido por índice único em owner_id. Admin pode cadastrar vários sem proprietário e atribuí-los pelo painel. Atribuição exige usuário ativo de perfil restaurante. Cadastros duplicados ou segundo vínculo retornam 409. A listagem pública mantém seus campos anteriores e rating numérico; owner_id só é exposto no painel autenticado.

## 6. Grupos e administração de perfis

Crie os grupos **cliente**, **restaurante** e **admin** no User Pool. Não permita que usuários comuns se adicionem a grupos privilegiados.

Depois da validação criptográfica completa do JWT, `cognito:groups` define o perfil local em toda sessão processada. A prioridade é **admin > restaurante > cliente**. Somente esses três valores são reconhecidos; grupo desconhecido ou claim ausente usa `cliente`. O backend atualiza `users.role` apenas quando o valor derivado estiver diferente, preservando `cognito_sub`, `active` e os demais campos. Não há chave administrativa AWS na aplicação.

Para criar o primeiro administrador:
1. Faça login com a conta Google escolhida, criando o usuário federado e o registro local.
2. No console Cognito, associe a conta ao grupo `admin`.
3. Encerre a sessão anterior e faça novo login para receber um access token com `cognito:groups` atualizado.
4. A primeira requisição autenticada sincronizará o registro local automaticamente; não é necessário executar `UPDATE` manual no MySQL.

O mesmo fluxo vale para promoção ou rebaixamento entre cliente, restaurante e admin. O painel local não altera grupos AWS; para mudanças permanentes de perfil, altere o grupo no Cognito e obtenha um novo token. Não é permitido alterar o próprio perfil/estado pelo painel para evitar perda acidental de acesso.

## 7. Rotas e permissões

| Rota | Permissão |
| --- | --- |
| GET /restaurants | Pública |
| GET /auth/config | Pública, parâmetros de login |
| GET /auth/me | Usuário autenticado ativo; somente o próprio perfil |
| GET /restaurants/managed | Restaurante: seus registros; admin: todos |
| POST /restaurants | Restaurante ou admin |
| PUT /restaurants/:id | Restaurante proprietário ou admin; campos completos |
| PATCH /restaurants/:id | Restaurante proprietário ou admin; campos parciais |
| DELETE /restaurants/:id | Somente admin |
| GET /admin/users?offset=0 | Admin; páginas de até 100 usuários |
| PATCH /admin/users/:id | Admin; role e/ou active |
| PUT /admin/restaurants/:id/owner | Admin; owner_id numérico ou null |

Sem token ou token inválido: 401. Identidade válida sem permissão ou usuário desativado: 403. Recurso inexistente: 404. Entrada inválida: 400. A API verifica ownership também no filtro de escrita, evitando que uma troca concorrente de dono permita edição indevida. Cadastrar com owner_id/role fornecidos pelo navegador não atribui privilégios: o service escolhe o dono a partir da identidade autenticada. PATCH/PUT de restaurante rejeitam campos extras.

## 8. Roteiro manual

1. **Público:** abra a página inicial e teste listagem, pesquisa e categorias. POST sem Bearer deve retornar 401.
2. **Cliente:** login com Google → perfil cliente; confirme nome/e-mail, lista pública e ausência de cadastro/painéis. Acesso direto a /admin/users com seu access token deve retornar 403.
3. **Restaurante:** admin promove uma segunda conta a restaurante. Nessa conta, abra perfil → dashboard → cadastre restaurante, edite e confirme persistência após reiniciar o servidor.
4. **Outro restaurante:** use uma terceira conta promovida a restaurante; tente PATCH no ID da segunda conta, que deve retornar 403. DELETE também deve retornar 403.
5. **Admin:** confira lista de usuários, mudança de perfil, desativação, cadastro, atribuição de proprietário, edição e exclusão de um restaurante criado só para teste.
6. **Logout:** clique Sair no perfil; /auth/me deve retornar 401 na aba. Ao entrar novamente, o Google pode reutilizar sua sessão.
7. **Expiração:** após o prazo do token, confirme 401 e faça novo login.
8. Não compartilhe tokens nem os inclua em screenshots. Use registros descartáveis nos testes de exclusão.

## Referências oficiais

- [AWS: validação JWT](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html)
- [AWS: authorization endpoint e PKCE](https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html)
- [AWS: token endpoint](https://docs.aws.amazon.com/cognito/latest/developerguide/token-endpoint.html)
- [AWS: provedores sociais](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-social-idp.html)
- [Google: OAuth para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server)
