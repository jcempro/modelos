# RCF - Relacao de Faturamento

## Projeto

Modulo de Relacao de Faturamento.

## Objetivo

Gerar uma Relacao de Faturamento oficial, editavel e imprimivel, contendo dados cadastrais da empresa, periodo de referencia, faturamento mensal, totais, situacao dos meses, percentuais de recebimento, regime tributario e assinatura dos responsaveis.

O modelo visual oficial define layout, organizacao, hierarquia, fluxo e experiencia do usuario. A planilha legada serve apenas como referencia funcional para extracao de regras de negocio validas, calculos e comportamentos esperados.

## Escopo

- Aplicacao Web estatica para preenchimento e revisao da Relacao de Faturamento.
- Documento imprimivel em A4, preferencialmente em pagina unica.
- Edicao dos dados cadastrais, financeiros e de assinatura.
- Geracao de periodo com exatamente doze meses consecutivos.
- Calculo de totais, referencia mensal, situacao Previsto/Realizado e valores derivados.
- Validacao de CNPJ, CPF, datas, localidade, percentuais e valores monetarios.
- Uso da infraestrutura compartilhada do projeto para validacao, normalizacao, salvamento automatico, preenchimento parametrizado, impressao e PDF.

Ficam fora do escopo:

- Uso da planilha como motor interno de calculo.
- Backend, banco de dados ou autenticacao obrigatoria.
- Regras contabeis, fiscais ou tributarias nao explicitadas neste RCF.

## Regras de Negocio

### RN001 - Documento Oficial

O modulo deve produzir o documento "RELACAO DE FATURAMENTO" com a estrutura visual definida pelo modelo oficial:

- Titulo centralizado.
- Identificacao da empresa por Razao Social e CNPJ.
- Destaques para Faturamento Bruto Anual e Mes/Ano de Referencia.
- Secao "MERCADO INTERNO" com tabela mensal.
- Bloco de Percentual de Recebimento das Vendas a Prazo.
- Campo de Regime de Tributacao.
- Local, data e area de assinatura.
- Identificacao de responsavel, cargo/papel e CPF.
- Campo "COMITE".

### RN002 - Dados da Empresa

A empresa deve possuir, no minimo:

- Razao Social.
- CNPJ.

A Razao Social deve preservar o conteudo informado pelo usuario, sem transformacao semantica obrigatoria.

O CNPJ deve aceitar entrada numerica ou formatada, armazenar apenas digitos e apresentar mascara oficial brasileira.

### RN003 - Assinantes

O documento deve aceitar um ou mais assinantes.

Cada assinante deve possuir:

- Nome.
- CPF.

Quando houver multiplos assinantes, a apresentacao consolidada dos nomes deve usar `ou` como separador. A mesma regra se aplica aos CPFs.

O CPF deve aceitar entrada numerica ou formatada, armazenar apenas digitos e apresentar mascara oficial brasileira.

A interface deve iniciar com um unico grupo Nome/CPF e permitir adicionar ou remover grupos adicionais. O primeiro grupo e obrigatorio; grupos adicionados devem poder ser removidos.

A qualificacao `PROPRIETARIO/SOCIO/MANDATARIO` deve ser tratada como texto fixo do modelo impresso, nao como campo editavel.

### RN004 - Localidade de Assinatura

A localidade de assinatura deve conter cidade e UF brasileira.

A entrada pode aceitar variantes usuais como `Cidade/UF` ou `Cidade-UF`, desde que a apresentacao no documento siga o padrao visual oficial:

```text
Cidade-UF
```

Espacos excedentes devem ser normalizados. A UF deve conter duas letras e corresponder a uma unidade federativa brasileira.

### RN005 - Data de Assinatura

A data de assinatura deve assumir a data atual como valor inicial, mas pode ser alterada pelo usuario.

Todas as regras temporais do modulo devem usar exclusivamente a data de assinatura vigente no documento. O relogio do computador nao pode alterar calculos depois que a data de assinatura tiver sido definida pelo usuario.

A apresentacao da assinatura deve usar data por extenso em portugues do Brasil:

```text
Cidade-UF, dd de Mes de aaaa,
```

### RN006 - Periodo Mensal

A relacao deve trabalhar sempre com exatamente doze meses consecutivos.

O periodo padrao deve representar os doze meses encerrados no Mes/Ano de Referencia.

Nao pode haver:

- Menos de doze meses.
- Mais de doze meses.
- Meses duplicados.
- Lacunas entre meses.
- Meses fora de ordem cronologica.

### RN007 - Mes/Ano de Referencia

O Mes/Ano de Referencia representa o ultimo mes considerado realizado para a relacao.

Por padrao, ele deve corresponder ao ultimo mes encerrado antes do mes da data de assinatura.

O usuario pode alterar o Mes/Ano de Referencia quando a realidade do documento exigir. Toda alteracao deve regenerar o periodo de doze meses consecutivos e manter a consistencia da classificacao mensal.

### RN008 - Classificacao Previsto/Realizado

Cada mes deve possuir situacao:

- `REALIZADO`.
- `PREVISTO`.

Meses anteriores ou iguais ao Mes/Ano de Referencia devem ser classificados como `REALIZADO`.

Meses posteriores ao Mes/Ano de Referencia, quando existirem por escolha operacional do usuario, devem ser classificados como `PREVISTO`.

A classificacao manual pode existir, desde que nao viole a regra de que o Mes/Ano de Referencia representa o ultimo mes realizado.

### RN009 - Mercado Interno

A tabela de Mercado Interno deve conter, para cada um dos doze meses:

- Mes/Ano.
- Vendas a Vista.
- Vendas a Prazo.
- Situacao Previsto/Realizado.

Valores de venda devem ser monetarios, nao negativos e apresentados em BRL.

O Prazo Medio de Recebimento deve ser um campo unico do documento, numerico e nao negativo.

Na impressao, o Prazo Medio de Recebimento deve aparecer como informacao separada da tabela mensal, evitando repeticao linha a linha.

A tabela impressa deve priorizar largura proporcional para Mes/Ano, Vendas a Vista, Vendas a Prazo e Situacao, garantindo folga visual para valores monetarios em faixa de milhoes.

Na impressao, a tabela de Mercado Interno deve usar largura reduzida e proporcional ao seu conjunto atual de colunas. O espaco lateral direito liberado pela ausencia da coluna repetitiva de Prazo Medio deve ser ocupado pelo bloco de Percentual de Recebimento das Vendas a Prazo, Regime de Tributacao e Prazo Medio de Recebimento, mantendo alinhamento visual com o topo da tabela.

### RN010 - Faturamento Bruto Anual

O Faturamento Bruto Anual deve ser calculado por:

```text
Total de Vendas a Vista + Total de Vendas a Prazo
```

Os totais exibidos no documento devem corresponder exatamente a soma dos doze meses de cada coluna.

### RN011 - Distribuicao Inicial de Valores

Quando o usuario informar apenas o Faturamento Bruto Anual, o sistema pode distribuir automaticamente os valores pelos doze meses.

A distribuicao deve permitir definir o percentual do total destinado a Vendas a Vista e a Vendas a Prazo.

O padrao inicial deve ser:

- 100% para Vendas a Vista.
- 0% para Vendas a Prazo.

Os percentuais de distribuicao devem ser complementares e totalizar 100%.

A distribuicao automatica deve ser:

- Deterministica.
- Reprodutivel para a mesma entrada.
- Nao negativa.
- Arredondada para centavos.
- Exatamente reconciliada com o Faturamento Bruto Anual.
- Visualmente natural, evitando crescimento perfeitamente linear quando houver variacao simulada.

Aleatoriedade verdadeira nao deve ser usada.

O mesmo processo de distribuicao, compensacao, preservacao de edicoes manuais e reconciliacao de centavos deve existir tanto para Vendas a Vista quanto para Vendas a Prazo, sem misturar as duas colunas.

### RN012 - Edicao Manual e Redistribuicao

O usuario pode alterar valores mensais.

Quando houver valor anual de referencia informado, a alteracao manual de um mes nao deve alterar o Faturamento Bruto Anual. A diferenca deve ser compensada nos meses elegiveis restantes.

Meses alterados manualmente devem permanecer preservados ate que o usuario remova esse bloqueio ou redefina a distribuicao.

A redistribuicao deve manter valores nao negativos e reconciliar os centavos para que a soma final seja exata.

### RN013 - Meses Previstos

Quando existirem meses classificados como `PREVISTO`, seus valores devem ser derivados de forma automatica, salvo edicao manual explicita.

A previsao de Vendas a Vista deve usar apenas dados de Vendas a Vista.

A previsao de Vendas a Prazo deve usar apenas dados de Vendas a Prazo.

As duas colunas nao devem ser misturadas para calculo de medias, tendencias ou compensacoes.

### RN014 - Percentual de Recebimento das Vendas a Prazo

O documento deve permitir informar percentuais para:

- Cartoes.
- Cheques.
- Titulos.

Cada percentual deve aceitar apenas valor valido entre 0% e 100%.

Quando esses campos estiverem em branco, o documento deve aplicar os seguintes valores padrao:

- Cartoes: 40%.
- Cheques: 30%.
- Titulos: 30%.

Quando houver regra operacional exigindo totalizacao desses percentuais, a soma esperada deve ser configuravel no modulo e validada de forma explicita.

### RN015 - Regime de Tributacao

O Regime de Tributacao deve ser selecionado em lista fechada com opcoes brasileiras usuais.

As opcoes iniciais sao:

- MEI.
- Simples Nacional.
- Lucro Presumido.
- Lucro Real.

O sistema deve invalidar ou impedir selecao de regimes incompativeis com o Faturamento Bruto Anual informado.

Limites normativos iniciais do modulo:

- MEI permitido ate R$ 81.000,00 anuais.
- Simples Nacional permitido ate R$ 4.800.000,00 anuais.

Lucro Presumido e Lucro Real nao possuem bloqueio automatico por esses limites neste modulo, salvo regra futura documentada neste RCF.

### RN016 - Campo Comite

O campo `COMITE` deve existir no documento oficial conforme o modelo visual.

`COMITE` e apenas titulo impresso do documento, nao campo editavel.

### RN017 - Preenchimento Parametrizado

O modulo deve poder ser integralmente preenchido por JSON em Base64 recebido pela query string, conforme regra global do projeto.

Chaves desconhecidas devem ser ignoradas sem interromper o carregamento.

Dados parametrizados devem passar pelas mesmas normalizacoes e validacoes aplicadas a edicao manual.

Quando a acao global de compartilhamento for usada no modo preenchido, o payload do modulo deve representar a Relacao de Faturamento completa: empresa, assinantes, cidade/UF, data, mes de referencia, distribuicao, periodo mensal, percentuais, regime tributario, prazo medio e valores financeiros.

### RN018 - Salvamento Automatico

O modulo deve salvar automaticamente os dados durante a edicao, usando persistencia local do navegador.

O salvamento automatico deve preservar dados cadastrais, financeiros, periodo, classificacoes, percentuais, regime tributario e assinatura.

O salvamento automatico deve preservar o Prazo Medio de Recebimento unico do documento.

### RN019 - Impressao e PDF

O documento imprimivel deve seguir o modelo visual oficial e priorizar fidelidade A4.

A impressao deve funcionar por comando nativo do navegador e por acao dedicada de PDF quando disponivel.

Elementos de interface Web, mensagens, alertas e ferramentas nao devem aparecer na impressao nem no PDF.

O documento deve caber em uma pagina A4 sempre que os conteudos informados estiverem dentro dos limites esperados do modelo.

### RN020 - Interface Web

A interface Web nao precisa reproduzir exatamente a folha A4 durante a edicao.

Ela deve priorizar:

- Produtividade.
- Clareza.
- Rapidez de preenchimento.
- Validacao em tempo real.
- Prevencao de inconsistencias.
- Revisao visual do documento antes da impressao.

A visualizacao A4 deve permanecer disponivel como representacao fiel do documento final.

## Fluxo Operacional

### FL001 - Criacao ou Edicao

O usuario inicia uma relacao nova, carrega dados salvos automaticamente ou abre uma URL parametrizada.

O sistema deve normalizar os dados recebidos, aplicar valores iniciais seguros e apresentar pendencias sem bloquear campos independentes.

### FL002 - Dados Cadastrais

O usuario preenche Razao Social, CNPJ, localidade, data de assinatura, assinantes e demais campos textuais.

Validacoes comuns devem ocorrer durante a edicao e antes da impressao.

### FL003 - Periodo e Referencia

O usuario informa ou confirma o Mes/Ano de Referencia.

O sistema gera os doze meses consecutivos, define a classificacao de cada mes e mantem os totais coerentes.

### FL004 - Faturamento

O usuario informa o faturamento anual, valores mensais ou ambos.

O sistema calcula totais, distribui ou redistribui valores quando aplicavel e impede inconsistencias como valores negativos, meses ausentes ou soma divergente.

### FL005 - Revisao e Impressao

O usuario revisa o documento no layout A4, corrige pendencias e gera impressao ou PDF.

Antes da impressao, o sistema deve validar os invariantes obrigatorios e destacar pendencias relevantes.

## Validacoes

### VAL001 - Validacoes Obrigatorias

O modulo deve impedir ou destacar como erro:

- CNPJ invalido.
- CPF invalido.
- Data de assinatura invalida.
- Mes/Ano de Referencia invalido.
- UF invalida.
- Periodo diferente de doze meses.
- Meses duplicados ou nao consecutivos.
- Valores monetarios negativos.
- Percentuais fora de 0% a 100%.
- Prazo medio negativo.
- Total anual divergente da soma mensal.
- Documento que extrapole a pagina A4 por conteudo fora dos limites esperados.

### VAL002 - Normalizacao

O modulo deve normalizar:

- CNPJ para digitos no armazenamento e mascara oficial na apresentacao.
- CPF para digitos no armazenamento e mascara oficial na apresentacao.
- Valores monetarios para BRL.
- Percentuais para formato percentual brasileiro.
- Mes/Ano para `mm/aaaa`.
- Localidade para `Cidade-UF` na apresentacao.
- Espacos excedentes em textos livres.

### VAL003 - Erros Recuperaveis

Entradas invalidas nao devem corromper dados ja validos.

Quando possivel, o sistema deve preservar o valor original para correcao do usuario e impedir apenas a consolidacao, impressao ou exportacao inconsistente.

## Componentes e Reuso

### CR001 - Infraestrutura Compartilhada Obrigatoria

O modulo deve reutilizar a infraestrutura compartilhada do projeto para:

- Barra de ferramentas e acoes documentais.
- Salvamento automatico.
- Preenchimento por JSON Base64.
- Impressao e PDF.
- Separacao entre interface Web e area imprimivel.
- Validadores e normalizadores comuns.
- Formatacao de datas, moedas, percentuais e documentos brasileiros quando disponivel.
- Mensagens de validacao e estados de erro reutilizaveis.

### CR002 - Regras Promoviveis

Qualquer logica com potencial de uso por outros documentos deve ser promovida ou consumida como capacidade compartilhada.

Sao candidatos naturais a compartilhamento:

- Validacao de mes/ano.
- Geracao de doze meses consecutivos.
- Formatacao e arredondamento monetario em BRL.
- Reconciliacao de centavos.
- Validacao percentual.
- Normalizacao de Cidade-UF.
- Serializacao de formularios complexos para autosave e query string.

### CR003 - Componentes Especificos do Faturamento

Devem permanecer especificos deste modulo:

- Semantica da Relacao de Faturamento.
- Campos do Mercado Interno.
- Regras de Faturamento Bruto Anual.
- Distribuicao e redistribuicao mensal de faturamento.
- Classificacao Previsto/Realizado vinculada ao Mes/Ano de Referencia.
- Layout oficial da Relacao de Faturamento.
- Regras de assinatura e apresentacao do responsavel neste documento.

## Pontos de Extensao

### EXT001 - Novos Mercados

O modulo pode evoluir para incluir outros mercados ou categorias de receita, desde que preserve a Relacao de Faturamento atual e registre as novas regras neste RCF.

### EXT002 - Novas Estrategias de Distribuicao

Novas estrategias de distribuicao podem ser adicionadas se forem deterministicas, auditaveis e capazes de reconciliar exatamente o total anual.

### EXT003 - Regras de Percentuais

Regras adicionais para percentuais de recebimento podem ser configuradas, como soma obrigatoria, campos exigidos por regime ou bloqueios por tipo de venda, desde que documentadas neste RCF.

### EXT004 - Exportacoes Futuras

Exportacoes futuras devem preservar a consistencia dos dados e a equivalencia visual do documento oficial, sem introduzir dependencia obrigatoria de planilhas.

## Acessibilidade, Responsividade e Usabilidade

### UX001 - Acessibilidade

Campos editaveis devem possuir rotulos claros, ordem de navegacao coerente e mensagens de erro associadas ao campo correspondente.

Informacoes transmitidas por cor tambem devem possuir texto, icone, estado ou outra indicacao perceptivel.

### UX002 - Responsividade

A responsividade deve beneficiar a interface de edicao e revisao.

A area imprimivel deve preservar medidas, hierarquia, proporcoes e paginacao do documento oficial, conforme regra global.

### UX003 - Usabilidade

O usuario deve conseguir identificar rapidamente:

- Pendencias obrigatorias.
- Meses realizados e previstos.
- Valores editados manualmente.
- Totais divergentes.
- Estado do salvamento automatico.
- Prontidao para impressao.

## Restricoes e Premissas

### RP001 - Planilha Legada

A planilha legada nao deve ser usada como implementacao, motor de calculo, referencia arquitetural ou fonte normativa apos a definicao deste RCF.

Somente regras de negocio validas extraidas dela e formalizadas neste documento devem orientar a implementacao.

### RP002 - Modelo Visual

O modelo visual oficial tem prioridade sobre a planilha para layout, organizacao, hierarquia visual, fluxo e experiencia do usuario.

Quando houver divergencia entre planilha e modelo visual, o modelo visual prevalece para apresentacao.

Quando houver divergencia entre planilha e RCF global, o RCF global prevalece para arquitetura, infraestrutura compartilhada, impressao A4, parametrizacao, autosave e separacao de escopos.

### RP003 - Consistencia Permanente

As seguintes invariantes nunca devem ser violadas:

- Exatamente doze meses consecutivos.
- Mes/Ano de Referencia coerente com o ultimo mes realizado.
- Totais iguais a soma dos meses.
- Nenhum valor monetario negativo.
- Percentuais validos.
- CPF e CNPJ armazenados como digitos e apresentados com mascara.
- Dados parametrizados e dados editados manualmente seguem as mesmas validacoes.
- Logica de negocio independente do layout.
- Documento imprimivel fiel ao A4 oficial.

## Criterios de Aceitacao

O modulo sera considerado conforme quando:

- Gerar a Relacao de Faturamento com a estrutura visual oficial.
- Mantiver exatamente doze meses consecutivos.
- Calcular corretamente Faturamento Bruto Anual e totais por coluna.
- Classificar meses como Previsto ou Realizado de forma coerente com o Mes/Ano de Referencia.
- Validar CNPJ, CPF, datas, localidade, percentuais e valores monetarios.
- Preservar dados por salvamento automatico.
- Aceitar preenchimento integral por JSON Base64.
- Reutilizar infraestrutura compartilhada para recursos transversais.
- Imprimir ou gerar PDF A4 sem elementos de interface Web.
- Evitar acoplamento entre regras de negocio, interface de edicao e documento imprimivel.

## Decisoes Arquiteturais Locais

- O RCF deste modulo substitui a planilha legada como referencia normativa oficial.
- A planilha permanece apenas como fonte historica de regras funcionais ja formalizadas aqui.
- O modelo visual oficial prevalece para apresentacao e experiencia do usuario.
- O modulo deve permanecer estatico e executado no navegador, conforme arquitetura global do projeto.
- Toda infraestrutura reutilizavel deve ser compartilhada e nao acoplada ao faturamento.
- Regras especificas da Relacao de Faturamento devem permanecer neste RCF.
- A logica de calculo deve ser independente da renderizacao visual.
- A impressao A4 fiel e requisito funcional permanente deste modulo.
