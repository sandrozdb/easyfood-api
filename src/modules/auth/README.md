# Módulo de autenticação

Integração Cognito no monólito modular:
- authProvider.js: verifica access tokens e consulta a identidade no Cognito.
- authRoutes.js: configuração pública de login e perfil autenticado.
- ../../middlewares: autenticação e autorização por perfil.
- ../users: provisionamento e administração de usuários locais.

Após a validação criptográfica do access token, `userRepository` deriva o perfil somente de `cognito:groups` reconhecidos e sincroniza `users.role` quando houver diferença. Prioridade: `admin`, depois `restaurante`, depois `cliente`; ausência de grupo reconhecido usa `cliente`. O frontend nunca escolhe o próprio perfil.

Não há senha local nem serviço separado. O frontend usa Google via Cognito com PKCE.
Veja [guia](../../../docs/autenticacao-cognito-google.md) e [ADR-006](../../../docs/adr/ADR-006-autenticacao-cognito-google-rbac.md).
