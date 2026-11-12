# ADR-008 - Armazenamento de imagens no AWS S3

## Status

Aceita e implementada no código. A ativação real depende da configuração manual de um bucket e de credenciais AWS de menor privilégio.

## Data

12/11/2026

## Contexto

Pratos precisam receber imagens escolhidas pelo restaurante sem armazenar binários no MySQL, expor credenciais no navegador ou tornar o bucket gravável publicamente. A solução deve manter Cognito/JWT/RBAC e ownership existentes, funcionar sem configuração S3 e permitir troca futura de storage.

## Decisão

Usar `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner` atrás de `s3StorageService`. O frontend envia o arquivo binário ao backend; não há upload direto do navegador para o S3. O backend valida limite de 5 MB, allowlist de MIME e assinatura dos bytes para JPEG, PNG e WEBP.

O MySQL armazena somente `image_key`, adicionada por migration nullable e aditiva. `image_url` é mantida para compatibilidade, mas novos uploads não a preenchem. A chave contém IDs do domínio e UUID, nunca o nome original. Leituras geram URL GET assinada por 15 minutos; o bucket continua privado e a URL temporária nunca é persistida.

O upload exige autenticação e ownership real. Cliente não envia, restaurante altera somente prato próprio e admin altera qualquer prato. O repository repete o filtro de proprietário durante a escrita.

## Consistência e compensação

- Upload novo falhou: banco e imagem anterior não mudam.
- Banco falhou após upload: o novo objeto é removido por compensação.
- Substituição concluída: a imagem anterior é removida depois da atualização do banco.
- Remoção de imagem: objeto é removido e depois a referência é limpa.
- Exclusão de prato: imagem é removida antes do registro.
- Falha ao remover a imagem anterior após substituição: a nova imagem permanece válida e o evento é registrado para limpeza operacional posterior.

S3 e MySQL não compartilham transação distribuída. A estratégia privilegia referência válida no banco e compensação explícita, com logs técnicos sem secrets.

## Segurança

Bucket privado, Block Public Access ativado e escrita somente pelo backend. Credenciais seguem a cadeia padrão do AWS SDK: Profile/SSO local ou IAM Role na infraestrutura. Não há chaves no frontend. A política concede somente `s3:PutObject`, `s3:GetObject` e `s3:DeleteObject` no prefixo `easyfood/*`.

SVG e HTML são recusados. O nome original não compõe a chave. `Content-Type`, assinatura mágica, tamanho, ownership e ID são validados no backend. As respostas públicas usam URL HTTP assinada gerada pelo SDK, sem HTML arbitrário.

## Alternativas consideradas

- Binário no MySQL: rejeitado por aumentar banco, backup e tráfego sem benefício.
- URL pública fixa no banco: rejeitada por acoplar domínio/política e exigir leitura pública.
- URL assinada no banco: rejeitada porque expira.
- Upload direto com presigned PUT: adiado; exigiria CORS e mais coordenação no frontend.
- CloudFront: possível evolução para cache e domínio próprio, desnecessária nesta etapa.
- `sharp`/conversão WEBP: adiado para evitar dependência nativa e instabilidade; limite e formatos já controlam o risco inicial.

## Consequências

O backend recebe até 5 MB por upload e precisa de permissão S3 mínima. URLs expiram em 15 minutos e são renovadas quando a API é consultada novamente. Sem configuração AWS, upload retorna 503, mas o restante do EasyFood continua operacional e usa placeholder local.

## Referência

[Configuração manual do AWS S3](../aws-s3-setup.md)
