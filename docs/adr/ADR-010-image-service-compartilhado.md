# ADR-010 — ImageService compartilhado

## Decisão

O fluxo de imagens é `Frontend → multipart/form-data → Multer → ImageService → Sharp → StorageService → S3 privado → image_key`. Multer recebe o arquivo em memória e limita o transporte; Sharp valida bytes, corrige orientação, redimensiona e converte para WebP; StorageService armazena e assina URLs. Autorização e persistência permanecem nos serviços de domínio.

O mesmo ImageService atende User e Dish para evitar regras divergentes. Controllers apenas traduzem HTTP. Processamento não fica nas rotas porque isso mistura transporte e negócio. O S3 foi mantido por durabilidade, privacidade e URLs temporárias; armazenamento local não é adequado a múltiplas instâncias.

Se o processamento falhar, nada é enviado nem persistido. JWT identifica o usuário e impede escolher outro `userId`. A separação por contratos permite adicionar novos presets sem reescrever autenticação, domínio ou storage.

## Responsabilidades da Atividade 8

1. Reutilização mantém validação e otimização consistentes.
2. Controller lida com requisição e resposta.
3. Service aplica regras, autorização e coordena dependências.
4. Rotas não processam imagens para evitar acoplamento.
5. Middleware JWT define `req.user` após validar o token.
6. Falha de processamento encerra antes do upload.
7. Módulos e adapters isolam mudanças.
8. Multer recebe multipart e limita arquivos.
9. Sharp valida, orienta, redimensiona e converte.
10. StorageService armazena, remove e gera URL presignada.
