# RCF - Conversor Universal de Modelos CSV

## 1. Objetivo e Escopo

Ferramenta subordinada ao RCF global para conversao deterministica e bidirecional entre modelos tabulares, inicialmente CSV, preparada para futuros adaptadores como JSON, SQLite, IndexedDB ou bancos remotos sem alterar o nucleo.

O modulo e utilitario client-side, estatico, offline, sem finalidade documental, impressao A4 ou PDF. Deve consumir o layout institucional global, mas suas regras sao de transformacao de dados.

## 2. Principios Obrigatorios

- execucao integral no navegador, sem servidor obrigatorio;
- nucleo desacoplado de formato de armazenamento;
- modelo interno canonico usado entre importacao e exportacao;
- determinismo absoluto, rastreabilidade completa e ausencia de descarte silencioso;
- compatibilidade retroativa/futura, baixo acoplamento, alta coesao e extensibilidade;
- codificacao preventiva contra falhas, corrupcao, inconsistencias, duplicidade e expansao estrutural.

## 3. Entrada, Saida e CSV

A importacao deve aceitar CSV de RFC 4180, Excel, LibreOffice, Google Sheets e arquivos parcialmente inconsistentes quando recuperaveis. Deve detectar automaticamente UTF-8, UTF-8 com BOM, ANSI e demais codificacoes reconheciveis.

O parser deve detectar separador consistente, incluindo virgula, ponto e virgula, TAB, pipe e dois pontos, e suportar aspas simples/duplas, campos com ou sem aspas, separadores protegidos, quebras de linha internas, numeros textuais ou numericos, campos vazios e espacos opcionais conforme o dialeto.

Exportacao textual deve ser UTF-8 com BOM.

## 4. Colunas e Preservacao

Nomes de colunas sao case-insensitive e podem possuir aliases configuraveis. Colunas multiplas indexadas devem aceitar forma com espaco e compacta, como `Fone 2`/`Nome 2` e `Fone2`/`Nome2`, com mesma semantica.

Colunas desconhecidas nunca devem ser descartadas: entram no modelo interno e sao preservadas nas conversoes. A coluna local `id` e identificador operacional da origem, nao dado de dominio; deve ser ignorada por padrao e preservada apenas quando o usuario a marcar expressamente como identificador no conversor.

## 5. Campo Fone

`Fone`, em qualquer modelo, representa exclusivamente o identificador numerico do telefone. Antes de indexar, comparar, agregar, reconstruir, serializar ou persistir, deve conter somente digitos. O nucleo deve remover parenteses, espacos, hifens, `+`, separadores e equivalentes. Formatacao amigavel pertence apenas a apresentacao e nao pode ser gravada no CSV nem usada como chave logica.

## 6. Modelos

### Modelo 1 - Cliente

Cada linha representa um cliente. O identificador primario pode ser `MCI`, `CID` ou `MGI`, com prioridade/equivalencia configuraveis. A linha pode conter qualquer quantidade de pares correlacionados:

```text
Fone / Nome
Fone 2 / Nome 2
...
Fone n / Nome n
```

Cada `Nome n` descreve exclusivamente o `Fone n` correspondente. Nao ha limite estrutural para `n`. Outras colunas sao permitidas.

### Modelo 2 - Telefone

Cada linha representa exatamente um telefone. `Fone` normalizado e o unico indexador e a unica chave logica. `Nome` e o nome canonico consolidado daquele telefone e nao compoe chave.

O Modelo 2 deve conter no maximo um par `Fone`/`Nome` por linha e nunca pode criar varias linhas para o mesmo `Fone` por variacao de `Nome`. Colunas multiplas nele sao permitidas apenas para associacoes de clientes ou atributos equivalentes, por exemplo:

```text
MCI
MCI 2
...
MCI n
```

`Fone 2`, `Nome 2` ou equivalentes em entrada declarada/inferida como Modelo 2 devem ser canonicalizados em registros independentes, consolidados por `Fone` normalizado antes de conversao, serializacao ou persistencia. Outras colunas adicionais devem ser preservadas.

## 7. Conversoes

### Modelo 1 -> Modelo 2

Cada par `Fone`/`Nome` alimenta o registro identificado pelo `Fone` normalizado. Ocorrencias do mesmo telefone devem gerar um unico registro, agregando clientes associados sem duplicidade.

Variacoes de nome do mesmo telefone sao problema de consolidacao de dados, nao chave composta nem registros independentes. Exceto `Nome`, atributos adicionais pertencem conceitualmente ao cliente; quando replicados para acompanhar telefones, isso serve somente para preservar informacao e permitir reconstrucao futura, sem alterar sua semantica.

Se um telefone estiver ligado a varios clientes, todas as associacoes devem ser preservadas por colunas indexadas (`MCI`, `MCI 2`, ...), aplicando o mesmo principio a futuras colunas multiocorrencia. Colunas replicadas devem identificar explicitamente a ocorrencia para eliminar ambiguidade e permitir reconstrucao exata.

### Modelo 2 -> Modelo 1

Registros do mesmo cliente devem ser reconstruidos em uma unica linha com pares `Fone`/`Nome`, `Fone 2`/`Nome 2`, ..., de forma totalmente deterministica e sem perda de associacoes.

## 8. Cardinalidade e Integridade

O modelo deve suportar muitos-para-muitos: um cliente pode possuir varios telefones e um telefone pode estar associado a varios clientes. Nenhuma associacao, coluna adicional, valor desconhecido, relacionamento ou informacao recuperavel pode ser perdida.

## 9. Consolidacao de Nomes

Quando o mesmo `Fone` surgir com nomes diferentes, o sistema deve considerar variacoes possivelmente legitimas, como erro de digitacao, abreviacao, pronome de tratamento, diferenca ortografica ou nome incompleto.

A consolidacao automatica deve usar criterios deterministiscos. Se nao houver confianca suficiente, a interface deve solicitar decisao manual, preservar todas as alternativas, exigir confirmacao explicita e aplicar a escolha de forma consistente na operacao. A exportacao final permanece pendente enquanto nao houver consolidacao confiavel ou confirmada.

## 10. Inferencia de Direcao

O conversor deve inferir automaticamente o modelo da origem pela estrutura das colunas. Como ha apenas dois modelos vigentes, o destino deve ser sempre o outro modelo; origem e destino iguais sao proibidos pela interface e pelo nucleo.

A inferencia deve ocorrer tambem antes da conversao: ao selecionar arquivo e ao inserir, colar ou digitar CSV valido no campo de texto. Essa pre-inferencia deve ser assincrona, cancelavel e limitada ao necessario para reconhecer a estrutura, evitando travamento em digitacao, colagem ou arquivos grandes. A conversao final deve repetir a inferencia sobre os dados efetivamente processados.

## 11. Erros e Logs

Inconsistencias recuperaveis devem ser corrigidas automaticamente; quando impossivel, o usuario deve decidir. Nada pode ser descartado silenciosamente e toda inconsistencia deve permanecer rastreavel.

Logs da interface devem ser sucintos e continuamente atualizados, informando inicio, etapa, progresso, avisos, inconsistencias, decisoes pendentes, conclusao e falhas sem verbosidade excessiva.

Painel, titulo, itens de log, controles, resumos e decisoes devem acompanhar os temas claro e escuro do layout global com superfícies graduais e contraste explicito. Nenhuma superfície local fixa pode tornar texto, icone ou estado ilegivel ao alternar o tema.

## 12. Extensibilidade

Novos modelos, formatos, adaptadores, transformacoes, validadores e normalizadores devem ser adicionaveis sem alterar o nucleo. A implementacao nao deve assumir conhecimento fixo alem das regras deste RCF.

## 13. Arquitetura Local

```text
src/csv-bd/
├── RCF.md
├── bd.css
├── bd.ts
└── index.html
```

`src/csv-bd/RCF.md` e o contrato especifico vigente. `src/csv-bd/bd.ts` deve conter apenas integracao de interface, fluxo operacional, logs, decisoes do usuario e acionamento do nucleo compartilhado.

O modulo deve consumir `src/assets/js/tabular.ts` para deteccao/leitura de CSV, serializacao UTF-8 com BOM, modelo interno canonico, conversao deterministica, preservacao de colunas desconhecidas, rastreamento de inconsistencias e decisoes pendentes.

## 14. Decisoes Locais

- O modulo permanece estatico, offline e executado no navegador.
- O modulo nao possui salvamento automatico e deve declarar `autosave: false` ao chrome compartilhado, que omite o indicador global.
- Nao consome regras A4/PDF, mas usa cabecalho, barra extensivel e rodape globais. A toolbar deve manter visiveis as acoes de abrir CSV, baixar o CSV convertido, limpar e obter o Bundle offline, com icones e comportamento normalizados pela infraestrutura compartilhada.
- O nucleo tabular pertence a camada compartilhada por potencial de reuso.
- A saida CSV e sempre UTF-8 com BOM.
- Conflitos de nomes ficam rastreaveis e expostos antes da exportacao.
- Artefatos gerados em `dist/csv-bd/` nao sao fonte canonica.
