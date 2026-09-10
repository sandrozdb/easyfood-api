# Pesquisa de autenticação para a EasyFood

## Necessidade

A evolução da EasyFood poderá exigir cadastro de usuários, login, recuperação de acesso e proteção de rotas. A autenticação precisa ser isolada do domínio de restaurantes e deve permitir futura autorização por perfil, por exemplo administrador, restaurante e cliente.

## Alternativas pesquisadas

### 1. JWT gerenciado pela própria aplicação

JWT é um formato compacto para transportar declarações entre partes. A EasyFood teria que implementar cadastro, hash de senha, login, emissão e validação de tokens, renovação, revogação e recuperação de senha.

**Vantagens**

- Controle completo do fluxo.
- Baixa dependência de um fornecedor externo.
- Bom aprendizado dos fundamentos de autenticação.

**Desvantagens**

- A equipe assume responsabilidades críticas de segurança.
- Exige tratamento seguro de senhas, segredos, expiração e revogação.
- Aumenta o código e a manutenção do MVP.

> JWT não é, sozinho, um sistema completo de autenticação; é o formato do token usado dentro de uma solução maior.

### 2. AWS Cognito

O Cognito fornece diretórios de usuários e fluxos gerenciados de autenticação. Pode cuidar de cadastro, login, recuperação de senha, MFA e emissão de tokens. A EasyFood integraria o provedor por meio do módulo `auth/`.

**Vantagens**

- Reduz o armazenamento e o tratamento direto de credenciais pela aplicação.
- Oferece recursos de segurança e gestão de identidade.
- Pode evoluir para diferentes formas de login e maior escala.

**Desvantagens**

- Exige configuração e aprendizado da AWS.
- Cria dependência do serviço e possibilidade de custo conforme o uso.
- Falhas de rede ou indisponibilidade do provedor afetam o login.

### 3. Login com Google

O Google pode autenticar o usuário por OpenID Connect. A EasyFood recebe e valida a identidade fornecida pelo Google, sem criar uma senha própria para aquele usuário.

**Vantagens**

- Entrada rápida e conhecida pelos usuários.
- A aplicação não administra a senha do Google.
- Reduz atrito no cadastro.

**Desvantagens**

- Dependência da conta e da disponibilidade do Google.
- Nem todo usuário deseja ou pode utilizar uma conta Google.
- Ainda é necessário definir sessão, autorização e vinculação do usuário na EasyFood.

## Comparação

| Critério | JWT próprio | AWS Cognito | Login com Google |
|---|---|---|---|
| Senhas administradas pela EasyFood | Sim | Não | Não |
| Recuperação de senha pronta | Não | Sim | Responsabilidade do Google |
| MFA disponível | Exige implementação | Disponível | Gerenciado pelo Google |
| Dependência externa | Baixa | AWS | Google |
| Complexidade inicial | Código próprio moderado/alto | Configuração moderada | Integração moderada |
| Adequação ao plano atual | Possível | Escolhida | Alternativa futura |

## Solução escolhida

Planejar o **AWS Cognito** como provedor de identidade e integrá-lo futuramente por meio de um módulo `src/modules/auth` dentro do monólito modular.

O módulo interno ficará responsável pelas regras e pela comunicação com o Cognito. A autenticação não será separada em microserviço agora, pois a EasyFood possui equipe pequena, baixa escala, um único produto e um único processo de implantação.

## Critérios para reavaliar

A decisão deverá ser revista se:

- o custo ou a complexidade do Cognito superar seus benefícios;
- houver necessidade de autenticação sem dependência de nuvem;
- o login com Google se tornar requisito prioritário;
- autenticação precisar atender vários produtos;
- equipes e ciclos de implantação se tornarem independentes.

## Referências

- [RFC 7519 - JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [Amazon Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
