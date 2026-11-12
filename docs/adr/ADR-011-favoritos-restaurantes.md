# ADR-011 — Favoritos de restaurantes

## Status

Aceita e implementada.

## Contexto

Clientes precisam guardar restaurantes para reencontrá-los com facilidade. A associação pertence ao usuário autenticado e não pode aceitar uma identidade informada pelo navegador.

## Decisão

Persistir favoritos em uma tabela própria, com relação N:N entre `users` e `restaurants`, unicidade por usuário/restaurante e exclusão em cascata quando uma das entidades deixar de existir.

O módulo segue a separação routes/controller/service/repository. Todas as rotas exigem JWT válido e role `cliente`; o `userId` vem exclusivamente de `req.user.id`. Inclusões duplicadas retornam 409. Inclusão e remoção geram Activity Log em modo best-effort, sem envio de e-mail.

A migration `007-create-favorites.sql` é somente aditiva. A listagem pessoal inclui `averageRating`, `reviewCount` e `favoritedAt`, sem alterar a fonte de verdade das avaliações.

## Consequências

- A restrição única protege contra duplicidades inclusive em requisições concorrentes.
- Restaurante e administrador não manipulam favoritos.
- A interface pode carregar todos os favoritos do cliente uma vez e manter o estado visual dos cards.
- A exclusão em cascata evita associações órfãs.
