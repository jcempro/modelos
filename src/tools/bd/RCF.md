# RCF Subordinado — Conversor Universal de Modelos de Dados CSV

## Objetivo

Desenvolver um subprojeto subordinado ao RCF principal destinado à conversão bidirecional entre modelos tabulares, tendo inicialmente o formato CSV como origem e destino, permanecendo preparado para suportar futuramente outros formatos de armazenamento (JSON, SQLite, IndexedDB, bancos remotos, entre outros), sem necessidade de alterações no núcleo da aplicação.

Este subprojeto constitui exclusivamente uma ferramenta de transformação de dados, não possuindo finalidade de impressão ou geração documental.

Toda sua implementação deverá obedecer integralmente às diretrizes do RCF principal, complementadas pelas normas específicas deste documento.

---

## Requisitos Gerais

- execução integral client-side, diretamente no navegador;
- nenhuma dependência obrigatória de servidor;
- funcionamento offline;
- arquitetura desacoplada;
- núcleo independente do formato de armazenamento;
- determinismo absoluto;
- rastreabilidade completa;
- reutilização máxima;
- compatibilidade com o layout oficial;
- compatibilidade retroativa e futura;
- codificação preventiva contra falhas, corrupção de dados, inconsistências e expansão futura.

---

## Arquitetura

A implementação deverá possuir um modelo interno canônico, independente dos formatos de entrada e saída.

Toda importação deverá converter inicialmente para esse modelo interno.

Toda exportação deverá ser produzida exclusivamente a partir desse modelo.

Novos formatos deverão ser adicionados mediante adaptadores independentes, sem modificar o núcleo do conversor.

---

## Compatibilidade de Entrada

A importação deverá aceitar arquivos CSV produzidos pelos principais softwares e implementações existentes, incluindo, entre outros:

- RFC 4180;
- Microsoft Excel;
- LibreOffice;
- Google Sheets;
- arquivos parcialmente inconsistentes, desde que recuperáveis.

Deverá suportar automaticamente:

- UTF-8;
- UTF-8 com BOM;
- ANSI;
- demais codificações reconhecíveis.

A detecção deverá ocorrer automaticamente.

Sempre que possível, a codificação original deverá ser identificada sem intervenção do usuário.

---

## Compatibilidade de Saída

Sempre que o destino for um arquivo textual (CSV ou equivalente), a exportação deverá ocorrer obrigatoriamente em UTF-8 com BOM.

---

## Parser CSV

O parser deverá aceitar automaticamente:

- vírgula;
- ponto e vírgula;
- TAB;
- pipe;
- dois pontos;
- qualquer separador consistente detectável.

Também deverá suportar corretamente:

- campos entre aspas;
- campos sem aspas;
- aspas simples;
- aspas duplas;
- separadores internos protegidos;
- quebras de linha internas;
- números entre aspas;
- números sem aspas;
- campos vazios;
- espaços opcionais conforme o dialeto utilizado.

---

## Tratamento de Colunas

Os nomes das colunas deverão ser tratados de forma case-insensitive.

O sistema deverá permitir aliases configuráveis para futuras nomenclaturas equivalentes.

Colunas desconhecidas jamais deverão ser descartadas.

Toda coluna desconhecida deverá ser automaticamente incorporada ao modelo interno e preservada durante todas as conversões.

---

# Modelo 1

Cada linha representa um cliente.

O identificador primário poderá ser:

- MCI;
- CID;
- MGI;

A prioridade e equivalência entre esses identificadores deverão ser configuráveis conforme definido pelo RCF principal.

O modelo poderá conter:

Fone

Fone 2

...

Fone n

bem como seus respectivos:

Nome

Nome 2

...

Nome n

Cada Nome representa exclusivamente o telefone correspondente.

O modelo poderá conter qualquer quantidade de pares Nome/Fone.

Não deverá existir limitação estrutural para n.

Também poderá conter quaisquer outras colunas adicionais.

---

# Modelo 2

Cada linha representa um telefone.

O telefone torna-se a entidade principal.

Deverá conter:

Fone

Nome

MCI

MCI 2

...

MCI n

bem como futuras colunas múltiplas equivalentes.

Outras colunas adicionais deverão ser preservadas automaticamente.

---

## Conversão Modelo 1 → Modelo 2

Cada par Nome/Fone deverá originar um registro individual.

Os atributos pertencentes ao cliente deverão acompanhar o telefone exclusivamente para preservação da informação e reconstrução futura.

Essa replicação não altera sua semântica lógica.

Continuam sendo atributos pertencentes ao cliente.

Caso um mesmo telefone esteja associado a vários clientes, todos deverão ser preservados.

Para isso deverão existir:

MCI

MCI 2

...

MCI n

O mesmo princípio deverá aplicar-se automaticamente a quaisquer futuras colunas que admitam múltiplas ocorrências.

---

## Conversão Modelo 2 → Modelo 1

Todos os registros pertencentes ao mesmo cliente deverão ser reconstruídos em uma única linha.

Os telefones deverão ser reorganizados como:

Fone

Nome

Fone 2

Nome 2

...

Fone n

Nome n

A reconstrução deverá ser totalmente determinística.

---

## Relacionamento Muitos-para-Muitos

O modelo deverá suportar integralmente relacionamentos muitos-para-muitos.

Assim:

- um cliente poderá possuir vários telefones;
- um telefone poderá pertencer a vários clientes.

Nenhuma associação poderá ser perdida.

---

## Preservação de Dados

A conversão deverá preservar integralmente:

- conteúdo;
- estrutura lógica;
- relacionamentos;
- colunas adicionais;
- valores desconhecidos;
- compatibilidade futura.

Nenhum dado poderá ser descartado simplesmente por não ser compreendido pelo modelo atual.

---

## Escopo dos Atributos

Exceto pelo Nome, todos os atributos adicionais pertencem conceitualmente ao cliente.

Quando forem replicados para acompanhar um telefone, isso ocorrerá exclusivamente para garantir preservação das informações e reconstrução posterior.

---

## Nome das Colunas Replicadas

Sempre que um atributo do cliente for replicado devido à existência de múltiplos MCIs associados ao mesmo telefone, sua nomenclatura deverá identificar explicitamente a qual ocorrência pertence.

Essa identificação deverá eliminar ambiguidades e permitir reconstrução exata do modelo original.

---

## Consolidação de Nomes

Quando um mesmo telefone aparecer associado a diferentes nomes, o sistema deverá considerar inicialmente tratar-se de possíveis variações legítimas, como:

- erro de digitação;
- abreviação;
- pronome de tratamento;
- pequenas diferenças ortográficas;
- nome incompleto.

O sistema deverá tentar consolidar automaticamente esses nomes utilizando critérios determinísticos.

Caso não seja possível determinar uma representação confiável, deverá solicitar decisão do usuário.

A escolha realizada deverá ser aplicada de forma consistente durante toda a operação.

---

## Tratamento de Erros

Sempre que possível, inconsistências deverão ser recuperadas automaticamente.

Quando isso não for possível, o sistema deverá solicitar intervenção do usuário.

Nenhum dado deverá ser descartado silenciosamente.

Todas as inconsistências deverão permanecer rastreáveis.

---

## Logs

A interface deverá apresentar logs sucintos e continuamente atualizados.

Os logs deverão informar, no mínimo:

- início da operação;
- etapa atual;
- progresso;
- avisos;
- inconsistências;
- solicitações de decisão;
- conclusão;
- falhas.

Os logs deverão possuir caráter exclusivamente informativo, evitando excesso de verbosidade.

---

## Extensibilidade

A implementação deverá permitir inclusão de novos:

- modelos tabulares;
- formatos de armazenamento;
- adaptadores;
- regras de transformação;
- validadores;
- normalizadores;

sem necessidade de alteração do núcleo do sistema.

---

## Compatibilidade Futura

Toda decisão arquitetural deverá privilegiar:

- baixo acoplamento;
- alta coesão;
- modularidade;
- reutilização;
- previsibilidade;
- determinismo;
- rastreabilidade;
- compatibilidade retroativa;
- compatibilidade futura.

Nenhuma implementação deverá assumir conhecimento fixo da estrutura dos modelos além das regras normatizadas neste documento.

---

## Arquitetura Local

### ARQ001 - Arquivos do Módulo

```text
src/tools/bd/
├── RCF.md
├── bd.css
├── bd.ts
└── index.html
```

O arquivo `src/tools/bd/RCF.md` é o RCF específico vigente deste módulo, seguindo a organização normativa global por diretório de módulo.

### ARQ002 - Consumo da Camada Compartilhada

O módulo deve consumir o núcleo tabular compartilhado em `src/assets/js/tabular.ts` para:

- detecção e leitura de CSV;
- serialização CSV em UTF-8 com BOM;
- modelo interno canônico;
- conversão determinística entre modelos;
- preservação de colunas desconhecidas;
- rastreamento de inconsistências e decisões pendentes.

O arquivo `src/tools/bd/bd.ts` deve conter apenas a integração da interface, fluxo operacional, logs, decisões do usuário e acionamento do núcleo compartilhado.

### ARQ003 - Decisões Arquiteturais Locais

- O módulo permanece estático, offline e executado integralmente no navegador.
- O módulo não é documento imprimível e não consome regras A4, PDF ou toolbar documental.
- O núcleo de transformação tabular foi promovido para a camada compartilhada por possuir potencial de reuso em futuras ferramentas.
- A saída CSV deve ser produzida em UTF-8 com BOM.
- Conflitos de consolidação de nomes devem permanecer rastreáveis e expostos ao usuário antes da exportação final.
- Arquivos gerados em `site/tools/bd/` e `dist/tools/bd/` são artefatos de build; a fonte canônica permanece em `src/tools/bd/`.
