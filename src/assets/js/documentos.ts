(function bootstrapDocumentos(w: Window, d: Document): void {
  "use strict";

  const storage = w.localStorage;
  const placeholders = new WeakMap<HTMLInputElement, string | null>();

  function $<T extends Element = Element>(selector: string, root: ParentNode = d): T[] {
    return Array.from(root.querySelectorAll<T>(selector));
  }

  function one<T extends Element = Element>(selector: string, root: ParentNode = d): T | null {
    return root.querySelector<T>(selector);
  }

  function attr(element: Element | null, key: string, value?: string): string | true | undefined | Element {
    if (!element) {
      return undefined;
    }

    if (typeof value !== "undefined") {
      element.setAttribute(key, value);
      return element;
    }

    if (!element.hasAttribute(key)) {
      return undefined;
    }

    const result = element.getAttribute(key);
    return result ? result : true;
  }

  function on(element: EventTarget | null, eventName: string, handler: EventListenerOrEventListenerObject): void {
    element?.addEventListener(eventName, handler);
  }

  function ready(handler: () => void): void {
    if (["interactive", "complete"].includes(d.readyState)) {
      w.setTimeout(handler, 50);
      return;
    }

    on(d, "DOMContentLoaded", handler);
  }

  function digits(value: string): string {
    return (value || "").replace(/[^\d]/g, "");
  }

  function strip(value: string, pattern: RegExp): string {
    return (value || "").replace(pattern, "");
  }

  function capitalizeFirst(value: string): string {
    return value ? value.charAt(0).toUpperCase() + value.substring(1) : "";
  }

  function mod11(number: string, multipliers: string | number[], rawRemainder = false): number {
    let index = 0;
    const list = typeof multipliers === "string" ? multipliers.split("").map(Number) : multipliers;
    const remainder = `${number}`.split("").reduce((sum, digit) => {
      if (index > list.length - 1) {
        index = 0;
      }

      const multiplier = list[index++] ?? 0;
      return (multiplier * parseInt(digit, 10)) + sum;
    }, 0) % 11;

    return rawRemainder ? remainder : ((11 - remainder) >= 10) ? 0 : (11 - remainder);
  }

  function formatCep(value: string): ValidationResult {
    const cleaned = digits(value);
    if (cleaned.length !== 8) {
      return -1;
    }

    return `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}-${cleaned.substring(5)}`;
  }

  function formatCurrency(value: string): ValidationResult {
    const cleaned = (value || "").replace(/[^\d,]/g, "").replace(/[,]/g, ".");

    if (cleaned.trim().length === 0) {
      return -1;
    }

    const parsed = Number.parseFloat(cleaned);
    if (Number.isNaN(parsed)) {
      return -1;
    }

    return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(parsed);
  }

  function formatMobile(value: string): ValidationResult {
    const cleaned = digits(value);

    if (cleaned.length !== 11 || cleaned[2] !== "9" || Number.parseInt(cleaned.substring(0, 2), 10) < 11) {
      return -1;
    }

    return `(${cleaned.substring(0, 2)}) ${cleaned[2]} ${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
  }

  function formatPhone(value: string): ValidationResult {
    const cleaned = digits(value);

    if (cleaned.length !== 10 || Number.parseInt(cleaned.substring(0, 2), 10) < 11) {
      return -1;
    }

    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }

  function formatCnpj(value: string): ValidationResult {
    let cleaned = digits(value);

    if (cleaned.length > 14 || cleaned.length < 3) {
      return -1;
    }

    cleaned = cleaned.padStart(14, "0");
    const base = cleaned.substring(0, 12);

    if (Number(cleaned[12]) !== mod11(base, "543298765432")) {
      return -1;
    }

    if (Number(cleaned[13]) !== mod11(base + cleaned[12], "6543298765432")) {
      return -1;
    }

    return `${cleaned[0]}${cleaned[1]}.${cleaned[2]}${cleaned[3]}${cleaned[4]}.${cleaned[5]}${cleaned[6]}${cleaned[7]}/${cleaned[8]}${cleaned[9]}${cleaned[10]}${cleaned[11]}-${cleaned[12]}${cleaned[13]}`;
  }

  function formatCpf(value: string): ValidationResult {
    const cleaned = digits(value).padStart(11, "0");

    if (cleaned.length !== 11) {
      return -1;
    }

    const base = cleaned.substring(0, 9);

    if (Number(cleaned[9]) !== mod11(base, [10, 9, 8, 7, 6, 5, 4, 3, 2])) {
      return -1;
    }

    if (Number(cleaned[10]) !== mod11(base + cleaned[9], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])) {
      return -1;
    }

    return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-${cleaned[9]}${cleaned[10]}`;
  }

  const validatorCatalog: Record<string, ValidatorFn> = {
    cel: formatMobile,
    celular: formatMobile,
    cep: formatCep,
    cnpj: formatCnpj,
    cpf: formatCpf,
    currency: formatCurrency,
    mobile: formatMobile,
    moeda: formatCurrency,
    phone: formatPhone,
    tel: formatPhone,
    telefone: formatPhone
  };

  function decodeBase64(value: string): string {
    if (!value) {
      return "";
    }

    try {
      return decodeURIComponent(Array.from(w.atob(value), (char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`).join(""));
    } catch (_error) {
      try {
        return w.atob(value);
      } catch (_ignore) {
        return "";
      }
    }
  }

  function encodeBase64(value: string): string {
    try {
      return w.btoa(unescape(encodeURIComponent(value || "")));
    } catch (_error) {
      return w.btoa(value || "");
    }
  }

  function getQueryValue(names: string | string[]): string {
    const params = new URLSearchParams(w.location.search);
    const list = Array.isArray(names) ? names : [names];

    for (const name of list) {
      const value = params.get(name)?.trim();
      if (value) {
        return value;
      }
    }

    return "";
  }

  function readJsonPayload(names: string[] = ["data", "json", "payload"]): Record<string, unknown> | null {
    const raw = getQueryValue(names);

    if (!raw) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(decodeBase64(raw));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch (_error) {
      return null;
    }
  }

  function getFieldRule(input: HTMLInputElement, config: ValidationConfig = {}): FieldRule {
    if (input.id && config.fields?.[input.id]) {
      return config.fields[input.id] ?? {};
    }

    const rules = config.fieldRules ?? config.rules ?? [];
    return rules.find((rule) => rule.selector && input.matches(rule.selector)) ?? {};
  }

  function fieldWarning(input: HTMLInputElement, config: ValidationConfig, rule: FieldRule): string {
    if (rule.message) {
      return rule.message;
    }

    const hint = rule.hint ?? (attr(input, "hint") as string | undefined);
    if (hint) {
      return (config.emptyFieldMessage ?? "Campo '${0}' vazio ou invalido").replace(/\$\{0\}/g, hint);
    }

    if (input.id && config.messages?.[input.id]) {
      return config.messages[input.id] ?? "Campo invalido";
    }

    return "Campo invalido";
  }

  function resolveValidator(input: HTMLInputElement, config: ValidationConfig, rule: FieldRule): ValidatorFn | null {
    const type = `${rule.type ?? rule.validator ?? attr(input, "type") ?? "text"}`.toLowerCase();

    if (typeof rule.validate === "function") {
      return rule.validate;
    }

    if (rule.validate === false || rule.validator === false) {
      return null;
    }

    if (typeof rule.validator === "function") {
      return rule.validator;
    }

    if (typeof rule.validator === "string" && validatorCatalog[rule.validator.toLowerCase()]) {
      return validatorCatalog[rule.validator.toLowerCase()] ?? null;
    }

    if (input.id && config.customValidators?.[input.id]) {
      return config.customValidators[input.id] ?? null;
    }

    return validatorCatalog[type] ?? (input.id ? validatorCatalog[input.id] ?? null : null);
  }

  function validateAndNormalize(input: HTMLInputElement, shouldNormalize: boolean, config: ValidationConfig = {}, onlyAttribute: string | null = null): ValidationResult {
    if (attr(input, "type") === "file") {
      return 0;
    }

    if (onlyAttribute && !attr(input, onlyAttribute)) {
      return 0;
    }

    const rule = getFieldRule(input, config);
    const message = fieldWarning(input, config, rule);
    const required = typeof rule.required === "boolean" ? rule.required : !!attr(input, "required");
    const formatter = resolveValidator(input, config, rule);

    if (formatter) {
      if (input.value.trim().length === 0 && !required) {
        return 0;
      }

      const result = formatter(input.value);
      if (typeof result === "string" && result.length > 0) {
        if (shouldNormalize) {
          input.value = result;
        }
        return 0;
      }

      return required || input.value.trim().length > 0 ? message : -1;
    }

    if (input.value.trim().length === 0 && required) {
      return message;
    }

    const pattern = rule.pattern ?? (attr(input, "pattern") as string | undefined);
    if (input.value.length > 0 && pattern && !(new RegExp(pattern, "i")).test(input.value)) {
      return message;
    }

    if (rule.uppercase || (config.uppercaseFields ?? []).includes(input.id)) {
      input.value = input.value.toUpperCase();
    }

    return 0;
  }

  function validateInputs(options: ValidateAllOptions = {}): boolean {
    const inputs = $<HTMLInputElement>(options.selector ?? "input", options.root);
    const errors: string[] = [];

    for (const input of inputs) {
      if (options.onlyAttribute && !attr(input, options.onlyAttribute)) {
        continue;
      }

      const result = validateAndNormalize(input, false, options.validation ?? {}, options.onlyAttribute ?? null);
      if (typeof result === "string") {
        errors.push(result);
      }
    }

    if (errors.length > 0) {
      w.alert(errors.join("\r\n"));
      return false;
    }

    return true;
  }

  function initAutosave(options: AutosaveOptions = {}): void {
    const inputs = $<HTMLInputElement>(options.selector ?? "input", options.root);
    const store = options.storage ?? storage;
    const validation = options.validation ?? {};
    const idPrefix = options.idPrefix ?? "i";

    inputs.forEach((input, index) => {
      if (attr(input, "type") === "file") {
        return;
      }

      if (!input.id || input.id.length < 2) {
        input.id = `${idPrefix}${index}`;
      }

      input.value = store.getItem(input.id) ?? "";

      for (const eventName of ["blur", "keyup", "input"]) {
        on(input, eventName, (event) => {
          if ("tratando" in input && input.tratando === true) {
            return;
          }

          input.tratando = true;
          const shouldNormalize = event.type === "blur";
          const result = validateAndNormalize(input, shouldNormalize, validation);

          w.setTimeout(() => {
            input.tratando = false;
          }, 100);

          if (result) {
            if (!shouldNormalize) {
              return;
            }
            if (input.value.trim().length > 0 && shouldNormalize && typeof result === "string") {
              w.alert(result);
            }
            input.value = "";
            store.removeItem(input.id);
            return;
          }

          store.setItem(input.id, input.value);
        });
      }
    });
  }

  function initAutosaveIndicator(selector = ".autosave"): void {
    const indicator = one<HTMLElement>(selector);

    if (!indicator) {
      return;
    }
    const indicatorElement = indicator;

    function tick(state: 0 | 1): void {
      indicatorElement.className = indicatorElement.className.replace(/( |^)save2? ?/i, "");
      indicatorElement.className += state ? " save" : " save2";
      w.setTimeout(() => tick(state ? 0 : 1), 600);
    }

    tick(0);
  }

  function clearAutoFields(options: ClearFieldsOptions = {}): void {
    const inputs = $<HTMLInputElement>(options.selector ?? "input", options.root);
    const pattern = options.idPattern ?? /^i\d+$/i;

    for (const input of inputs) {
      if (input.id && pattern.test(input.id)) {
        input.value = "";
        if (options.removeStorage !== false) {
          (options.storage ?? storage).removeItem(input.id);
        }
      }
    }
  }

  function createPageStyle(pageConfig: PageConfig): void {
    const style = d.createElement("style");
    const [width, height] = pageConfig.size;
    const unit = pageConfig.unit;

    style.textContent = `@page{size:${width}${unit} ${height}${unit};margin-left:${pageConfig.left}${unit};margin-right:${pageConfig.right}${unit};margin-top:${pageConfig.top}${unit};margin-bottom:${pageConfig.bottom}${unit};}`;
    style.textContent += `*{max-width:calc(${width}${unit} - ${pageConfig.left + pageConfig.right}${unit});}`;
    d.head.appendChild(style);
  }

  function withPrintMode(callback: (restore: () => void) => void, options: PrintModeOptions = {}): void {
    const previousClass = d.body.className;
    const inputs = $<HTMLInputElement>("input");

    d.body.className = `${previousClass ? `${previousClass} ` : ""}${options.printClass ?? "imprimir"}`;

    for (const input of inputs) {
      placeholders.set(input, input.getAttribute("placeholder"));
      input.removeAttribute("placeholder");
    }

    callback(() => {
      for (const input of inputs) {
        const placeholder = placeholders.get(input);
        if (placeholder !== undefined && placeholder !== null) {
          input.setAttribute("placeholder", placeholder);
        }
      }

      d.body.className = previousClass;
    });
  }

  function printPdf(options: PrintPdfOptions): void {
    const html2pdf = w.html2pdf;

    if (!html2pdf) {
      w.alert("Gerador de PDF indisponivel.");
      return;
    }

    withPrintMode((restore) => {
      w.setTimeout(() => {
        let filename = typeof options.filename === "function" ? options.filename() : options.filename;
        filename = filename || "documento.pdf";

        if (!/\.pdf$/i.test(filename)) {
          filename += ".pdf";
        }

        html2pdf(options.source ?? d.documentElement, {
          filename,
          html2canvas: { scale: options.scale ?? 6 },
          image: { quality: 0.98, type: "jpeg" },
          jsPDF: { format: options.pageConfig.size, orientation: options.orientation ?? "portrait", unit: options.pageConfig.unit },
          margin: [options.pageConfig.top, options.pageConfig.left, options.pageConfig.bottom, options.pageConfig.right]
        });
        w.setTimeout(restore, 50);
      }, 100);
    }, options);
  }

  function loadStoredImage(options: StoredImageOptions): void {
    const image = one<HTMLImageElement>(options.selector);
    const value = (options.storage ?? storage).getItem(options.key ?? "timbre");

    if (!image || !value) {
      return;
    }

    image.src = value;
    image.style.display = "block";
  }

  function bindImageUpload(options: ImageUploadOptions): void {
    const input = one<HTMLInputElement>(options.inputSelector);

    if (!input) {
      return;
    }

    on(input, "change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.files || target.files.length === 0) {
        return;
      }

      const file = target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        if (typeof reader.result !== "string") {
          return;
        }
        (options.storage ?? storage).setItem(options.key ?? "timbre", reader.result);
        w.setTimeout(() => loadStoredImage(options), 100);
      });
      reader.readAsDataURL(file);
    });
  }

  function formatCurrentDate(selector: string): void {
    const target = one<HTMLElement>(selector);
    if (!target) {
      return;
    }

    const now = new Date();
    target.innerHTML = `${`${now.getDate()}`.padStart(2, "0")} de ${capitalizeFirst(now.toLocaleString("default", { month: "long" }))} de ${now.getFullYear()}`;
  }

  function setFieldValue(selector: string, value: string, sanitizeRegex?: RegExp): boolean {
    const field = one<HTMLInputElement>(selector);

    if (!field || value.length === 0) {
      return false;
    }

    field.value = decodeBase64(value);
    field.value = sanitizeRegex ? strip(field.value, sanitizeRegex) : field.value;
    field.dispatchEvent(new Event("blur"));
    return true;
  }

  function applyQueryParams(options: QueryApplyOptions): boolean {
    let changed = false;
    const payload = readJsonPayload(options.jsonParamNames);
    const mappings = options.fields ?? [];

    if (payload) {
      for (const mapping of mappings) {
        const keys = Array.isArray(mapping.jsonKeys ?? mapping.params) ? mapping.jsonKeys ?? mapping.params : [mapping.jsonKeys ?? mapping.params].filter(Boolean);

        for (const key of keys as string[]) {
          if (Object.prototype.hasOwnProperty.call(payload, key)) {
            const field = one<HTMLInputElement>(mapping.selector);
            if (field) {
              const value = payload[key];
              field.value = value == null ? "" : `${value}`;
              field.dispatchEvent(new Event("blur"));
              changed = true;
              break;
            }
          }
        }
      }
    }

    for (const mapping of mappings) {
      if (mapping.params) {
        changed = setFieldValue(mapping.selector, getQueryValue(mapping.params), mapping.sanitizeRegex) || changed;
      }
    }

    if (payload) {
      for (const mapping of options.storageMappings ?? []) {
        const keys = Array.isArray(mapping.jsonKeys) ? mapping.jsonKeys : [mapping.jsonKeys].filter(Boolean);

        for (const key of keys as string[]) {
          if (Object.prototype.hasOwnProperty.call(payload, key)) {
            const value = payload[key];
            (options.storage ?? storage).setItem(mapping.key, value == null ? "" : `${value}`);
            mapping.afterSet?.();
            changed = true;
            break;
          }
        }
      }
    }

    for (const mapping of options.storageMappings ?? []) {
      const value = getQueryValue(mapping.params);

      if (value.length === 0) {
        continue;
      }

      (options.storage ?? storage).setItem(mapping.key, decodeBase64(value));
      mapping.afterSet?.();
      changed = true;
    }

    if (changed && options.reload !== false) {
      w.location.assign(w.location.pathname);
    }

    return changed;
  }

  function bindToolbar(actions: Record<string, (event: Event) => void>): void {
    for (const [selector, handler] of Object.entries(actions)) {
      for (const element of $(selector)) {
        on(element, "click", handler);
      }
    }
  }

  function bundleNameFromPath(): string {
    const parts = w.location.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    const folder = last.toLowerCase().endsWith(".html") ? parts[parts.length - 2] : last;
    return `${folder || "index"}.bundle.zip`;
  }

  function resolveBundleHref(element: HTMLAnchorElement): string {
    const configured = element.dataset.bundleDownload || element.getAttribute("href") || "";
    const href = configured.trim() || bundleNameFromPath();
    return new URL(href, w.location.href).toString();
  }

  async function bundleExists(url: string): Promise<boolean> {
    if (!/^https?:$/i.test(w.location.protocol)) {
      return false;
    }

    try {
      const response = await w.fetch(url, {
        cache: "no-store",
        credentials: "same-origin",
        method: "HEAD"
      });
      return response.ok;
    } catch (_error) {
      return false;
    }
  }

  function bindBundleDownload(selector = "[data-bundle-download]"): void {
    for (const element of $<HTMLAnchorElement>(selector)) {
      const href = resolveBundleHref(element);
      element.hidden = true;
      void bundleExists(href).then((exists) => {
        if (!exists) {
          element.hidden = true;
          return;
        }
        const filename = href.split("/").pop() || bundleNameFromPath();
        element.href = href;
        element.setAttribute("download", filename);
        element.hidden = false;
      });
    }
  }

  function copyToClipboard(value: string): Promise<void> {
    if (w.navigator.clipboard?.writeText) {
      return w.navigator.clipboard.writeText(value);
    }

    const input = d.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.left = "-1000px";
    d.body.appendChild(input);
    input.select();
    d.execCommand("copy");
    d.body.removeChild(input);
    return Promise.resolve();
  }

  function cleanPageUrl(options: ShareOptions = {}): string {
    if (typeof options.cleanUrl === "function") {
      return options.cleanUrl();
    }

    if (typeof options.cleanUrl === "string" && options.cleanUrl.trim()) {
      return options.cleanUrl.trim();
    }

    return `${w.location.origin}${w.location.pathname}`;
  }

  function shareRoot(options: ShareOptions = {}): ParentNode {
    if (typeof options.root === "string") {
      return one(options.root) ?? d;
    }

    return options.root ?? d;
  }

  function defaultSharePayload(options: ShareOptions = {}): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const selector = options.fieldSelector ?? "input, select, textarea";
    const controls = $<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector, shareRoot(options));

    for (const control of controls) {
      if (control instanceof HTMLInputElement && ["button", "file", "reset", "submit"].includes(control.type)) {
        continue;
      }

      const key = control.id || control.name;
      if (!key) {
        continue;
      }

      if (control instanceof HTMLInputElement && control.type === "checkbox") {
        result[key] = control.checked;
        continue;
      }

      if (control instanceof HTMLInputElement && control.type === "radio") {
        if (control.checked) {
          result[key] = control.value;
        }
        continue;
      }

      result[key] = control.value;
    }

    return result;
  }

  function normalizePayload(value: Record<string, unknown> | null | undefined): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function chooseShareMode(options: ShareOptions, context: ShareContext): ShareMode | null {
    if (options.promptMode) {
      return options.promptMode(context);
    }

    const question = options.messages?.question
      ?? "Compartilhar link com os dados preenchidos?\n\nOK: compartilhar com dados preenchidos.\nCancelar: compartilhar apenas o link limpo da pagina.";

    return w.confirm(question) ? "filled" : "clean";
  }

  function buildShareUrl(mode: ShareMode, options: ShareOptions = {}, event?: Event): ShareBuildResult {
    const cleanUrl = cleanPageUrl(options);
    const context: ShareContext = { cleanUrl, event, mode };

    if (mode === "clean") {
      return { cleanUrl, mode, url: cleanUrl };
    }

    let payload = normalizePayload(options.payload ? options.payload() : defaultSharePayload(options));
    const extended = options.extendPayload?.(payload, { ...context, payload });

    if (extended && typeof extended === "object" && !Array.isArray(extended)) {
      payload = { ...payload, ...extended };
    }

    const url = new URL(cleanUrl, w.location.href);
    url.searchParams.set(options.dataParamName ?? "data", encodeBase64(JSON.stringify(payload)));

    return {
      cleanUrl,
      mode,
      payload,
      url: url.toString()
    };
  }

  async function runShare(options: ShareOptions = {}, event?: Event): Promise<ShareResult | null> {
    const cleanUrl = cleanPageUrl(options);
    const mode = chooseShareMode(options, { cleanUrl, event, mode: "clean" });

    if (!mode) {
      return null;
    }

    const beforeContext: ShareContext = { cleanUrl, event, mode };
    if (options.beforeShare?.(beforeContext) === false) {
      return null;
    }

    const built = buildShareUrl(mode, options, event);
    const result: ShareResult = { ...built, copied: false };

    try {
      await copyToClipboard(built.url);
      result.copied = true;
      options.afterShare?.(result);
      w.alert(mode === "filled"
        ? options.messages?.copiedFilled ?? "Endereco da pagina com dados preenchidos copiado para a area de transferencia."
        : options.messages?.copiedClean ?? "Endereco limpo da pagina copiado para a area de transferencia.");
      return result;
    } catch (_error) {
      w.alert(options.messages?.failed ?? "Nao foi possivel copiar o endereco para a area de transferencia.");
      return null;
    }
  }

  function bindShareToolbar(selector: string, options: ShareOptions = {}): void {
    for (const element of $(selector)) {
      on(element, "click", (event) => {
        void runShare(options, event);
      });
    }
  }

  const chromeDefaults = {
    author: "JCEM",
    domain: "tools.jcem.pro",
    licenseName: "Mozilla Public License 2.0",
    licenseUrl: "https://www.mozilla.org/MPL/2.0/"
  };

  function removeExistingChrome(): void {
    for (const element of $(".jcem-chrome-header,.jcem-chrome-footer")) {
      element.remove();
    }
  }

  function moveActionSlot(actions: HTMLElement, selector?: string): void {
    const source = selector ? one<HTMLElement>(selector) : null;
    if (!source) {
      return;
    }

    while (source.firstChild) {
      actions.appendChild(source.firstChild);
    }
    source.remove();
  }

  function renderChrome(options: ChromeOptions = {}): void {
    removeExistingChrome();

    const domain = options.domain ?? chromeDefaults.domain;
    const licenseName = options.licenseName ?? chromeDefaults.licenseName;
    const licenseUrl = options.licenseUrl ?? chromeDefaults.licenseUrl;
    const author = options.author ?? chromeDefaults.author;
    const mount = typeof options.mountBefore === "string"
      ? one(options.mountBefore)
      : options.mountBefore ?? d.body.firstElementChild;

    const header = d.createElement("header");
    header.className = "jcem-chrome jcem-chrome-header no-print";
    header.innerHTML = `
      <div class="jcem-chrome-identity">
        <a class="jcem-chrome-brand" href="https://${domain}/">Tools JCEM</a>
        <p>Ferramentas e modelos Web estáticos publicados em <strong>${domain}</strong>.</p>
        <p>Licença: <a href="${licenseUrl}" rel="license noopener" target="_blank">${licenseName}</a>.</p>
      </div>
      <div class="jcem-chrome-meta">
        <span class="jcem-chrome-domain">${domain}</span>
        <span class="ico autosave jcem-autosave">Execução local no navegador; salvamento local quando aplicável.</span>
      </div>
      <nav class="menu jcem-chrome-actions" aria-label="Ferramentas"></nav>
    `;

    const actions = one<HTMLElement>(".jcem-chrome-actions", header);
    if (actions) {
      moveActionSlot(actions, options.actionsSelector);
    }

    const footer = d.createElement("footer");
    footer.className = "jcem-chrome jcem-chrome-footer no-print";
    footer.innerHTML = `
      <p><strong>Disclaimer:</strong> modelos e ferramentas são recursos auxiliares e não substituem conferência técnica, jurídica, contábil, regulatória ou profissional adequada ao caso concreto.</p>
      <p><strong>Licença:</strong> código disponibilizado sob <a href="${licenseUrl}" rel="license noopener" target="_blank">${licenseName}</a>; preserve avisos e consulte o texto integral para direitos e obrigações.</p>
      <p><strong>Autor:</strong> ${author}.</p>
      <p><strong>Isenção de responsabilidade e garantia:</strong> o software é fornecido "no estado em que se encontra", sem garantias de qualquer natureza, expressas, implícitas ou legais, inclusive quanto à conformidade legal, regulatória, ausência de defeitos, adequação a finalidades específicas ou não violação de direitos.</p>
    `;

    d.body.insertBefore(header, mount ?? null);
    d.body.appendChild(footer);
  }

  w.JCEMDocumentos = {
    $,
    attr,
    autosave: {
      clearAutoFields,
      indicator: initAutosaveIndicator,
      init: initAutosave
    },
    base64: {
      decode: decodeBase64,
      encode: encodeBase64
    },
    clipboard: {
      copy: copyToClipboard
    },
    bundle: {
      bindDownload: bindBundleDownload
    },
    chrome: {
      render: renderChrome
    },
    date: {
      current: formatCurrentDate
    },
    image: {
      bindUpload: bindImageUpload,
      load: loadStoredImage
    },
    on,
    one,
    print: {
      createPageStyle,
      pdf: printPdf,
      withPrintMode
    },
    query: {
      apply: applyQueryParams,
      get: getQueryValue,
      json: readJsonPayload
    },
    ready,
    share: {
      bindToolbar: bindShareToolbar,
      buildUrl: buildShareUrl,
      run: runShare
    },
    storage,
    toolbar: {
      bind: bindToolbar
    },
    util: {
      capitalizeFirst,
      digits
    },
    validate: {
      all: validateInputs,
      input: validateAndNormalize
    },
    validators: {
      catalog: validatorCatalog,
      cep: formatCep,
      cnpj: formatCnpj,
      cpf: formatCpf,
      currency: formatCurrency,
      mobile: formatMobile,
      mod11,
      phone: formatPhone
    }
  };

  ready(() => bindBundleDownload());
})(window, document);
