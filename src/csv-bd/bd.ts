import {
  convertDataset,
  decodeTextBuffer,
  inferModelKind,
  oppositeModel,
  parseCsv,
  serializeCsv,
  type ConversionIssue,
  type ConversionResult,
  type NameDecision,
  type TabularDataset,
  type TabularModelKind
} from "../assets/js/tabular";

(function bootstrapBd(w: Window, d: Document): void {
  "use strict";

  let sourceDataset: TabularDataset | null = null;
  let currentResult: ConversionResult | null = null;
  const nameDecisions: Record<string, string> = {};

  function one<T extends Element = Element>(selector: string): T {
    const element = d.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Elemento obrigatorio ausente: ${selector}`);
    }
    return element;
  }

  function ready(handler: () => void): void {
    if (d.readyState === "loading") {
      d.addEventListener("DOMContentLoaded", handler);
      return;
    }
    handler();
  }

  function input(selector: string): HTMLInputElement {
    return one<HTMLInputElement>(selector);
  }

  function textarea(selector: string): HTMLTextAreaElement {
    return one<HTMLTextAreaElement>(selector);
  }

  function select(selector: string): HTMLSelectElement {
    return one<HTMLSelectElement>(selector);
  }

  function button(selector: string): HTMLButtonElement {
    return one<HTMLButtonElement>(selector);
  }

  function identifiers(): string[] {
    const values = input("#identifier-columns").value.split(",").map((value) => value.trim()).filter(Boolean);
    return values.length > 0 ? values : ["MCI", "CID", "MGI"];
  }

  function log(message: string, severity: ConversionIssue["severity"] = "info"): void {
    const item = d.createElement("li");
    item.className = severity;
    item.textContent = `[${new Date().toLocaleTimeString("pt-BR")}] ${message}`;
    one<HTMLOListElement>("#logs").appendChild(item);
    item.scrollIntoView({ block: "nearest" });
  }

  function clearLogs(): void {
    one<HTMLOListElement>("#logs").innerHTML = "";
  }

  function setOutput(value: string): void {
    textarea("#csv-output").value = value;
    button("#download").disabled = value.length === 0;
  }

  function updateSummary(source: string, target: string, dataset: TabularDataset | null): void {
    const cells = Array.from(one<HTMLElement>("#summary").querySelectorAll("span"));
    const values = [
      source,
      target,
      `${dataset?.rows.length ?? 0}`,
      `${dataset?.columns.length ?? 0}`
    ];

    cells.forEach((cell, index) => {
      cell.textContent = values[index] ?? "-";
    });
  }

  function readSourceText(): string {
    return textarea("#csv-text").value.trim();
  }

  function parseSource(): TabularDataset | null {
    const text = readSourceText();
    if (!text) {
      log("Nenhum CSV informado.", "error");
      return null;
    }

    try {
      const dataset = parseCsv(text);
      if (dataset.columns.length === 0) {
        log("CSV sem cabecalho identificavel.", "error");
        return null;
      }
      log(`CSV carregado: ${dataset.rows.length} linhas, ${dataset.columns.length} colunas, separador "${labelDelimiter(dataset.dialect.delimiter)}".`);
      return dataset;
    } catch (error) {
      log(error instanceof Error ? error.message : "Falha ao interpretar CSV.", "error");
      return null;
    }
  }

  function convert(): void {
    clearLogs();
    setOutput("");
    hideDecisions();
    log("Inicio da conversao.");

    sourceDataset = parseSource();
    if (!sourceDataset) {
      updateSummary("-", "-", null);
      return;
    }

    const from = inferModelKind(sourceDataset);
    const to = oppositeModel(from);
    select("#source-model").value = from;
    select("#target-model").value = to;
    log(`Modelo de origem inferido: ${modelLabel(from)}. Saida definida automaticamente: ${modelLabel(to)}.`);
    currentResult = convertDataset(sourceDataset, from, to, {
      identifierColumns: identifiers(),
      nameDecisions
    });

    for (const issue of currentResult.issues) {
      log(issue.message, issue.severity);
    }

    if (currentResult.issues.some((issue) => issue.severity === "error")) {
      setOutput("");
      updateSummary(from, to, null);
      log("Conversao interrompida por erro recuperavel.", "error");
      return;
    }

    if (currentResult.pendingNameDecisions.length > 0) {
      renderDecisions(currentResult.pendingNameDecisions);
      log("Existem divergencias de nome aguardando revisao do usuario.", "decision");
      setOutput("");
      updateSummary(from, to, null);
      log("Confirme os nomes canonicos antes de gerar o CSV final.", "decision");
      return;
    }

    const csv = serializeCsv(currentResult.dataset);
    setOutput(csv);
    updateSummary(from, to, currentResult.dataset);
    log(`Conclusao: ${currentResult.dataset.rows.length} linhas exportaveis em UTF-8 com BOM.`);
  }

  function labelDelimiter(value: string): string {
    if (value === "\t") {
      return "TAB";
    }
    return value;
  }

  function modelLabel(value: TabularModelKind): string {
    return value === "modelo1" ? "Modelo 1" : "Modelo 2";
  }

  function renderDecisions(decisions: NameDecision[]): void {
    const container = one<HTMLElement>("#decisions");
    container.innerHTML = "<strong>Consolidacao de nomes</strong>";
    container.hidden = false;

    decisions.forEach((decision) => {
      const row = d.createElement("div");
      row.className = "decision-row";
      const label = d.createElement("strong");
      label.textContent = decision.phone;
      const chooser = d.createElement("select");
      chooser.dataset.phone = decision.phone;
      decision.candidates.forEach((candidate) => {
        const option = d.createElement("option");
        option.value = candidate;
        option.textContent = candidate;
        option.selected = candidate === (nameDecisions[decision.phone] ?? decision.chosenName);
        chooser.appendChild(option);
      });
      row.append(label, chooser);
      container.appendChild(row);
    });

    const actions = d.createElement("div");
    actions.className = "decision-actions";
    const apply = d.createElement("button");
    apply.type = "button";
    apply.textContent = "Confirmar nomes";
    apply.addEventListener("click", () => {
      const choices = Array.from(container.querySelectorAll<HTMLSelectElement>("select[data-phone]"));
      choices.forEach((choice) => {
        const phone = choice.dataset.phone ?? "";
        if (phone && choice.value.trim()) {
          nameDecisions[phone] = choice.value;
        }
      });
      log("Escolhas de nomes aplicadas.");
      convert();
    });
    actions.appendChild(apply);
    container.appendChild(actions);
  }

  function hideDecisions(): void {
    const container = one<HTMLElement>("#decisions");
    container.hidden = true;
    container.innerHTML = "";
  }

  async function loadFile(file: File): Promise<void> {
    clearLogs();
    setOutput("");
    hideDecisions();
    log(`Lendo arquivo ${file.name}.`);
    const decoded = decodeTextBuffer(await file.arrayBuffer());
    textarea("#csv-text").value = decoded.text;
    log(`Codificacao detectada: ${decoded.dialect.encoding}.`);
  }

  function clearAll(): void {
    sourceDataset = null;
    currentResult = null;
    for (const key of Object.keys(nameDecisions)) {
      delete nameDecisions[key];
    }
    textarea("#csv-text").value = "";
    setOutput("");
    select("#source-model").value = "modelo1";
    select("#target-model").value = "modelo2";
    updateSummary("-", "-", null);
    hideDecisions();
    clearLogs();
    log("Estado limpo.");
  }

  function downloadCsv(): void {
    const content = textarea("#csv-output").value;
    if (!content || !currentResult) {
      log("Nao ha CSV convertido para baixar.", "warning");
      return;
    }

    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = d.createElement("a");
    link.href = url;
    link.download = `modelo-convertido-${new Date().toISOString().slice(0, 10)}.csv`;
    d.body.appendChild(link);
    link.click();
    d.body.removeChild(link);
    URL.revokeObjectURL(url);
    log("Arquivo CSV preparado para download.");
  }

  async function copyLog(): Promise<void> {
    const text = Array.from(one<HTMLOListElement>("#logs").querySelectorAll("li")).map((item) => item.textContent ?? "").join("\n");
    try {
      await w.navigator.clipboard.writeText(text);
      log("Logs copiados para a area de transferencia.");
    } catch (_error) {
      log("Nao foi possivel copiar os logs.", "warning");
    }
  }

  ready(() => {
    const shared = w.JCEMDocumentos;
    shared?.chrome.render({ actionsSelector: "[data-jcem-actions]", mountBefore: ".bd-app" });
    shared?.bundle.bindDownload();

    input("#csv-file").addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.files?.[0]) {
        return;
      }
      void loadFile(target.files[0]);
    });
    button("#convert").addEventListener("click", convert);
    button("#clear").addEventListener("click", clearAll);
    button("#download").addEventListener("click", downloadCsv);
    button("#copy-log").addEventListener("click", () => void copyLog());
    log("Ferramenta pronta para conversao local.");
  });
})(window, document);
