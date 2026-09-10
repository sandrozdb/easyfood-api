# ADR-005 - Planejar autenticação com AWS Cognito

## Status

Aceita como planejamento. Implementação adiada.

## Data

10/09/2026

## Contexto

A EasyFood poderá precisar de cadastro de usuários, login, recuperação de acesso, tokens e controle de permissões. O sistema ainda é um MVP com equipe pequena, baixa escala e implantação única. A ADR-004 decidiu manter a aplicação como monólito modular.

## Problema

Como adicionar autenticação de maneira segura e preparada para evolução sem criar agora um microserviço e uma infraestrutura distribuída desnecessários?

## Alternativas consideradas

1. **JWT e credenciais gerenciados pela EasyFood**
   - Maior controle e menor dependência externa.
   - A aplicação assume senha, recuperação de acesso, renovação e revogação de tokens.
2. **AWS Cognito**
   - Serviço gerenciado para usuários, autenticação e tokens.
   - Adiciona dependência da AWS, configuração e possível custo operacional.
3. **Login com Google**
   - Facilita a entrada do usuário e evita uma senha própria.
   - Depende do Google e não atende sozinho usuários que preferem outro método.
4. **Adiar qualquer planejamento**
   - Evita trabalho imediato.
   - Aumenta o risco de autenticação ser adicionada sem uma fronteira arquitetural clara.

## Decisão

Planejar o AWS Cognito como provedor de identidade e manter a integração dentro de um módulo `src/modules/auth` no monólito modular. Não implementar o login nesta etapa e não criar um Auth Service separado.

## Justificativa

O Cognito reduz a responsabilidade da EasyFood sobre credenciais e oferece recursos como recuperação de acesso, MFA e emissão de tokens. Ao mesmo tempo, manter a integração dentro do monólito preserva a simplicidade de desenvolvimento, testes e implantação adequada ao estágio atual do projeto.

Um adaptador `authProvider.js` deverá isolar a integração. Assim, Controller e Service não dependerão diretamente do SDK da AWS e uma mudança futura de provedor terá impacto menor.

## Consequências positivas

- Fronteira do domínio de autenticação definida antes da implementação.
- Menor responsabilidade direta sobre senhas e recuperação de acesso.
- Possibilidade de MFA e evolução dos fluxos de identidade.
- Continuidade da implantação simples do monólito.
- Integração externa isolada para facilitar testes e substituição.

## Consequências negativas e trade-offs

- Dependência de disponibilidade, configuração e preços da AWS.
- Necessidade de aprender e administrar o Cognito.
- Comunicação externa pode adicionar latência e novas falhas.
- O módulo ainda será implantado e escalado junto com toda a EasyFood.

## Critérios para implementação

Antes de escrever o código de login, deverão ser definidos:

- tipos de usuários e permissões;
- rotas públicas e protegidas;
- fluxo de cadastro e confirmação;
- recuperação de acesso;
- armazenamento seguro das configurações em variáveis de ambiente;
- estratégia de testes sem credenciais reais no repositório.

## Critérios de revisão

Reavaliar esta decisão quando autenticação atender vários produtos, exigir implantação independente, apresentar custos incompatíveis ou quando outro provedor oferecer vantagem comprovada.

## Referências

- [Pesquisa de autenticação](../pesquisa-autenticacao.md)
- [ADR-004 - Monólito modular](ADR-004-organizar-como-monolito-modular.md)
