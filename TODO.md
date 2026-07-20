# LISTA DE TAREFAS (TO-DO) — DIRETRIZES DE IMPLEMENTAÇÃO E REGRAS DE NEGÓCIO

## 1. Padronização e Homologação de Linhas 'PREVISTO' (Cálculo de Médias por Coluna)
*   [ ] **Isolamento de Estado:** Garantir de forma imperativa que as linhas identificadas com o valor `"PREVISTO"` na coluna `"PREVISTO/REALIZADO"` fiquem totalmente imunes às oscilações e variações sazonais aplicadas às linhas do tipo `"REALIZADO"`.
*   [ ] **Cálculo de Média Contextualizada:** Implementar rotina para calcular a média aritmética simples de todos os registros preenchidos como `"REALIZADO"`, segregando estritamente os escopos de cada coluna de valor.
*   [ ] **Bloqueio de Contaminação Dinâmica:** Impedir sumariamente a mistura de conceitos contábeis:
    *   A média gerada sobre a coluna `"vendas à vista"` deve abastecer única e exclusivamente as células de `"vendas à vista"` das linhas `"PREVISTO"`.
    *   A média gerada sobre a coluna `"venda a prazo"` deve abastecer única e exclusivamente as células de `"venda a prazo"` das linhas `"PREVISTO"`.
*   [ ] **Injeção de Valores Constantes:** Aplicar o resultado das respectivas médias de forma arbitrária e rigorosamente idêntica (valor fixo e constante) em todas as linhas marcadas como `"PREVISTO"`.
*   [ ] **Garantia de Simetria Linear:** Validar que, para as linhas `"PREVISTO"`, os valores presentes em uma mesma coluna sejam sempre 100% iguais entre si ao longo de todos os meses projetados, sem exigir qualquer paridade ou igualdade de valores entre colunas distintas (ex: o valor constante de "à vista" pode diferir do valor constante de "à prazo").

## 2. Automação de Cronograma e Gatilhos de Data (Assinatura e Status Mensal)
*   [ ] **Gatilho para Meses Futuros ou Atual (`Mês Inicial` $\ge$ `Mês Corrente`):**
    *   [ ] Detectar se o parâmetro `"Mês Inicial"` fornecido é igual ou cronologicamente posterior ao mês atual do sistema.
    *   [ ] Injetar automaticamente o valor da `"data de assinatura"` para o **primeiro dia útil** do mês imediatamente posterior ao `"Mês Inicial"` selecionado.
    *   [ ] Forçar a marcação de status do `"Mês Inicial"` estritamente como `"Realizado"`.
    *   [ ] Classificar e marcar todos os meses subsequentes do cronograma obrigatoriamente como `"Previsto"`.
*   [ ] **Gatilho para Meses Passados (`Mês Inicial` $<$ `Mês Corrente`):**
    *   [ ] Detectar se o parâmetro `"Mês Inicial"` foi retroagido para um período anterior ao mês atual do sistema.
    *   [ ] Substituir e ajustar automaticamente a `"data de assinatura"` para refletir a **data atual (hoje)** em tempo real de execução.

## 3. Validação e Consistência (IA Crítica)
*   [ ] **Prevenção de Regressão Crítica:** Executar varredura lógica após qualquer alteração no formulário para garantir que nenhum cálculo de média utilize dados projetados (`"PREVISTO"`) como entrada, mantendo o fluxo estritamente unidirecional (`"REALIZADO"` $\rightarrow$ gera média $\rightarrow$ popula `"PREVISTO"`).
*   [ ] **Alinhamento de Roteamento Temporal:** Certificar-se de que os ajustes automáticos de data de assinatura disparem a atualização em cascata das regras descritas no bloco de cálculo de médias sem travar a interface do usuário (UI).
