# Deploy — EasyFood

Este documento descreve o checklist de publicação do EasyFood sem incluir credenciais reais.

## Pré-requisitos

A hospedagem precisa oferecer:

- Node.js 20+;
- processo web com `PORT` fornecido pelo ambiente;
- acesso de saída ao MySQL;
- acesso HTTPS aos endpoints do AWS Cognito;
- acesso HTTPS ao AWS S3;
- acesso HTTPS ao MailerSend quando e-mail estiver habilitado.

## Comandos

### Instalação / build

```bash
npm install
npm run prisma:generate
```

### Start

```bash
npm start
```

O `server.js` usa `process.env.PORT || 3000`, portanto é compatível com provedores que injetam a porta do serviço.

## Variáveis obrigatórias

Baseadas em `.env.example`:

```text
DATABASE_URL
COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID
COGNITO_DOMAIN
COGNITO_CALLBACK_URL
COGNITO_LOGOUT_URL
AWS_S3_REGION
AWS_S3_BUCKET
```

E-mail pode ser desabilitado se as variáveis MailerSend não forem configuradas, conforme a estratégia best-effort do projeto.

Variáveis opcionais/condicionais:

```text
MAIL_PROVIDER
MAILERSEND_API_KEY
MAIL_FROM_EMAIL
MAIL_FROM_NAME
MAIL_TIMEOUT_MS
```

Nunca versionar valores reais no GitHub.

## MySQL

Para produção acadêmica, usar uma instância MySQL acessível pelo serviço publicado.

A `DATABASE_URL` segue o formato Prisma/MySQL:

```text
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

Antes de apontar a aplicação publicada para uma base existente:

1. realizar backup;
2. confirmar schema esperado;
3. aplicar as migrations SQL em `database/migrations/` na ordem 001 → 007;
4. executar `npx prisma validate` localmente;
5. iniciar a aplicação.

O projeto não executa essas migrations automaticamente durante o start.

## AWS Cognito

Depois de conhecer a URL pública final, atualizar no App Client do Cognito os endereços permitidos.

Exemplo:

```text
Callback URL
https://SEU-DOMINIO/callback.html

Sign-out URL
https://SEU-DOMINIO/index.html
```

E configurar na hospedagem:

```text
COGNITO_CALLBACK_URL=https://SEU-DOMINIO/callback.html
COGNITO_LOGOUT_URL=https://SEU-DOMINIO/index.html
```

O login real só deve ser considerado validado depois de realizar um novo fluxo Google → Cognito → callback usando a URL publicada.

### Grupos

Os perfis continuam sendo administrados diretamente nos grupos Cognito:

- `cliente`;
- `restaurante`;
- `admin`.

O painel do EasyFood não possui permissão administrativa para alterar esses grupos.

## AWS S3

Configurar:

```text
AWS_S3_REGION
AWS_S3_BUCKET
```

O bucket deve continuar privado.

A aplicação usa a cadeia padrão de credenciais do AWS SDK. Na hospedagem, fornecer uma identidade AWS com o menor privilégio necessário para os objetos usados pelo EasyFood.

Permissões devem ser limitadas ao bucket/prefixos necessários e nunca expostas ao navegador.

Smoke test obrigatório:

- consultar perfil com imagem existente;
- fazer upload/troca de foto de perfil;
- fazer upload/troca de imagem de prato;
- confirmar URL presignada temporária;
- confirmar que o objeto não é público diretamente.

## MailerSend

Quando habilitado:

```text
MAIL_PROVIDER=mailersend
MAILERSEND_API_KEY=...
MAIL_FROM_EMAIL=...
MAIL_FROM_NAME=EasyFood
MAIL_TIMEOUT_MS=8000
```

Validar domínio/remetente conforme a conta utilizada.

Falha de e-mail não deve desfazer uma operação de domínio já concluída.

## Segurança da hospedagem

Não colocar em variáveis públicas ou frontend:

- senha MySQL;
- `DATABASE_URL`;
- AWS secret/access keys;
- MailerSend API key;
- JWTs;
- tokens Cognito;
- qualquer conteúdo do `.env`.

Usar somente o gerenciador de environment variables/secrets do provedor.

## Smoke test pós-deploy

### Público

- abrir `/`;
- listar restaurantes;
- buscar;
- filtrar;
- ordenar;
- abrir um restaurante e cardápio.

### Cliente

- login Google;
- `/auth/me` funcionando;
- perfil;
- Favoritos;
- criar/alterar Review;
- logout.

### Restaurante

- login com grupo `restaurante`;
- dashboard;
- confirmar que somente o restaurante vinculado aparece;
- editar restaurante;
- criar/editar prato;
- disponibilidade;
- imagem do prato;
- logout.

### Admin

- login com grupo `admin`;
- dashboard global;
- restaurantes;
- pratos;
- usuários;
- bloquear/reativar usuário;
- Activity Log;
- logout.

## Critério de deploy concluído

Considerar o deploy finalizado somente quando:

- URL pública responde via HTTPS;
- MySQL está conectado;
- login Cognito funciona na URL pública;
- S3 funciona sem tornar o bucket público;
- os três perfis passam no smoke test;
- CI da `main` está verde;
- nenhuma credencial foi versionada.

## Estado atual

A baseline no GitHub está funcional e com CI verde. A publicação externa depende da configuração das variáveis/serviços acima no provedor escolhido.
