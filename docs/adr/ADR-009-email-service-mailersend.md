# ADR-009 — EmailService com MailerSend

## Contexto

O EasyFood precisa enviar comunicações transacionais sem acoplar restaurantes, pratos ou controllers à API de um provedor externo. A indisponibilidade do e-mail não pode desfazer uma operação já concluída no MySQL.

## Decisão

Adotar o fluxo `domínio → EmailService → EmailProvider → MailerSendProvider`. O domínio fornece somente dados confiáveis já obtidos no backend. O EmailService valida o destinatário, monta templates de texto e HTML com escape, trata falhas e registra `email.sent` ou `email.failed` no Activity Log.

O MailerSendProvider usa timeout e variáveis de ambiente. O envio é best-effort: falha, ausência de configuração ou destinatário inválido não causa rollback da operação principal.

## Consequências

- Controllers e regras de domínio não conhecem HTTP, API key ou detalhes do MailerSend.
- Testes usam providers falsos e não acessam a Internet.
- Não há fila nem retry persistente; uma falha pode resultar em e-mail não entregue.
- O Activity Log guarda somente tipo do e-mail e ID da entidade, nunca corpo, destinatário completo ou credenciais.
