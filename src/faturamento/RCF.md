# RCF - Relacao de Faturamento

## 1. Objetivo e Escopo

Modulo estatico para gerar a "RELACAO DE FATURAMENTO" oficial, editavel e imprimivel, com dados cadastrais da empresa, mes inicial do periodo, referencia derivada, faturamento mensal, totais, situacao dos meses, percentuais de recebimento, regime tributario e assinatura dos responsaveis.

O modelo visual oficial rege layout, organizacao, hierarquia, fluxo e experiencia. A planilha legada e apenas fonte historica de regras validas ja formalizadas aqui; nao pode ser motor de calculo, referencia arquitetural ou fonte normativa concorrente.

Inclui edicao Web, autosave, preenchimento JSON Base64, validacao, revisao A4 e impressao/PDF. Exclui backend, banco, autenticacao obrigatoria e regras contabeis, fiscais ou tributarias nao descritas neste RCF.

## 2. Documento Oficial

O impresso deve conter: titulo centralizado; Razao Social e CNPJ; destaques para Faturamento Bruto Anual e Mes/Ano de Referencia; secao "MERCADO INTERNO"; Percentual de Recebimento das Vendas a Prazo; Regime de Tributacao; local, data e area de assinatura; responsavel, cargo/papel e CPF; campo/titulo `COMITE`.

`COMITE` e a qualificacao `PROPRIETARIO/SOCIO/MANDATARIO` sao textos impressos fixos, nao campos editaveis.

## 3. Dados Cadastrais e Assinatura

A empresa deve ter Razao Social e CNPJ. Razao Social preserva o texto informado. CNPJ aceita entrada numerica ou formatada, armazena apenas digitos e apresenta mascara brasileira.

O documento aceita um ou mais assinantes, cada um com Nome e CPF. A interface inicia com um grupo obrigatorio Nome/CPF e permite adicionar/remover grupos extras. Nomes e CPFs consolidados usam `ou` como separador. CPF aceita entrada numerica ou formatada, armazena apenas digitos e apresenta mascara brasileira.

Localidade deve conter cidade e UF brasileira, aceitar variantes usuais como `Cidade/UF` ou `Cidade-UF`, normalizar espacos e apresentar `Cidade-UF`. UF deve ter duas letras e pertencer as unidades federativas brasileiras.

Data de assinatura inicia na data atual e pode ser alterada. Todas as regras temporais usam exclusivamente a data vigente no documento; o relogio do computador nao recalcula depois da definicao pelo usuario. A apresentacao e:

```text
Cidade-UF, dd de Mes de aaaa,
```

## 4. Periodo, Referencia e Situacao

A relacao sempre possui exatamente doze meses consecutivos, sem duplicidade, lacuna, excesso, falta ou desordem cronologica.

O usuario informa apenas o Mes inicial exibido na tabela, apresentado no formato `mm/aaaa`. A edicao deve aceitar entradas materialmente compativeis, com ou sem separadores usuais, como `102025`, `10-2025`, `10.2025` ou `10/2025`, e normalizar para `mm/aaaa` apos a edicao. Meses fora de 1 a 12 ou anos fora da faixa valida sao invalidos. Por padrao, esse mes corresponde ao mes da data de assinatura menos doze meses. O usuario pode altera-lo para iniciar a tabela em outro periodo; a alteracao regenera os doze meses e preserva a classificacao automatica.

O Mes/Ano de Referencia nao e campo editavel. Ele e valor derivado da data de assinatura e do ultimo mes classificado como `REALIZADO` na tabela. Quando nenhum mes da tabela estiver realizado, usa-se o ultimo mes encerrado antes do mes da data de assinatura como referencia deterministica de compatibilidade.

Cada mes tem situacao `REALIZADO` ou `PREVISTO`. Meses anteriores ao mes da data de assinatura sao `REALIZADO`; o mes da assinatura e meses posteriores sao `PREVISTO`. A classificacao e inteiramente automatica e nao pode ser editada manualmente.

## 5. Mercado Interno e Totais

A tabela de Mercado Interno contem, para cada mes: Mes/Ano, Vendas a Vista, Vendas a Prazo e Situacao Previsto/Realizado. Valores sao monetarios, nao negativos e apresentados em BRL.

Prazo Medio de Recebimento e campo unico, numerico e nao negativo. Na impressao aparece separado da tabela, sem repeticao por linha.

O Faturamento Bruto Anual e:

```text
Total de Vendas a Vista + Total de Vendas a Prazo
```

Totais exibidos devem corresponder exatamente a soma dos doze meses de cada coluna.

Na impressao, a tabela deve usar largura proporcional para Mes/Ano, Vendas a Vista, Vendas a Prazo e Situacao, comportando valores ate R$ 99.999.999,99 nas colunas monetarias. Para preservar largura, as linhas mensais e totais podem omitir o prefixo `R$` quando o cabecalho das colunas indicar `(R$)`.

A largura reduzida pela ausencia do prazo medio repetido deve liberar area lateral direita para Percentual de Recebimento, Regime de Tributacao e Prazo Medio, alinhados ao topo da tabela. Regime de Tributacao e Prazo Medio podem ser apresentados como blocos verticais chave/valor, em linhas, para evitar estouro horizontal. Valores de regime podem usar abreviacoes inequívocas, como `Simples Nac.` e `Lucro Pres.`.

## 6. Distribuicao, Edicao e Previsao

Quando o usuario informar apenas Faturamento Bruto Anual, o sistema pode distribuir automaticamente valores pelos doze meses. A distribuicao deve permitir percentual para Vendas a Vista e Vendas a Prazo, complementares e totalizando 100%, com padrao 100% a vista e 0% a prazo.

A distribuicao deve ser deterministica, reprodutivel, nao negativa, arredondada para centavos, reconciliada exatamente ao total anual e visualmente natural, sem aleatoriedade verdadeira nem crescimento perfeitamente linear quando houver variacao simulada. Cada parcela deve ter no maximo duas casas decimais, e a soma das parcelas exibidas deve corresponder exatamente ao valor total informado. A reconciliacao deve considerar simultaneamente Vendas a Vista e Vendas a Prazo para preservar o total anual, distribuindo residuos de centavos de forma deterministica e sem perdas acumuladas por arredondamento.

O usuario pode editar valores mensais. Havendo total anual de referencia, a edicao de um mes nao altera esse total; a diferenca e compensada nos meses elegiveis restantes. Meses alterados manualmente permanecem preservados ate desbloqueio ou redefinicao da distribuicao. Redistribuicao deve manter valores nao negativos e soma exata.

Por padrao, a distribuicao entre a vista e a prazo nao fica fixada: alteracoes manuais nos meses devem ser tratadas como indicio da composicao real, fazendo o sistema inferir novos percentuais globais a partir dos valores preservados e redistribuir o restante do total anual.

Quando o usuario marcar a opcao de fixar distribuicao, os percentuais globais informados passam a ser imposicao anual. Se uma coluna estiver com 0%, seus campos mensais devem ficar desabilitados e zerados. Se houver percentual limitado, a redistribuicao deve preservar o percentual anual imposto, sem exigir que cada mes siga a mesma proporcao; a divergencia mensal entre a vista e a prazo pode variar ate 40 pontos percentuais em relacao ao percentual global fixado.

Meses `PREVISTO` devem ter valores derivados automaticamente, salvo edicao manual explicita. Previsao de Vendas a Vista usa apenas dados dessa coluna; Vendas a Prazo usa apenas dados dessa coluna.

## 7. Percentuais e Regime

Percentual de Recebimento das Vendas a Prazo deve aceitar Cartoes, Cheques e Titulos, cada um entre 0% e 100%. Campos em branco usam padrao: Cartoes 40%, Cheques 30%, Titulos 30%. Soma obrigatoria, quando exigida por regra operacional, deve ser configuravel e validada explicitamente.

Regime de Tributacao e lista fechada inicial: MEI, Simples Nacional, Lucro Presumido e Lucro Real. O sistema deve invalidar ou impedir regimes incompativeis com Faturamento Bruto Anual. Limites iniciais: MEI ate R$ 81.000,00 anuais; Simples Nacional ate R$ 4.800.000,00 anuais. Lucro Presumido e Lucro Real nao possuem bloqueio automatico por esses limites, salvo regra futura neste RCF.

## 8. Parametrizacao e Autosave

O modulo deve aceitar preenchimento integral por JSON Base64 conforme RCF global. Chaves desconhecidas sao ignoradas sem interromper carregamento. Dados parametrizados passam pelas mesmas normalizacoes e validacoes da edicao manual.

No compartilhamento preenchido, o payload deve representar a relacao completa: empresa, assinantes, cidade/UF, data, mes inicial, mes de referencia derivado, distribuicao, periodo mensal, percentuais, regime, prazo medio e valores financeiros.

Autosave local deve preservar dados cadastrais, financeiros, mes inicial, periodo, classificacoes derivadas, percentuais, regime tributario, assinatura e Prazo Medio unico.

A exportacao local pela toolbar global deve usar envelope do modulo `faturamento`, schema `jcem.faturamento.v1` e payload equivalente ao compartilhamento preenchido. A importacao local deve validar modulo, schema e versao antes de aplicar dados, reutilizando os mesmos aliases e normalizacoes do JSON Base64. Arquivos de outros modulos devem ser recusados sem alterar o formulario.

## 9. Impressao, PDF e Interface

O impresso deve seguir o modelo visual oficial, priorizar fidelidade A4 e caber em uma pagina quando os conteudos estiverem dentro dos limites esperados. Impressao nativa e PDF dedicado, quando disponivel, devem ocultar interface Web, mensagens, alertas e ferramentas.

A interface Web nao precisa reproduzir exatamente a folha durante edicao. Deve priorizar produtividade, clareza, rapidez, validacao em tempo real, prevencao de inconsistencias e revisao visual fiel antes da impressao.

## 10. Fluxo Operacional

1. Usuario cria relacao, carrega autosave ou abre URL parametrizada.
2. Sistema normaliza dados, aplica valores iniciais seguros e mostra pendencias sem bloquear campos independentes.
3. Usuario preenche empresa, localidade, data, assinantes e textos.
4. Sistema valida dados comuns durante edicao e antes de imprimir.
5. Usuario confirma ou altera o Mes inicial; sistema gera doze meses, situacoes automaticas e totais coerentes.
6. Usuario informa total anual, valores mensais ou ambos; sistema distribui, redistribui e impede negativos, meses invalidos ou soma divergente.
7. Usuario revisa o A4, corrige pendencias e imprime/gera PDF.

## 11. Validacoes e Normalizacao

Erros obrigatorios: CNPJ invalido; CPF invalido; data invalida; Mes inicial invalido; UF invalida; periodo diferente de doze meses; meses duplicados, ausentes, nao consecutivos ou fora de ordem; valores negativos; percentuais fora de 0% a 100%; prazo medio negativo; total anual divergente; documento extrapolando A4 por conteudo fora dos limites esperados.

Normalizacoes: CNPJ/CPF para digitos no armazenamento e mascara na apresentacao; moeda BRL; percentual brasileiro; Mes/Ano compativel com ou sem separador para `mm/aaaa`; localidade `Cidade-UF`; espacos excedentes em textos livres.

Entradas invalidas nao devem corromper dados validos. Quando possivel, preservar o valor original para correcao e bloquear apenas consolidacao, impressao ou exportacao inconsistente.

## 12. Componentes e Reuso

O modulo deve reutilizar infraestrutura compartilhada para layout de workspace/preview/formularios, toolbar/acoes documentais, autosave, JSON Base64, impressao/PDF, separacao interface/area imprimivel, validadores, normalizadores, formatacao de datas/moedas/percentuais/documentos brasileiros, mensagens e estados de erro.

Layout de formulario externo, workspace, contraste da interface, tooltips, icones, separadores e botoes globais da toolbar pertencem a camada compartilhada. O CSS local deve permanecer restrito ao desenho interno da folha oficial e a detalhes semanticos especificos da Relacao de Faturamento.

Devem ser promovidas ou consumidas como compartilhadas as logicas reutilizaveis, incluindo validacao de Mes/Ano, geracao de doze meses, formatacao/arredondamento BRL, reconciliacao de centavos, validacao percentual, Cidade-UF e serializacao de formularios complexos.

Permanecem locais: semantica da Relacao de Faturamento, Mercado Interno, Faturamento Bruto Anual, distribuicao/redistribuicao mensal, classificacao vinculada a data de assinatura, referencia derivada, layout interno oficial da folha e regras de assinatura/apresentacao do responsavel.

## 13. Extensoes Permitidas

Novos mercados/categorias de receita, estrategias deterministicas de distribuicao, regras adicionais de percentuais e exportacoes futuras podem ser adicionados se preservarem a relacao atual, consistencia de dados, equivalencia visual e ausencia de dependencia obrigatoria de planilhas, com registro neste RCF.

## 14. UX e Acessibilidade

Campos editaveis devem ter rotulos claros, ordem de navegacao coerente e erros associados. Informacoes por cor tambem precisam de texto, icone, estado ou indicacao perceptivel.

Responsividade deve beneficiar edicao/revisao; a area imprimivel preserva medidas, hierarquia, proporcoes e paginacao. O usuario deve identificar rapidamente pendencias, mes inicial, meses realizados/previstos, valores editados manualmente, totais divergentes, estado do autosave e prontidao para impressao.

## 15. Invariantes e Aceitacao

Nunca violar: doze meses consecutivos; Mes/Ano de Referencia derivado e coerente com o ultimo realizado; situacao automatica pela data de assinatura; totais iguais a soma mensal; nenhum valor negativo; percentuais validos; CPF/CNPJ armazenados como digitos e apresentados com mascara; parametrizacao e edicao manual com mesmas validacoes; regra de negocio independente do layout; A4 oficial fiel.

Conformidade exige gerar a estrutura visual oficial, calcular corretamente totais, classificar meses, validar campos exigidos, autosalvar, aceitar JSON Base64 integral, reutilizar infraestrutura global, imprimir/PDF sem interface e evitar acoplamento entre negocio, edicao e impresso.

## 16. Arquitetura Local

```text
src/faturamento/
├── RCF.md
├── faturamento.css
├── faturamento.ts
├── index.html
└── regras.ts
```

O modulo permanece estatico e executado no navegador. Infraestrutura reutilizavel e compartilhada; regras especificas ficam neste RCF. A logica de calculo deve ser independente da renderizacao visual, e a impressao A4 fiel e requisito permanente.
