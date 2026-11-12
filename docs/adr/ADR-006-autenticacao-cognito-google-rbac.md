# ADR-006 - Autenticação Cognito + Google e autorização RBAC

## Status

Aceita e implementada no código. Ativação depende de migração MySQL e configuração externa. Evolui o planejamento da ADR-005 sem alterar seu registro histórico.

## Data

10/09/2026

## Contexto

O monólito modular precisa identificar clientes, restaurantes e administradores, preservando a consulta pública, o contrato JSON e a persistência existentes. Senhas próprias aumentariam a responsabilidade operacional do MVP.

## Decisão

Usar Google como provedor federado do Cognito User Pool, Authorization Code com PKCE S256, App Client público sem segredo e access token validado por aws-jwt-verify. O adaptador authProvider isola verificação e consulta userInfo. A API valida assinatura, emissor, expiração, tipo access, client_id e scope.

Persistir users por cognito_sub único, com nome, e-mail, perfil, estado ativo e data. Após a validação criptográfica completa do access token, grupos verificados definem e sincronizam `users.role` em cada sessão processada. Somente `admin`, `restaurante` e `cliente` são reconhecidos, na prioridade `admin > restaurante > cliente`; ausência de grupo reconhecido usa `cliente`. O valor local continua sendo usado pelo RBAC da requisição, mas funciona como projeção persistida do token válido, não como fonte independente de privilégio.

Adicionar owner_id nullable e único aos restaurantes. Registros existentes permanecem sem proprietário até atribuição por admin. Um usuário restaurante administra um estabelecimento. Admin pode cadastrar estabelecimentos sem vínculo. Ownership é verificado antes e durante a escrita.

Preservar GET público e proteger POST. Acrescentar PUT/PATCH, DELETE administrativo, perfil e gerenciamento local de usuários. Reutilizar o formulário e frontend existentes.

## Alternativas

- Senhas e JWT próprios: rejeitado pela responsabilidade adicional de credenciais.
- Google direto: rejeitado para manter Cognito como emissor único e evolução de identidade.
- Grupos Cognito como autorização exclusiva: exigiria integração administrativa AWS e mudanças dependeriam da emissão de novos tokens.
- Microserviço separado: sem necessidade no escopo atual.

## Consequências

Não há senhas locais, Client Secret no browser ou access keys AWS. Há dependência externa para login e primeiro provisionamento. sessionStorage tem exposição a XSS da mesma origem; não persistimos ID/refresh token e não implementamos renovação automática. Logout local/Cognito não invalida imediatamente cópias de JWT: usar validade curta e bloqueio local quando necessário.

A migração é aditiva, mas DDL MySQL não é totalmente transacional; backup e inspeção de aplicação parcial são necessários. `active` permanece uma decisão local e é respeitado em cada requisição. Alterações de grupo valem quando um novo access token contendo a claim atualizada for processado; tokens já emitidos mantêm suas claims até renovação ou novo login.

## Validação

Testes offline assinam JWTs RSA com chave temporária e fornecem JWKS local ao verificador real. Cobrem assinatura, claims, perfis e ownership sem AWS. Os testes de validação de restaurantes são preservados. A configuração Google/Cognito e o login real exigem teste manual.

## Referência

[Configuração, permissões e roteiro de testes](../autenticacao-cognito-google.md)
