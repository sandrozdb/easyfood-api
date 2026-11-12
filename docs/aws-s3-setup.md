# Configuração manual do AWS S3 para o EasyFood

O código não cria recursos AWS. Execute estas etapas manualmente em uma conta de desenvolvimento, sem reutilizar credenciais administrativas.

## 1. Criar o bucket

1. No console do S3, crie um bucket com nome globalmente único, substituindo `<BUCKET_NAME>`.
2. Escolha a região que será usada em `AWS_S3_REGION`.
3. Mantenha **Block Public Access** integralmente ativado.
4. Ative criptografia padrão do bucket, preferencialmente SSE-S3 para esta etapa acadêmica.
5. Opcionalmente, habilite versionamento e uma regra de ciclo de vida para versões antigas.

O EasyFood usa o prefixo:

```text
easyfood/dishes/restaurant-<ID>/dish-<ID>/<UUID>.<extensão>
```

## 2. Criar acesso de menor privilégio

No desenvolvimento, prefira AWS IAM Identity Center/SSO ou um perfil da AWS CLI. Se precisar de um usuário IAM com Access Key, crie-o somente para desenvolvimento e não reutilize uma conta administrativa.

Substitua `<BUCKET_NAME>` nesta política; não invente nem copie um ARN de outro ambiente:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EasyFoodDishImages",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::<BUCKET_NAME>/easyfood/*"
    }
  ]
}
```

`s3:ListBucket` não é necessário: o backend opera por chaves conhecidas. Não use `s3:*`.

## 3. Configurar credenciais localmente

Opção recomendada com AWS CLI/SSO:

```powershell
aws configure sso
$env:AWS_PROFILE="<PROFILE_NAME>"
```

Em produção, use IAM Role da infraestrutura. Evite Access Keys permanentes.

Se Access Key for indispensável no desenvolvimento, configure as variáveis padrão da AWS somente no ambiente local protegido:

```text
AWS_ACCESS_KEY_ID=<PREENCHER_LOCALMENTE>
AWS_SECRET_ACCESS_KEY=<PREENCHER_LOCALMENTE>
```

Nunca coloque valores reais em `.env.example`, Git, frontend, prints ou logs. Revogue a chave no IAM ao terminar o uso.

## 4. Configurar o EasyFood

Preencha no `.env` local:

```dotenv
AWS_S3_REGION=<REGIAO_DO_BUCKET>
AWS_S3_BUCKET=<BUCKET_NAME>
```

O AWS SDK usa sua cadeia padrão de credenciais. Se utilizar Profile/SSO, defina `AWS_PROFILE` na sessão do PowerShell antes de iniciar a aplicação, sem precisar gravá-lo no `.env`. Reinicie `npm start` depois de alterar o ambiente.

## 5. CORS e acesso público

Não configure escrita pública e não crie bucket policy pública. O upload passa pelo backend, portanto CORS de upload no S3 não é necessário. As imagens são exibidas com URLs GET assinadas. Um `<img>` comum não exige CORS; configure CORS somente se uma evolução futura manipular pixels em canvas ou fizer `fetch` direto ao S3, limitando as origens exatas do EasyFood.

CloudFront com Origin Access Control pode ser adotado futuramente para cache e domínio próprio, mantendo o bucket privado. Não é requisito desta etapa.

## 6. Testar

1. Execute `npm test` e confirme a suíte sem AWS real.
2. Inicie a aplicação com `npm start`.
3. Entre como perfil restaurante vinculado a um restaurante.
4. Cadastre ou edite um prato e selecione JPEG, PNG ou WEBP com até 5 MB.
5. Confirme preview local, upload, thumbnail no dashboard e imagem no cardápio.
6. Substitua a imagem e confirme que a anterior deixa de ser usada.
7. Remova a imagem e confirme o placeholder local.
8. Teste como cliente (`403`), outro proprietário (`403`) e admin (permitido).
9. No S3, confirme que as chaves estão sob `easyfood/dishes/` e não usam o nome original.

## 7. Revogar ou remover acesso

1. Remova ou desative a Access Key no IAM, se criada.
2. Encerre a sessão SSO ou remova o profile local quando não for mais necessário.
3. Remova políticas anexadas que não forem mais usadas.
4. Faça rotação imediata se uma credencial for exposta.
5. Para desativar upload sem quebrar o restante da aplicação, remova `AWS_S3_REGION` ou `AWS_S3_BUCKET` do ambiente e reinicie o servidor.
