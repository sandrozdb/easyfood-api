# Módulo de autenticação - planejamento

## Status

Planejado. Nenhuma rota de autenticação ou controle de acesso foi implementado nesta etapa.

## Objetivo

Concentrar o cadastro de usuários, login, encerramento de sessão, recuperação de acesso e autorização da EasyFood sem misturar essas responsabilidades com o módulo de restaurantes.

## Fronteira prevista

Quando implementado, o módulo poderá conter:

```text
auth/
├── authRoutes.js
├── authController.js
├── authService.js
└── authProvider.js
```

- `authRoutes.js`: define os caminhos HTTP de autenticação.
- `authController.js`: recebe as requisições e devolve respostas HTTP.
- `authService.js`: aplica as regras de autenticação e autorização.
- `authProvider.js`: isola a integração com o provedor de identidade.

## Decisão atual

A solução planejada é integrar o AWS Cognito por meio deste módulo interno e manter a EasyFood como monólito modular. Não será criado um Auth Service separado enquanto não houver necessidade comprovada de implantação, escala ou reutilização independente.

Detalhes:

- [Pesquisa de alternativas](../../../docs/pesquisa-autenticacao.md)
- [ADR-005](../../../docs/adr/ADR-005-planejar-autenticacao-com-aws-cognito.md)
