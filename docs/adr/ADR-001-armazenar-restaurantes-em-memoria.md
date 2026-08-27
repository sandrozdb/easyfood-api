# ADR-001 - Armazenar restaurantes em memória

## Status

Aceita

## Data

20/08/2026

## Responsável

Equipe EasyFood

## Contexto

Esta é a primeira versão da API do EasyFood. Ela precisa permitir a consulta e o cadastro de restaurantes enquanto o produto está em prototipação, teste e validação. A prioridade atual é validar rapidamente o fluxo completo da aplicação, do front-end à API.

Nesta etapa ainda não existe persistência. Os restaurantes ficam armazenados em um array na memória do processo Node.js e, por isso, os dados cadastrados desaparecem quando esse processo é encerrado ou reiniciado.

## Alternativas consideradas

1. **Array em memória**
   - Vantagem: implementação rápida, simples e sem infraestrutura adicional.
   - Desvantagem: os dados são perdidos ao reiniciar o servidor.
2. **PostgreSQL**
   - Vantagem: oferece persistência, integridade e bons recursos para dados relacionados.
   - Desvantagem: exige instalação, configuração, conexão e manutenção do banco.
3. **MongoDB**
   - Vantagem: possui modelo flexível de documentos e integração disponível para Node.js.
   - Desvantagem: a flexibilidade exige cuidado para manter a consistência dos dados.
4. **SQLite**
   - Vantagem: oferece persistência local com configuração simples e sem servidor separado.
   - Desvantagem: possui limitações de concorrência e de crescimento em cenários maiores.
5. **Firebase**
   - Vantagem: fornece persistência gerenciada e recursos prontos na nuvem.
   - Desvantagem: cria dependência de serviço externo e pode gerar custos conforme o uso.
6. **Arquivo JSON**
   - Vantagem: é simples de ler, gravar e inspecionar durante um protótipo.
   - Desvantagem: não oferece transações, concorrência segura nem consultas avançadas.

## Decisão

Adotar temporariamente um array em memória para armazenar os restaurantes na primeira versão.

## Justificativa

A decisão prioriza rapidez de desenvolvimento, facilidade nos testes e baixa complexidade. Ela não exige infraestrutura adicional nem gera custo nesta fase, permitindo que a equipe mantenha o foco na validação do MVP.

## Consequências positivas

- Desenvolvimento rápido.
- Facilidade para testar GET e POST.
- Baixa complexidade inicial.
- Validação rápida do conceito.

## Consequências negativas

- Perda dos dados ao reiniciar o servidor.
- Ausência de persistência.
- Limitação para execução em múltiplas instâncias.
- Dificuldade para realizar consultas complexas.
- Ausência de integridade e transações de banco de dados.
- Risco de IDs repetidos ou inconsistentes ao usar apenas `array.length + 1`.

## Critérios de revisão

Esta decisão deve ser revista quando:

- o MVP for validado;
- houver necessidade de persistência;
- o volume de dados aumentar;
- forem necessárias consultas complexas;
- surgirem relacionamentos entre restaurantes, categorias, cardápios, usuários, pedidos e avaliações;
- o sistema avançar para produção.

## Notas

Esta é uma decisão temporária. Quando a tecnologia de banco de dados for efetivamente escolhida e aprovada, a nova decisão deverá ser registrada em um futuro ADR-002.
