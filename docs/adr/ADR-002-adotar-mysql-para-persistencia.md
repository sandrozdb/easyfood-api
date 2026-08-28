# ADR-002 - Adotar MySQL para persistência

## Status

Aceita

## Data

27/08/2026

## Responsável

Equipe EasyFood

## Contexto

A primeira versão da API do EasyFood armazenava os restaurantes em um array na memória do processo Node.js. Essa solução permitiu validar rapidamente os fluxos de consulta e cadastro, mas todo novo registro era perdido quando o servidor era encerrado ou reiniciado.

Com a evolução do MVP, tornou-se necessário preservar os dados e preparar a aplicação para futuros relacionamentos entre restaurantes, categorias, cardápios, usuários, pedidos e avaliações.

## Problema

O armazenamento em memória não oferece persistência, integridade ou transações. Também limita a execução em múltiplas instâncias e dificulta consultas e relacionamentos mais completos.

## Alternativas consideradas

1. **MySQL**
   - Vantagem: oferece persistência, integridade, transações, relacionamentos e boa integração com Node.js.
   - Desvantagem: exige configuração, manutenção, migrations e tratamento de conexão.
2. **PostgreSQL**
   - Vantagem: possui recursos sólidos para integridade, SQL, relacionamentos e concorrência.
   - Desvantagem: adicionaria uma nova tecnologia ao ambiente atual.
3. **MongoDB**
   - Vantagem: oferece flexibilidade no armazenamento de documentos.
   - Desvantagem: exige cuidado adicional para manter a consistência de dados estruturados e relacionados.
4. **SQLite**
   - Vantagem: é simples e não exige um serviço de banco separado.
   - Desvantagem: possui limitações de concorrência e crescimento em cenários maiores.
5. **Firebase**
   - Vantagem: fornece infraestrutura gerenciada e recursos prontos na nuvem.
   - Desvantagem: cria dependência de serviço externo e pode gerar custos conforme o uso.
6. **Arquivo JSON**
   - Vantagem: é simples de implementar e inspecionar.
   - Desvantagem: não oferece transações, concorrência segura ou consultas avançadas.

## Decisão

Adotar MySQL como banco de dados persistente da API do EasyFood e utilizar o pacote `mysql2` como conector com Node.js.

## Justificativa

A escolha atende aos dados estruturados do EasyFood e oferece persistência, integridade, transações e relacionamentos. O MySQL possui boa integração com Node.js, já está instalado no ambiente e é uma tecnologia com a qual a equipe possui familiaridade. Esses fatores reduzem o prazo, o risco e o custo de adoção.

PostgreSQL também atenderia tecnicamente ao projeto, mas não existe requisito atual que justifique adicionar essa nova tecnologia ao ambiente.

## Consequências positivas

- Os dados permanecem disponíveis após reinicializações da API.
- Integridade e restrições podem ser aplicadas no banco.
- Operações podem utilizar transações.
- Relacionamentos e consultas mais completas tornam-se possíveis.
- A aplicação ganha melhor suporte a concorrência e crescimento.
- A equipe reutiliza uma tecnologia já instalada e conhecida.

## Consequências negativas

- A aplicação passa a depender da disponibilidade do MySQL.
- O ambiente precisa de configuração e credenciais locais.
- Conexões e falhas do banco precisam ser tratadas.
- Alterações no schema exigem controle por migrations.
- Backup, recuperação e segurança passam a exigir atenção contínua.
- A operação do banco pode gerar custo de infraestrutura em produção.

## Critérios de revisão

Esta decisão deve ser revista quando:

- o volume ou o padrão de acesso aos dados mudar significativamente;
- surgirem requisitos que o MySQL atual não atenda adequadamente;
- houver necessidade de recursos específicos de outro banco;
- a arquitetura avançar para múltiplos serviços ou grande escala;
- custos, desempenho ou operação justificarem uma mudança.

## Possível evolução

Uma migração futura para PostgreSQL continua possível caso apareçam requisitos que justifiquem a mudança. Essa decisão deverá ser avaliada com evidências e registrada em um novo ADR, preservando o histórico deste documento.

## Evolução da camada de acesso

O MySQL continua aceito como banco de dados do EasyFood. Posteriormente, a estratégia de acesso direto por `mysql2` evoluiu para o Prisma ORM, conforme o [ADR-003 - Adotar Prisma como ORM](ADR-003-adotar-prisma-como-orm.md). Essa evolução substitui o conector usado pela aplicação, mas não substitui a decisão arquitetural de manter o MySQL.
