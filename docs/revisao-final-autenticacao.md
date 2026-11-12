# Revisão final EasyFood — 11/09/2026

## Pronto e validado

- MYSQL80 em execução, conexão Prisma/MySQL confirmada.
- Migração 001-cognito-users.sql aplicada uma vez após análise de impacto e cópia local dos 11 registros e DDL anteriores.
- Os 11 restaurantes permanecem idênticos nos campos originais, inclusive após reiniciar o processo Express. SHA-256 antes/depois: d3e5ccc8d034c36f765e79ae16a6a853b9f00376228530e6cf13dd5a56eee500.
- users criada, ainda com zero usuários reais. cognito_sub único; role limitado a cliente/restaurante/admin por CHECK; owner_id opcional e único com FK para users.id. Constraints anteriores de categoria, avaliação e identidade mantidas.
- Todos os proprietários ficaram NULL. Nenhum dado real foi alterado para testar, nenhum usuário de teste foi inserido e nenhuma operação destrutiva foi executada.
- GET /restaurants real: 200, 11 registros, rating numérico e contrato público preservado. Sem token: perfil, admin, cadastro, edição e exclusão retornaram 401.
- 69 testes passaram; prisma validate aprovado; npm audit completo e de produção sem vulnerabilidades reportadas; git diff --check aprovado.

## Correções desta revisão

1. **XSS persistente na listagem:** campos de restaurantes eram interpolados diretamente em innerHTML. Agora os textos são escapados. Botões de categorias usam textContent e listener, sem interpolar dados em onclick. Layout, filtros e funcionalidades mantidos. Teste com conteúdo HTML malicioso sem inserir dados no banco.
2. **Callback inválido:** estado local malformado agora é descartado com mensagem controlada. Validamos formato de state/verifier, presença e intervalo da data e rejeitamos parâmetros code/state duplicados.
3. **Expiração obrigatória:** aws-jwt-verify validava exp quando presente, mas permitia ausência. Middleware agora exige exp numérica e futura após verificação criptográfica. Isso fecha uma lacuna de validação; não houve evidência de token Cognito real sem exp.
4. Novos testes de PKCE, callback, logout, provisionamento local, perfis de interface e XSS. Acrescentados casos de exp ausente e nbf futuro.

Arquivos alterados nesta revisão: public/index.html, public/auth.js, src/middlewares/authMiddleware.js, test/appAuth.test.js, test/auth.test.js. Novos: test/frontendAuth.test.js, test/userSync.test.js, test/xss.test.js, test/profileUi.test.js e este relatório. A documentação de configuração recebeu esclarecimento do mapeamento externo.

## Segurança revisada

A API usa aws-jwt-verify com assinatura/JWKS, issuer regional do User Pool, client_id de access token, token_use=access, exp e scope openid. ID tokens são rejeitados; audience de ID token não substitui client_id do access token. nbf futuro é rejeitado quando presente. email/profile são solicitados no login para atributos; openid é o escopo exigido pela API. Depois da validação completa, grupos reconhecidos sincronizam `users.role` com prioridade admin, restaurante e cliente.

Cliente não cadastra/edita/exclui; restaurante edita apenas seu recurso; admin acessa rotas administrativas. Há verificação do dono antes da edição e no filtro de UPDATE, cobrindo troca concorrente de proprietário. Não foi identificado caminho de IDOR nas rotas revisadas. Consultas da aplicação usam Prisma parametrizado; SQL da migração é estático, sem entrada de usuário.

Não foram encontrados secrets hardcoded, tokens em logs, .env rastreado, CORS permissivo, cookies de autenticação inseguros, redirects derivados de entrada livre ou stack traces expostos nas rotas revisadas. A varredura dos 59 arquivos candidatos ao Git não encontrou padrões de credenciais nem os valores sensíveis do .env. Os testes usam chaves temporárias e tokens fictícios, sem credenciais reais.

Limites conhecidos: access token em sessionStorage continua acessível a JavaScript da mesma origem. Logout limpa a aba e abre o Cognito; não encerra a conta Google e não invalida imediatamente uma cópia de JWT. Não há renovação automática. Usar HTTPS em produção e tokens curtos. [AWS: revogação e validação local](https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html).

## Diagnóstico MySQL

O serviço estava Stopped com início Manual. Esta sessão recebeu acesso negado ao tentar iniciá-lo e ao ler o log interno. Após o início manual pelo usuário, funcionou normalmente. Não há evidência suficiente para afirmar falha interna ou corrupção; a causa histórica da parada não foi determinada. Não alterei modo de inicialização, permissões ou my.ini. Não reaplique a migração neste banco.

## Frontend e limites da validação

Navegador real: 11 resultados; filtro Pizza retornou 2; perfil, dashboard e admin sem sessão redirecionaram ao login; botão Google mostrou configuração ausente; callback inválido foi recusado e limpou a URL.

Identidades simuladas em testes verificaram links de cliente/restaurante/admin, painel admin bloqueado para demais perfis, edição do dono e ocultação de segundo cadastro. Login, sessão autenticada visual e logout reais no Google/Cognito ainda não foram executados: faltam as cinco variáveis abaixo. Não confundir testes simulados com validação externa.

## Checklist externa e destino dos valores

| Valor/configuração | Onde configurar / variável |
| --- | --- |
| Google OAuth Client ID | Provedor Google dentro do Cognito; **não entra no .env** |
| Google OAuth Client Secret | Somente provedor Google no Cognito; **não entra no .env nem no código** |
| Google redirect URI | No cliente OAuth Google: https://SEU-DOMINIO.auth.SUA-REGIAO.amazoncognito.com/oauth2/idpresponse |
| Consent screen | Google Auth Platform: nome, suporte, audiência e contas de teste; sem variável local |
| AWS Region | Escolher na AWS; incorporada no User Pool ID e domínio. A implementação não usa AWS_REGION |
| User Pool ID | COGNITO_USER_POOL_ID |
| App Client ID público, sem secret | COGNITO_CLIENT_ID; não confundir com Client ID Google |
| Cognito Domain | COGNITO_DOMAIN, origem HTTPS sem caminho |
| Callback URL | COGNITO_CALLBACK_URL=http://localhost:3000/callback.html e cadastrar exatamente no App Client |
| Logout URL | COGNITO_LOGOUT_URL=http://localhost:3000/index.html e cadastrar exatamente no App Client |
| Google Identity Provider | Criar no User Pool, habilitar no App Client, mapear email/name; sem variável extra |
| Scopes | openid email profile no provedor/App Client; já definidos pelo código, sem variável extra |
| Grupos/perfis | Criar cliente, restaurante e admin no Cognito; sem variável .env |

Estado atual: DATABASE_URL preenchida e validada; **COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, COGNITO_DOMAIN, COGNITO_CALLBACK_URL e COGNITO_LOGOUT_URL estão ausentes**. .env não foi alterado.

## Teste real mínimo

1. No Google, configurar consentimento, contas de teste e OAuth Web Client; cadastrar /oauth2/idpresponse no domínio Cognito.
2. No Cognito, configurar User Pool regional, domínio, Google e App Client público com Authorization Code, scopes e URLs acima.
3. Preencher somente as cinco variáveis COGNITO no .env e reiniciar com npm start. Banco local já migrado.
4. Abrir http://localhost:3000/login.html, entrar com Google e conferir perfil cliente. Isso criará o primeiro usuário local por sub.
5. Associar a conta escolhida ao grupo admin no Cognito, sair e entrar novamente. O novo access token sincroniza o role local automaticamente. Repetir o fluxo ao alterar qualquer grupo.
6. Testar cliente bloqueado, restaurante editando o próprio recurso/403 no de outro e admin autorizado. Usar registros novos e descartáveis para operações de escrita; preservar os 11 anteriores.
7. Sair, conferir bloqueio sem token e repetir login. Testar expiração conforme validade configurada.

## Git e publicação

Revisão local pronta para um commit técnico com as pendências externas documentadas. **Ainda não está validado para publicação como autenticação operacional:** falta concluir o login real por perfil. Recomendo concluir essa validação antes de commit/push de entrega final. Nenhum commit ou push foi feito. .env está ignorado; backups ficaram fora do repositório, na pasta work desta tarefa.
