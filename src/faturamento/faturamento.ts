import {
  addMonths,
  buildPeriodFromStart,
  classifyMonthBySignatureDate,
  compareMesAno,
  distributeCents,
  formatCurrencyFromCents,
  formatMesAno,
  formatPercent,
  isRegimeAllowed,
  MEI_LIMIT_CENTS,
  MONTHLY_DISTRIBUTION_TOLERANCE_PERCENT,
  normalizeCompanyFileBasename,
  parseCurrencyToCents,
  parseMesAno,
  parsePercent,
  referenceFromPeriodAndSignature,
  redistributeAnnualValues,
  SIMPLES_NACIONAL_LIMIT_CENTS,
  splitAnnualTargets,
  sumRows,
  type LinhaFaturamento,
  type MesAno
} from "./regras";

(function bootstrapFaturamento(w: Window): void {
  "use strict";

  const documentos = w.JCEMDocumentos;
  if (!documentos) {
    w.alert("Infraestrutura documental indisponivel.");
    return;
  }
  const api: JCEMDocumentosApi = documentos;

  const pageConfig: PageConfig = {
    bottom: 0.9,
    left: 0.9,
    right: 0.9,
    size: [21, 29.7],
    top: 1,
    unit: "cm"
  };

  const ufs = new Set([
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO"
  ]);

  const validation: ValidationConfig = {
    emptyFieldMessage: "Campo '${0}' vazio ou invalido",
    fieldRules: [
      { hint: "Razão Social", required: true, selector: "#razao-social" },
      { hint: "CNPJ", required: true, selector: "#cnpj", validator: "cnpj" },
      { hint: "Cidade", required: true, selector: "#cidade" },
      { hint: "UF", required: true, selector: "#uf", validate: validateUf },
      { hint: "Data de Assinatura", required: true, selector: "#data-assinatura" },
      { hint: "Mês inicial", required: true, selector: "#mes-inicial", validate: validateMesAno },
      { hint: "Faturamento Bruto Anual", required: false, selector: "#faturamento-alvo", validate: validateCurrency },
      { hint: "Distribuição à vista", required: true, selector: "#distribuicao-vista", validate: validatePercentField },
      { hint: "Distribuição a prazo", required: true, selector: "#distribuicao-prazo", validate: validatePercentField },
      { hint: "Valor monetário", required: false, selector: ".month-money", validate: validateCurrency },
      { hint: "Prazo médio", required: true, selector: "#prazo-medio", validate: validateNonNegativeInteger },
      { hint: "Percentual", required: false, selector: ".percent", validate: validatePercentField },
      { hint: "Nome do assinante", required: true, selector: "#assinante-1-nome" },
      { hint: "CPF do assinante", required: true, selector: "#assinante-1-cpf", validator: "cpf" },
      { hint: "CPF do assinante", required: false, selector: ".signer-cpf", validator: "cpf" }
    ]
  };

  let currentPeriodStart: MesAno | null = null;
  let currentSignatureMonth: MesAno | null = null;
  let isHydrating = false;
  let signerCount = 1;

  function validateCurrency(value: string): ValidationResult {
    const parsed = parseCurrencyToCents(value);
    return parsed === null ? -1 : formatCurrencyFromCents(parsed);
  }

  function validatePercentField(value: string): ValidationResult {
    const parsed = parsePercent(value);
    return parsed === null ? -1 : formatPercent(parsed);
  }

  function validateMesAno(value: string): ValidationResult {
    const parsed = parseMesAno(value);
    return parsed ? formatMesAno(parsed) : -1;
  }

  function validateUf(value: string): ValidationResult {
    const normalized = value.trim().toUpperCase();
    return ufs.has(normalized) ? normalized : -1;
  }

  function validateNonNegativeInteger(value: string): ValidationResult {
    const normalized = value.trim();
    if (!/^\d+$/.test(normalized)) {
      return -1;
    }

    return `${Number.parseInt(normalized, 10)}`;
  }

  function input(id: string): HTMLInputElement {
    const element = api.one<HTMLInputElement>(`#${id}`);
    if (!element) {
      throw new Error(`Campo obrigatorio ausente: ${id}`);
    }
    return element;
  }

  function checked(id: string): boolean {
    return input(id).checked;
  }

  function select(id: string): HTMLSelectElement {
    const element = api.one<HTMLSelectElement>(`#${id}`);
    if (!element) {
      throw new Error(`Campo obrigatorio ausente: ${id}`);
    }
    return element;
  }

  function text(id: string, value: string): void {
    const element = api.one<HTMLElement>(`#${id}`);
    if (element) {
      element.textContent = value;
    }
  }

  function todayIso(): string {
    const today = new Date();
    const month = `${today.getMonth() + 1}`.padStart(2, "0");
    const day = `${today.getDate()}`.padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
  }

  function dateFromInput(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year = "0", month = "1", day = "1"] = value.split("-");
      return new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10));
    }

    return new Date();
  }

  function formatDatePtBr(value: string): string {
    const date = dateFromInput(value);
    const day = `${date.getDate()}`.padStart(2, "0");
    const month = date.toLocaleString("pt-BR", { month: "long" });
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day} de ${monthName} de ${date.getFullYear()}`;
  }

  function signatureDate(): Date {
    return dateFromInput(input("data-assinatura").value || todayIso());
  }

  function defaultInitialMonth(): MesAno {
    return addMonths({ ano: signatureDate().getFullYear(), mes: signatureDate().getMonth() + 1 }, -12);
  }

  function initialMonth(): MesAno {
    return parseMesAno(input("mes-inicial").value) ?? defaultInitialMonth();
  }

  function currentPeriod(): MesAno[] {
    return buildPeriodFromStart(initialMonth());
  }

  function currentDerivedReference(): MesAno {
    return referenceFromPeriodAndSignature(currentPeriod(), signatureDate());
  }

  function setValue(id: string, value: string): void {
    const element = input(id);
    element.value = value;
    api.storage.setItem(id, value);
  }

  function normalizeDefaults(): void {
    if (!input("data-assinatura").value) {
      setValue("data-assinatura", todayIso());
    }

    if (!input("cidade").value) {
      setValue("cidade", "Pirassununga");
    }

    if (!input("uf").value) {
      setValue("uf", "SP");
    }

    if (!input("mes-inicial").value) {
      const previousReference = parseMesAno(api.storage.getItem("mes-referencia") ?? "");
      setValue("mes-inicial", formatMesAno(previousReference ? addMonths(previousReference, -11) : defaultInitialMonth()));
    }

    if (!input("distribuicao-vista").value) {
      setValue("distribuicao-vista", "100%");
    }

    if (!input("distribuicao-prazo").value) {
      setValue("distribuicao-prazo", "0%");
    }

    if (!input("prazo-medio").value) {
      setValue("prazo-medio", "45");
    }

    applyDefaultReceiptPercentages();
  }

  function restoreFixedDistribution(): void {
    const fixed = input("fixar-distribuicao");
    fixed.checked = api.storage.getItem("fixar-distribuicao") === "true";
  }

  function applyDefaultReceiptPercentages(): void {
    const defaults: Record<string, string> = {
      "percentual-cartoes": "40%",
      "percentual-cheques": "30%",
      "percentual-titulos": "30%"
    };

    for (const [id, value] of Object.entries(defaults)) {
      if (!input(id).value.trim()) {
        setValue(id, value);
      }
    }
  }

  function renderMonthRows(start: MesAno): void {
    const editor = api.one<HTMLTableSectionElement>("#editor-meses");
    const print = api.one<HTMLTableSectionElement>("#print-meses");

    if (!editor || !print) {
      return;
    }

    const months = buildPeriodFromStart(start);
    editor.innerHTML = "";
    print.innerHTML = "";

    months.forEach((month, index) => {
      const label = formatMesAno(month);
      const status = classifyMonthBySignatureDate(month, signatureDate());
      const editorRow = document.createElement("tr");
      editorRow.innerHTML = `
        <td class="month-label" data-month="${label}">${label}</td>
        <td><input id="mes-${index}-vista" class="money month-money" data-column="vista" type="text" inputmode="decimal"></td>
        <td><input id="mes-${index}-prazo" class="money month-money" data-column="prazo" type="text" inputmode="decimal"></td>
      `;
      editor.appendChild(editorRow);

      const printRow = document.createElement("tr");
      printRow.innerHTML = `
        <td data-print-month="${index}">${label}</td>
        <td data-print-vista="${index}">0,00</td>
        <td data-print-prazo="${index}">0,00</td>
        <td data-print-status="${index}">${status}</td>
      `;
      print.appendChild(printRow);
    });
  }

  function monthRows(): LinhaFaturamento[] {
    return api.$<HTMLTableRowElement>("#editor-meses tr").map((row) => {
      const monthText = row.querySelector<HTMLElement>("[data-month]")?.dataset.month ?? formatMesAno(initialMonth());
      const mesAno = parseMesAno(monthText) ?? initialMonth();
      const vista = parseCurrencyToCents(row.querySelector<HTMLInputElement>('[data-column="vista"]')?.value ?? "") ?? 0;
      const prazo = parseCurrencyToCents(row.querySelector<HTMLInputElement>('[data-column="prazo"]')?.value ?? "") ?? 0;
      const prazoMedio = Number.parseInt(input("prazo-medio").value || "45", 10);

      return {
        mesAno,
        prazoMedio: Number.isFinite(prazoMedio) && prazoMedio >= 0 ? prazoMedio : 0,
        situacao: classifyMonthBySignatureDate(mesAno, signatureDate()),
        vendasPrazo: prazo,
        vendasVista: vista
      };
    });
  }

  function signerInputs(selector: string): HTMLInputElement[] {
    return api.$<HTMLInputElement>(selector, api.one("#assinantes-lista") ?? document);
  }

  function joinedSignerValues(selector: string, prefix = ""): string {
    const values = signerInputs(selector)
      .map((element) => element.value.trim())
      .filter((value) => value.length > 0);

    return values.length > 0 ? `${prefix}${values.join(" ou ")}` : "";
  }

  function fixedSignerRole(): string {
    return "PROPRIETÁRIO/SÓCIO/MANDATÁRIO";
  }

  function formatMarketCurrency(value: number): string {
    return formatCurrencyFromCents(value).replace(/^R\$\s?/, "");
  }

  function abbreviatedRegime(value: string): string {
    const regimes: Record<string, string> = {
      "Lucro Presumido": "Lucro Pres.",
      "Lucro Real": "Lucro Real",
      "MEI": "MEI",
      "Simples": "Simples",
      "Simples Nacional": "Simples Nac."
    };

    return regimes[value] ?? value;
  }

  function renderPreview(): void {
    const rows = monthRows();
    const totals = sumRows(rows);
    const reference = referenceFromPeriodAndSignature(rows.map((row) => row.mesAno), signatureDate());
    const city = input("cidade").value.trim() || "Pirassununga";
    const uf = input("uf").value.trim().toUpperCase() || "SP";

    text("print-razao-social", input("razao-social").value);
    text("print-cnpj", input("cnpj").value);
    text("print-faturamento-anual", formatCurrencyFromCents(totals.brutoAnual));
    text("print-mes-referencia", formatMesAno(reference));
    text("print-total-vista", formatMarketCurrency(totals.vista));
    text("print-total-prazo", formatMarketCurrency(totals.prazo));
    text("print-cartoes", input("percentual-cartoes").value);
    text("print-cheques", input("percentual-cheques").value);
    text("print-titulos", input("percentual-titulos").value);
    text("print-regime", abbreviatedRegime(select("regime-tributacao").value));
    text("print-prazo-medio", input("prazo-medio").value || "45");
    text("print-cidade-uf", `${city}-${uf}`);
    text("print-data", formatDatePtBr(input("data-assinatura").value));
    text("print-assinantes", joinedSignerValues(".signer-name"));
    text("print-papel", fixedSignerRole());
    text("print-cpfs", joinedSignerValues(".signer-cpf", "CPF: "));

    rows.forEach((row, index) => {
      textBySelector(`[data-print-month="${index}"]`, formatMesAno(row.mesAno));
      textBySelector(`[data-print-vista="${index}"]`, formatMarketCurrency(row.vendasVista));
      textBySelector(`[data-print-prazo="${index}"]`, formatMarketCurrency(row.vendasPrazo));
      textBySelector(`[data-print-status="${index}"]`, row.situacao);
    });
    updateRegimeOptions();
  }

  function textBySelector(selector: string, value: string): void {
    const element = api.one<HTMLElement>(selector);
    if (element) {
      element.textContent = value;
    }
  }

  function refreshPeriodIfNeeded(): void {
    const start = initialMonth();
    const signedMonth = { ano: signatureDate().getFullYear(), mes: signatureDate().getMonth() + 1 };

    if (
      currentPeriodStart &&
      currentSignatureMonth &&
      compareMesAno(currentPeriodStart, start) === 0 &&
      compareMesAno(currentSignatureMonth, signedMonth) === 0
    ) {
      renderPreview();
      return;
    }

    currentPeriodStart = start;
    currentSignatureMonth = signedMonth;
    renderMonthRows(start);
    api.autosave.init({ selector: "#editor-meses input", validation });
    bindDynamicInputs();
    updateDistributionLockState();
    renderPreview();
  }

  function distributionVistaPercent(): number {
    const vista = parsePercent(input("distribuicao-vista").value);
    const prazo = parsePercent(input("distribuicao-prazo").value);

    if (vista === null && prazo === null) {
      return 100;
    }

    if (vista !== null && prazo !== null && Math.abs((vista + prazo) - 100) < 0.01) {
      return vista;
    }

    if (vista !== null) {
      return vista;
    }

    return Math.max(0, 100 - (prazo ?? 0));
  }

  function syncDistributionPercent(changed: "prazo" | "vista"): void {
    const vistaInput = input("distribuicao-vista");
    const prazoInput = input("distribuicao-prazo");
    const changedInput = changed === "vista" ? vistaInput : prazoInput;
    const parsed = parsePercent(changedInput.value);

    if (parsed === null) {
      return;
    }

    const complement = 100 - parsed;
    if (changed === "vista") {
      prazoInput.value = formatPercent(complement);
      api.storage.setItem(prazoInput.id, prazoInput.value);
    } else {
      vistaInput.value = formatPercent(complement);
      api.storage.setItem(vistaInput.id, vistaInput.value);
    }
  }

  function distributeAnnual(): void {
    const target = parseCurrencyToCents(input("faturamento-alvo").value);
    const status = api.one<HTMLElement>("#status-faturamento");

    if (target === null || target <= 0) {
      if (status) {
        status.textContent = "Informe um faturamento anual válido para distribuir.";
      }
      return;
    }

    const targets = splitAnnualTargets(target, distributionVistaPercent());
    const vistaValues = distributeCents(targets.vista, 12);
    const prazoValues = distributeCents(targets.prazo, 12);
    isHydrating = true;
    vistaValues.forEach((value, index) => {
      const vista = input(`mes-${index}-vista`);
      const prazo = input(`mes-${index}-prazo`);
      vista.value = formatCurrencyFromCents(value);
      prazo.value = formatCurrencyFromCents(prazoValues[index] ?? 0);
      setMonthlyLock(vista, false);
      setMonthlyLock(prazo, false);
      api.storage.setItem(vista.id, vista.value);
      api.storage.setItem(prazo.id, prazo.value);
    });
    isHydrating = false;
    updateDistributionLockState();

    if (status) {
      status.textContent = "";
    }
    updateRegimeOptions();
    renderPreview();
  }

  function normalizeMonthlyInput(element: HTMLInputElement): void {
    const result = validateCurrency(element.value);

    if (typeof result === "string") {
      element.value = result;
      api.storage.setItem(element.id, element.value);
    }
  }

  function lockStorageKey(element: HTMLInputElement): string {
    return `${element.id}:locked`;
  }

  function setMonthlyLock(element: HTMLInputElement, locked: boolean): void {
    if (locked) {
      element.dataset.locked = "true";
      api.storage.setItem(lockStorageKey(element), "true");
      return;
    }

    delete element.dataset.locked;
    api.storage.removeItem(lockStorageKey(element));
  }

  function restoreMonthlyLock(element: HTMLInputElement): void {
    if (api.storage.getItem(lockStorageKey(element)) === "true") {
      element.dataset.locked = "true";
    } else {
      delete element.dataset.locked;
    }
  }

  function isDistributionFixed(): boolean {
    return checked("fixar-distribuicao");
  }

  function setDistributionVistaPercent(value: number): void {
    const vistaInput = input("distribuicao-vista");
    const prazoInput = input("distribuicao-prazo");
    const normalized = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 100));
    vistaInput.value = formatPercent(normalized);
    prazoInput.value = formatPercent(100 - normalized);
    api.storage.setItem(vistaInput.id, vistaInput.value);
    api.storage.setItem(prazoInput.id, prazoInput.value);
  }

  function currentMonthlyRowsForRedistribution(): Array<{
    fixarPrazo: boolean;
    fixarVista: boolean;
    vendasPrazo: number;
    vendasVista: number;
  }> {
    return Array.from({ length: 12 }, (_item, index) => {
      const vista = input(`mes-${index}-vista`);
      const prazo = input(`mes-${index}-prazo`);
      return {
        fixarPrazo: prazo.dataset.locked === "true",
        fixarVista: vista.dataset.locked === "true",
        vendasPrazo: parseCurrencyToCents(prazo.value) ?? 0,
        vendasVista: parseCurrencyToCents(vista.value) ?? 0
      };
    });
  }

  function updateDistributionLockState(): void {
    const fixed = isDistributionFixed();
    const vistaPercent = distributionVistaPercent();
    const disableVista = fixed && vistaPercent <= 0.001;
    const disablePrazo = fixed && (100 - vistaPercent) <= 0.001;

    Array.from({ length: 12 }, (_item, index) => {
      const vista = input(`mes-${index}-vista`);
      const prazo = input(`mes-${index}-prazo`);
      for (const [element, disabled] of [[vista, disableVista], [prazo, disablePrazo]] as const) {
        element.disabled = disabled;
        if (disabled) {
          element.value = formatCurrencyFromCents(0);
          setMonthlyLock(element, false);
          api.storage.setItem(element.id, element.value);
        }
      }
    });
  }

  function applyRedistribution(
    result: ReturnType<typeof redistributeAnnualValues>,
    options: { updatePercent: boolean }
  ): void {
    isHydrating = true;
    result.linhas.forEach((row, index) => {
      const vista = input(`mes-${index}-vista`);
      const prazo = input(`mes-${index}-prazo`);
      vista.value = formatCurrencyFromCents(row.vendasVista);
      prazo.value = formatCurrencyFromCents(row.vendasPrazo);
      api.storage.setItem(vista.id, vista.value);
      api.storage.setItem(prazo.id, prazo.value);
    });
    isHydrating = false;

    if (options.updatePercent && !result.erro) {
      setDistributionVistaPercent(result.percentualVista);
    }
  }

  function reconcileAnnual(changed?: HTMLInputElement): void {
    const target = parseCurrencyToCents(input("faturamento-alvo").value);
    const status = api.one<HTMLElement>("#status-faturamento");

    if (target === null || target <= 0) {
      if (status) {
        status.textContent = "";
      }
      updateDistributionLockState();
      return;
    }

    if (changed && changed.disabled) {
      return;
    }

    if (changed) {
      setMonthlyLock(changed, true);
    }

    const fixed = isDistributionFixed();
    const result = redistributeAnnualValues(currentMonthlyRowsForRedistribution(), target, distributionVistaPercent(), fixed);
    applyRedistribution(result, { updatePercent: !fixed });
    updateDistributionLockState();
    if (status) {
      status.textContent = result.erro && fixed
        ? `${result.erro} No modo fixado, cada mês pode divergir até ${MONTHLY_DISTRIBUTION_TOLERANCE_PERCENT}% do percentual global.`
        : result.erro ?? "";
    }
    updateRegimeOptions();
  }

  function bindDynamicInputs(): void {
    api.$<HTMLInputElement>("#editor-meses input").forEach((element) => {
      restoreMonthlyLock(element);
      api.on(element, "input", () => {
        if (!isHydrating) {
          renderPreview();
        }
      });
      api.on(element, "blur", () => {
        if (element.classList.contains("month-money")) {
          normalizeMonthlyInput(element);
          reconcileAnnual(element);
        }
        renderPreview();
      });
    });
  }

  function signerCard(index: number): HTMLDivElement {
    const card = document.createElement("div");
    card.className = "signer-card";
    card.dataset.signerIndex = `${index}`;
    card.innerHTML = `
      <div class="signer-title">
        <span>${index === 1 ? "Assinante" : `Assinante ${index}`}</span>
        ${index > 1 ? `<button type="button" class="remove-signer" data-remove-signer="${index}">Remover</button>` : ""}
      </div>
      <label for="assinante-${index}-nome">Nome</label>
      <input id="assinante-${index}-nome" name="assinante${index}Nome" class="signer-name" type="text" ${index === 1 ? "required" : ""}>
      <label for="assinante-${index}-cpf">CPF</label>
      <input id="assinante-${index}-cpf" name="assinante${index}Cpf" class="signer-cpf" type="text" inputmode="numeric" ${index === 1 ? "required" : ""}>
    `;
    return card;
  }

  function bindSignerCard(card: Element): void {
    api.autosave.init({ root: card, selector: "input", validation });
    api.$<HTMLInputElement>("input", card).forEach((element) => {
      api.on(element, "input", renderPreview);
      api.on(element, "blur", renderPreview);
    });

    const removeButton = api.one<HTMLButtonElement>(".remove-signer", card);
    api.on(removeButton, "click", () => {
      const index = Number.parseInt(card.getAttribute("data-signer-index") || "0", 10);
      removeSigner(index);
    });
  }

  function restoreSigners(): void {
    const storedCount = Number.parseInt(api.storage.getItem("assinantesCount") || "1", 10);
    const count = Number.isFinite(storedCount) ? Math.max(1, Math.min(10, storedCount)) : 1;
    const list = api.one<HTMLElement>("#assinantes-lista");

    if (!list) {
      return;
    }

    list.innerHTML = "";
    for (let index = 1; index <= count; index += 1) {
      list.appendChild(signerCard(index));
    }
    signerCount = count;
    api.$<Element>(".signer-card", list).forEach(bindSignerCard);
  }

  function currentSigners(): Array<{ cpf: string; nome: string }> {
    return api.$<HTMLElement>(".signer-card", api.one("#assinantes-lista") ?? document).map((card) => ({
      cpf: api.one<HTMLInputElement>(".signer-cpf", card)?.value ?? "",
      nome: api.one<HTMLInputElement>(".signer-name", card)?.value ?? ""
    }));
  }

  function renderSignerValues(values: Array<{ cpf: string; nome: string }>): void {
    const list = api.one<HTMLElement>("#assinantes-lista");
    if (!list) {
      return;
    }

    api.$<HTMLInputElement>(".signer-name,.signer-cpf", list).forEach((element) => {
      api.storage.removeItem(element.id);
    });

    list.innerHTML = "";
    const safeValues = values.length > 0 ? values : [{ cpf: "", nome: "" }];
    safeValues.forEach((value, index) => {
      const number = index + 1;
      const card = signerCard(number);
      list.appendChild(card);
      const name = api.one<HTMLInputElement>(".signer-name", card);
      const cpf = api.one<HTMLInputElement>(".signer-cpf", card);
      if (name) {
        name.value = value.nome;
        api.storage.setItem(name.id, name.value);
      }
      if (cpf) {
        cpf.value = value.cpf;
        api.storage.setItem(cpf.id, cpf.value);
      }
      bindSignerCard(card);
    });

    signerCount = safeValues.length;
    api.storage.setItem("assinantesCount", `${signerCount}`);
  }

  function addSigner(): void {
    const list = api.one<HTMLElement>("#assinantes-lista");
    if (!list || signerCount >= 10) {
      return;
    }

    const values = currentSigners();
    values.push({ cpf: "", nome: "" });
    renderSignerValues(values);
    renderPreview();
  }

  function removeSigner(index: number): void {
    if (index <= 1) {
      return;
    }

    const values = currentSigners().filter((_item, itemIndex) => itemIndex !== index - 1);
    renderSignerValues(values);
    renderPreview();
  }

  function validateSigners(): boolean {
    const cards = api.$<HTMLElement>(".signer-card", api.one("#assinantes-lista") ?? document);
    const errors: string[] = [];

    cards.forEach((card, index) => {
      const name = api.one<HTMLInputElement>(".signer-name", card);
      const cpf = api.one<HTMLInputElement>(".signer-cpf", card);
      const filled = Boolean(name?.value.trim() || cpf?.value.trim());
      const required = index === 0 || filled;

      if (required && !name?.value.trim()) {
        errors.push(`Nome do assinante ${index + 1} vazio.`);
      }

      if (required && !cpf?.value.trim()) {
        errors.push(`CPF do assinante ${index + 1} vazio.`);
      }
    });

    if (errors.length > 0) {
      w.alert(errors.join("\r\n"));
      return false;
    }

    return true;
  }

  function clearForm(): void {
    if (!w.confirm("Limpar dados salvos deste formulário?")) {
      return;
    }

    api.$<HTMLInputElement>("#faturamento-app input").forEach((element) => {
      api.storage.removeItem(element.id);
      api.storage.removeItem(lockStorageKey(element));
      element.checked = false;
      element.value = "";
    });
    api.storage.removeItem("assinantesCount");
    api.storage.removeItem("mes-referencia");
    select("regime-tributacao").value = "";
    api.storage.removeItem("regime-tributacao");
    normalizeDefaults();
    refreshPeriodIfNeeded();
    updateDistributionLockState();
    renderPreview();
  }

  function updateRegimeOptions(): void {
    const annual = parseCurrencyToCents(input("faturamento-alvo").value);
    const regime = select("regime-tributacao");
    const status = api.one<HTMLElement>("#status-faturamento");

    api.$<HTMLOptionElement>("option", regime).forEach((option) => {
      if (!option.value) {
        return;
      }
      option.disabled = !isRegimeAllowed(option.value, annual);
    });

    if (regime.value && !isRegimeAllowed(regime.value, annual)) {
      const previous = regime.value;
      regime.value = "";
      api.storage.removeItem("regime-tributacao");
      if (status) {
        status.textContent = `${previous} não é permitido para o faturamento anual informado.`;
      }
    }
  }

  function validateRegime(): boolean {
    const annual = parseCurrencyToCents(input("faturamento-alvo").value);
    const regime = select("regime-tributacao").value;

    if (!isRegimeAllowed(regime, annual)) {
      w.alert(`Regime tributário incompatível com o faturamento anual informado.\n\nMEI: até ${formatCurrencyFromCents(MEI_LIMIT_CENTS)}.\nSimples Nacional: até ${formatCurrencyFromCents(SIMPLES_NACIONAL_LIMIT_CENTS)}.`);
      return false;
    }

    return true;
  }

  function payload(): Record<string, unknown> {
    return {
      assinantes: currentSigners(),
      cidade: input("cidade").value,
      cnpj: input("cnpj").value,
      dataAssinatura: input("data-assinatura").value,
      distribuicao: {
        fixar: input("fixar-distribuicao").checked,
        prazo: input("distribuicao-prazo").value,
        vista: input("distribuicao-vista").value
      },
      faturamentoBrutoAnual: input("faturamento-alvo").value,
      meses: monthRows().map((row, index) => ({
        mesAno: formatMesAno(row.mesAno),
        vendasPrazo: input(`mes-${index}-prazo`).value,
        vendasVista: input(`mes-${index}-vista`).value
      })),
      mesInicial: input("mes-inicial").value,
      mesReferencia: formatMesAno(currentDerivedReference()),
      percentuais: {
        cartoes: input("percentual-cartoes").value,
        cheques: input("percentual-cheques").value,
        titulos: input("percentual-titulos").value
      },
      prazoMedio: input("prazo-medio").value,
      razaoSocial: input("razao-social").value,
      regimeTributacao: select("regime-tributacao").value,
      uf: input("uf").value
    };
  }

  function assignIfPresent(id: string, value: unknown): void {
    if (typeof value !== "string" && typeof value !== "number") {
      return;
    }

    const element = api.one<HTMLInputElement>(`#${id}`);
    if (!element) {
      return;
    }

    element.value = `${value}`;
    api.storage.setItem(element.id, element.value);
  }

  function applyDataPayload(data: Record<string, unknown>): void {
    assignIfPresent("razao-social", data.razaoSocial ?? data.empresa ?? data.nomeEmpresa);
    assignIfPresent("cnpj", data.cnpj);
    assignIfPresent("cidade", data.cidade);
    assignIfPresent("uf", data.uf);
    assignIfPresent("data-assinatura", data.dataAssinatura);
    let periodAssigned = false;
    if (typeof data.mesInicial === "string" || typeof data.mesInicial === "number") {
      assignIfPresent("mes-inicial", data.mesInicial);
      periodAssigned = true;
    } else if (typeof data.mesReferencia === "string" || typeof data.mesReferencia === "number") {
      const legacyReference = parseMesAno(`${data.mesReferencia}`);
      if (legacyReference) {
        assignIfPresent("mes-inicial", formatMesAno(addMonths(legacyReference, -11)));
        periodAssigned = true;
      }
    }
    if (!periodAssigned && Array.isArray(data.meses) && isRecord(data.meses[0])) {
      assignIfPresent("mes-inicial", data.meses[0].mesAno);
      periodAssigned = true;
    }
    if (periodAssigned) {
      api.storage.removeItem("mes-referencia");
    }
    if (!parseMesAno(input("mes-inicial").value)) {
      setValue("mes-inicial", formatMesAno(defaultInitialMonth()));
    }
    assignIfPresent("faturamento-alvo", data.faturamentoBrutoAnual);
    assignIfPresent("prazo-medio", data.prazoMedio);

    if (typeof data.regimeTributacao === "string") {
      select("regime-tributacao").value = data.regimeTributacao;
      api.storage.setItem("regime-tributacao", data.regimeTributacao);
    }

    if (isRecord(data.distribuicao)) {
      assignIfPresent("distribuicao-vista", data.distribuicao.vista);
      assignIfPresent("distribuicao-prazo", data.distribuicao.prazo);
      if (typeof data.distribuicao.fixar === "boolean") {
        const fixed = input("fixar-distribuicao");
        fixed.checked = data.distribuicao.fixar;
        api.storage.setItem("fixar-distribuicao", `${fixed.checked}`);
      }
    }

    if (isRecord(data.percentuais)) {
      assignIfPresent("percentual-cartoes", data.percentuais.cartoes);
      assignIfPresent("percentual-cheques", data.percentuais.cheques);
      assignIfPresent("percentual-titulos", data.percentuais.titulos);
    }

    if (Array.isArray(data.assinantes)) {
      const signers = data.assinantes
        .filter(isRecord)
        .slice(0, 10)
        .map((item) => ({
          cpf: typeof item.cpf === "string" || typeof item.cpf === "number" ? `${item.cpf}` : "",
          nome: typeof item.nome === "string" || typeof item.nome === "number" ? `${item.nome}` : ""
        }));
      renderSignerValues(signers);
    }

    refreshPeriodIfNeeded();

    if (Array.isArray(data.meses)) {
      data.meses.slice(0, 12).forEach((item, index) => {
        if (!isRecord(item)) {
          return;
        }
        assignIfPresent(`mes-${index}-vista`, item.vendasVista);
        assignIfPresent(`mes-${index}-prazo`, item.vendasPrazo);
        if (!data.prazoMedio && index === 0) {
        assignIfPresent("prazo-medio", item.prazoMedio);
        }
      });
    }
  }

  function applyJsonPayload(): void {
    const data = api.query.json();
    if (!data) {
      return;
    }

    applyDataPayload(data);
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function filename(): string {
    return `${normalizeCompanyFileBasename(input("razao-social").value)}.pdf`;
  }

  function printPdf(): void {
    refreshPeriodIfNeeded();

    if (!api.validate.all({ selector: "#faturamento-app input", validation }) || !validateSigners() || !validateRegime()) {
      return;
    }

    api.print.pdf({
      filename,
      margin: [0, 0, 0, 0],
      pageConfig,
      source: inputDocument()
    });
  }

  function inputDocument(): Element {
    return api.one("#documento-faturamento") ?? document.documentElement;
  }

  function bindStaticInputs(): void {
    api.$<HTMLInputElement>("#faturamento-app input").forEach((element) => {
      api.on(element, "input", () => {
        if (element.id === "fixar-distribuicao") {
          api.storage.setItem("fixar-distribuicao", `${element.checked}`);
          updateDistributionLockState();
          reconcileAnnual();
          renderPreview();
          return;
        }
        if (element.id === "mes-inicial") {
          return;
        }
        if (element.id === "distribuicao-vista") {
          syncDistributionPercent("vista");
          updateDistributionLockState();
        }
        if (element.id === "distribuicao-prazo") {
          syncDistributionPercent("prazo");
          updateDistributionLockState();
        }
        if (element.id === "faturamento-alvo") {
          updateRegimeOptions();
        }
        renderPreview();
      });
      api.on(element, "blur", () => {
        if (element.id === "mes-inicial" || element.id === "data-assinatura") {
          refreshPeriodIfNeeded();
          return;
        }
        if (element.id === "faturamento-alvo") {
          updateRegimeOptions();
        }
        if (element.id === "distribuicao-vista" || element.id === "distribuicao-prazo") {
          updateDistributionLockState();
          if (isDistributionFixed()) {
            reconcileAnnual();
          }
        }
        renderPreview();
      });
    });

    const regime = select("regime-tributacao");
    regime.value = api.storage.getItem("regime-tributacao") ?? "";
    api.on(regime, "change", () => {
      api.storage.setItem("regime-tributacao", regime.value);
      updateRegimeOptions();
      renderPreview();
    });
  }

  api.ready(() => {
    const shareOptions: ShareOptions = {
      beforeShare: () => {
        refreshPeriodIfNeeded();
        renderPreview();
      },
      messages: {
        copiedClean: "Endereco limpo da relacao copiado para a area de transferencia.",
        copiedFilled: "Endereco da relacao preenchida copiado para a area de transferencia."
      },
      payload
    };

    api.toolbar.configure({
      actions: {
        clear: () => clearForm(),
        pdf: () => printPdf(),
        share: (event) => {
          void api.share.run(shareOptions, event);
        }
      },
      exportBasename: () => normalizeCompanyFileBasename(input("razao-social").value),
      exportPayload: payload,
      importPayload: (data) => {
        applyDataPayload(data);
        refreshPeriodIfNeeded();
        updateDistributionLockState();
        renderPreview();
      },
      moduleId: "faturamento",
      schema: "jcem.faturamento.v1",
      version: "1.0.0"
    });
    api.chrome.render({ actionsSelector: "[data-jcem-actions]", mountBefore: ".faturamento-shell" });
    api.layout.printable({
      document: "#documento-faturamento",
      forms: [{ placement: "external", selector: ".editor" }],
      preview: ".preview-wrap",
      workspace: ".faturamento-shell"
    });
    api.print.createPageStyle(pageConfig);
    api.autosave.indicator(".autosave");
    renderMonthRows(defaultInitialMonth());
    restoreSigners();
    api.autosave.init({ selector: "#faturamento-app input", validation });
    restoreFixedDistribution();
    normalizeDefaults();
    applyJsonPayload();
    refreshPeriodIfNeeded();
    updateDistributionLockState();
    bindStaticInputs();

    const distribute = api.one<HTMLButtonElement>("#distribuir-faturamento");
    api.on(distribute, "click", distributeAnnual);
    const addSignerButton = api.one<HTMLButtonElement>("#adicionar-assinante");
    api.on(addSignerButton, "click", addSigner);
    renderPreview();
  });
})(window);
