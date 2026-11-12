# ADR-007 - Módulo de pratos com ownership do restaurante

## Status

Aceita e implementada no código. A ativação no banco depende da aplicação da migration aditiva `002-create-dishes.sql`.

## Data

12/11/2026

## Contexto

O EasyFood precisa apresentar cardápios e permitir que restaurantes gerenciem seus pratos sem acessar dados de outro proprietário. A autenticação Cognito, os perfis locais e o ownership de restaurante definidos na ADR-006 devem continuar sendo a fonte de autorização.

## Decisão

Adicionar `Dish` ao monólito modular, com relacionamento obrigatório N:1 para `Restaurant`, preço decimal, disponibilidade e `imageUrl` opcional. Separar rotas, controller, service e repository. O middleware valida JWT e perfil; o service aplica regras de negócio e ownership; o repository restringe novamente a escrita pelo proprietário para reduzir risco de troca concorrente de ownership.

Consultas de cardápio e prato são públicas. Escritas exigem restaurante proprietário ou admin. O `restaurantId` da rota identifica o destino, mas nunca é suficiente para autorizar: o backend consulta o `owner_id`. Edição não aceita alteração de `restaurantId`, evitando mass assignment e IDOR.

O campo `imageUrl` aceita somente URL HTTP/HTTPS ou nulo. Não haverá upload ou credenciais S3 nesta etapa. A próxima evolução poderá substituir a entrada manual pela URL retornada por um serviço de upload, mantendo o modelo e as telas.

## Consequências

- Clientes podem consultar pratos indisponíveis, claramente identificados.
- Restaurantes gerenciam somente pratos vinculados ao próprio restaurante.
- Admin gerencia todos os pratos e identifica o restaurante proprietário.
- A foreign key usa `ON DELETE RESTRICT`, impedindo exclusão acidental de restaurante que ainda possua pratos.
- A exclusão de prato é definitiva; indisponibilidade deve ser usada para pausas temporárias.
- A migration MySQL é aditiva, mas DDL possui commit implícito e deve ser aplicada após backup e inspeção do ambiente.

## Alternativas consideradas

- Armazenar cardápio como JSON em `restaurants`: rejeitado por dificultar integridade, busca e atualização individual.
- Autorizar somente no frontend: rejeitado por permitir IDOR mediante requisições diretas.
- Criar tabela de imagens ou integrar S3 agora: adiado para manter esta etapa focada no domínio de pratos.
- Excluir pratos indisponíveis: rejeitado porque disponibilidade é um estado temporário.

## Validação

Testes automatizados cobrem CRUD, validações, 401, 403, ownership, admin, disponibilidade, mass assignment e relação Restaurant 1:N Dish. A aplicação da migration deve ser seguida da comparação da quantidade e da impressão digital dos restaurantes existentes.
