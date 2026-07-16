import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import {
  faBoxOpen,
  faEraser,
  faFilePdf,
  faFileArrowDown,
  faFileArrowUp,
  faFloppyDisk,
  faPaperPlane,
  faPrint,
  faStamp
} from "@fortawesome/free-solid-svg-icons";
import { g as guard } from "./guard";

(function bootstrapDocumentos(w: Window, d: Document): void {
  "use strict";

  type FaIconDefinition = {
    icon: [number, number, Array<number | string>, string, string | string[]];
    iconName: string;
    prefix: string;
  };

  type ToolbarHook = (element: HTMLElement, item: ToolbarItemConfig) => void;
  type ToolbarLabelSource = "" | "text" | `fixed:${string}` | `text:${string}`;
  type ToolbarDatasetSource = "bundle" | "targetInput";
  type ToolbarHrefSource = "href";
  type ToolbarLegacyBlueprint = {
    datasetSource?: ToolbarDatasetSource;
    download?: boolean | string;
    fallbackId?: string;
    hint: string;
    hook?: string;
    hrefSource?: ToolbarHrefSource;
    icon?: ToolbarIconRef | string;
    id: string;
    label: ToolbarLabelSource;
    order: number;
    selector: string;
  };

  const storage = w.localStorage;
  const placeholders = new WeakMap<HTMLInputElement, string | null>();
  const autosaveBound = new WeakSet<HTMLInputElement>();
  const tooltipBound = new WeakSet<HTMLElement>();
  let chromeScrollStateBound = false;

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

      const storedValue = store.getItem(input.id);
      if (!input.dataset.jcemAutosaveHydrated) {
        input.dataset.jcemAutosaveHydrated = "true";
        if (storedValue !== null && d.activeElement !== input) {
          input.value = storedValue;
        }
      }

      if (autosaveBound.has(input)) {
        return;
      }
      autosaveBound.add(input);

      for (const eventName of ["blur", "keyup", "input"]) {
        on(input, eventName, (event) => {
          const shouldNormalize = event.type === "blur";

          if (!shouldNormalize) {
            store.setItem(input.id, input.value);
            return;
          }

          const result = validateAndNormalize(input, true, validation);

          if (result) {
            if (input.value.trim().length > 0 && typeof result === "string") {
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
      w.setTimeout(() => tick(state ? 0 : 1), 850);
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
    const contentWidth = width - pageConfig.left - pageConfig.right;

    style.textContent = `@page{size:${width}${unit} ${height}${unit};margin-left:${pageConfig.left}${unit};margin-right:${pageConfig.right}${unit};margin-top:${pageConfig.top}${unit};margin-bottom:${pageConfig.bottom}${unit};}`;
    style.textContent += `@media screen{body:not(.imprimir) div.main{width:${width}${unit};min-height:${height}${unit};max-width:none;padding:${pageConfig.top}${unit} ${pageConfig.right}${unit} ${pageConfig.bottom}${unit} ${pageConfig.left}${unit};}}`;
    style.textContent += `@media print{div.main{max-width:${contentWidth}${unit};}}body.imprimir div.main{max-width:${contentWidth}${unit};}`;
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

  function resolveHtml2Pdf(): Html2PdfFactory | null {
    const candidate = w.html2pdf;

    if (typeof candidate === "function") {
      return candidate;
    }

    if (candidate && typeof candidate.default === "function") {
      return candidate.default;
    }

    return null;
  }

  function printPdf(options: PrintPdfOptions): void {
    const html2pdf = resolveHtml2Pdf();

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
          margin: options.margin ?? [options.pageConfig.top, options.pageConfig.left, options.pageConfig.bottom, options.pageConfig.right]
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

  function resolveLayoutElement(value: Element | string | null | undefined): HTMLElement | null {
    if (!value) {
      return null;
    }

    const element = typeof value === "string" ? one<HTMLElement>(value) : value;
    return element instanceof HTMLElement ? element : null;
  }

  function ensureClass(element: Element, className: string): void {
    if (!element.classList.contains(className)) {
      element.classList.add(className);
    }
  }

  function renderPrintableLayout(options: PrintableLayoutOptions): void {
    const documentElement = resolveLayoutElement(options.document);

    if (!documentElement) {
      return;
    }

    d.body.classList.add("jcem-printable-layout");

    const currentParent = documentElement.parentElement;
    const workspace = resolveLayoutElement(options.workspace) ?? d.createElement("main");
    ensureClass(workspace, "jcem-document-workspace");

    if (!workspace.parentElement) {
      currentParent?.insertBefore(workspace, documentElement);
    }

    const preview = resolveLayoutElement(options.preview) ?? d.createElement("section");
    ensureClass(preview, "jcem-document-preview-region");
    preview.setAttribute("aria-label", preview.getAttribute("aria-label") || "Pre-visualizacao do documento");

    if (!preview.parentElement || preview.parentElement !== workspace) {
      workspace.appendChild(preview);
    }
    if (!preview.contains(documentElement)) {
      preview.appendChild(documentElement);
    }

    const externalForms = (options.forms ?? [])
      .filter((form) => form.placement === "external")
      .map((form) => resolveLayoutElement(form.selector))
      .filter((form): form is HTMLElement => Boolean(form));

    if (externalForms.length > 0) {
      workspace.classList.remove("jcem-document-workspace--document-only");
      for (const form of externalForms) {
        ensureClass(form, "jcem-document-form-region");
        if (form.parentElement !== workspace) {
          workspace.insertBefore(form, preview);
        }
      }
    } else {
      workspace.classList.add("jcem-document-workspace--document-only");
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

    if (typeof w.fetch !== "function") {
      return true;
    }

    try {
      const response = await w.fetch(url, {
        cache: "no-store",
        credentials: "same-origin",
        method: "HEAD"
      });
      return response.ok;
    } catch (_error) {
      return true;
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

  const iconDefinitions: FaIconDefinition[] = [
    faBoxOpen,
    faEraser,
    faFileArrowDown,
    faFileArrowUp,
    faFilePdf,
    faFloppyDisk,
    faPaperPlane,
    faPrint,
    faStamp
  ];

  const iconsByKey = new Map<string, FaIconDefinition>();
  const toolbarRuntime: ToolbarRuntimeConfig = {};
  const toolbarActionHooks: Record<string, ToolbarHook> = {
    "document.export": () => {
      exportFilling(toolbarRuntime);
    },
    "document.import": () => {
      importFilling(toolbarRuntime);
    },
    "input.trigger": (_element, item) => {
      const target = item.dataset?.targetInput;
      if (target) {
        one<HTMLInputElement>(`#${target}`)?.click();
      }
    },
    "window.print": () => {
      w.print();
    }
  };
  const toolbarFillItems: ToolbarItemConfig[] = [
    { className: "ico save-fill jcem-export-fill", hint: "Salvar localmente", hook: "document.export", icon: { unicode: "f56d" }, id: "export-fill", label: "", order: 10 },
    { className: "ico open-fill jcem-import-fill", hint: "Abrir a partir do arquivo", hook: "document.import", icon: { unicode: "f574" }, id: "import-fill", label: "", order: 20 },
    { id: "separator-fill", order: 30, type: "separator" as const }
  ];
  const toolbarLegacyBlueprints: ToolbarLegacyBlueprint[] = [
    { datasetSource: "bundle", download: true, hint: "Baixar versao offline", hrefSource: "href", icon: { unicode: "f49e" }, id: "bundle", label: "fixed:Versão Offline", order: 90, selector: "[data-bundle-download],.bundle" },
    { hint: "Imprimir PDF", icon: { unicode: "f1c1" }, id: "pdf", label: "", order: 40, selector: ".pdf.print" },
    { hint: "Imprimir em branco", icon: { unicode: "f1c1" }, id: "blank-pdf", label: "fixed:em branco", order: 45, selector: ".pdf.formulario" },
    { hint: "Imprimir", hook: "window.print", icon: { unicode: "f02f" }, id: "print", label: "", order: 50, selector: ".browser-print,.print:not(.pdf):not(.formulario)" },
    { hint: "Limpar", icon: { unicode: "f12d" }, id: "clear", label: "", order: 60, selector: ".clear" },
    { hint: "Enviar", icon: { unicode: "f1d8" }, id: "share", label: "", order: 80, selector: ".share" },
    { datasetSource: "targetInput", hint: "Selecionar timbre", hook: "input.trigger", icon: { unicode: "f5bf" }, id: "timbre", label: "text:Timbre", order: 70, selector: ".timbre" },
    { fallbackId: "acao", hint: "", icon: { unicode: "f02f" }, id: "", label: "text", order: 100, selector: ".pdf,.print" }
  ];

  for (const definition of iconDefinitions) {
    const aliases = definition.icon[2];
    iconsByKey.set(definition.iconName.toLowerCase(), definition);
    iconsByKey.set(`${definition.prefix}:${definition.iconName}`.toLowerCase(), definition);
    iconsByKey.set(definition.icon[3].toLowerCase(), definition);
    for (const alias of aliases) {
      iconsByKey.set(`${alias}`.toLowerCase(), definition);
    }
  }

  function resolveIconDefinition(iconRef: ToolbarIconRef | string | undefined): FaIconDefinition | null {
    if (!iconRef) {
      return null;
    }

    if (typeof iconRef === "string") {
      return iconsByKey.get(iconRef.toLowerCase()) ?? null;
    }

    const keys = [
      iconRef.identifier,
      iconRef.iconName,
      iconRef.unicode
    ].filter((value): value is string => Boolean(value));

    for (const key of keys) {
      const definition = iconsByKey.get(key.toLowerCase());
      if (definition) {
        return definition;
      }
    }

    return null;
  }

  function renderIcon(iconRef: ToolbarIconRef | string | undefined): string {
    const definition = resolveIconDefinition(iconRef);
    if (!definition) {
      return "";
    }

    const width = definition.icon[0];
    const height = definition.icon[1];
    const paths = definition.icon[4];
    const pathList = Array.isArray(paths) ? paths : [paths];
    const renderedPaths = pathList.map((path) => `<path fill="currentColor" d="${path}"></path>`).join("");
    return `<svg class="jcem-fa-icon" aria-hidden="true" focusable="false" role="img" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${renderedPaths}</svg>`;
  }

  function moduleIdFromPath(): string {
    const parts = w.location.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    const folder = last.toLowerCase().endsWith(".html") ? parts[parts.length - 2] : last;
    return (folder || d.body.id || d.title || "documento").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  }

  function moduleVersion(): string {
    const meta = one<HTMLMetaElement>('meta[name="jcem-module-version"]');
    const bodyVersion = d.body.dataset.jcemVersion;
    return meta?.content || bodyVersion || "1.0.0";
  }

  function configureToolbar(config: ToolbarRuntimeConfig): void {
    Object.assign(toolbarRuntime, config);
  }

  function downloadTextFile(filename: string, content: string, mime = "application/json;charset=utf-8"): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = d.createElement("a");
    link.href = url;
    link.download = filename;
    d.body.appendChild(link);
    link.click();
    d.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function safeBasename(value: string, fallback: string): string {
    const withoutControls = Array.from(value.trim()).filter((char) => char.charCodeAt(0) >= 32).join("");
    const normalized = withoutControls.replace(/[<>:"/\\|?*]+/g, "-").replace(/\s+/g, " ");
    return normalized.length > 0 ? normalized : fallback;
  }

  function portableEnvelope(config: ToolbarRuntimeConfig = {}): PortableDocumentEnvelope {
    const moduleId = config.moduleId ?? moduleIdFromPath();
    const schema = config.schema ?? "jcem.document.fill.v1";
    const version = config.version ?? moduleVersion();
    const data = normalizePayload(config.exportPayload ? config.exportPayload() : defaultSharePayload({ root: config.root }));

    return {
      app: guard().__p3 as PortableDocumentEnvelope["app"],
      data,
      exportedAt: new Date().toISOString(),
      moduleId,
      path: w.location.pathname,
      schema,
      version
    };
  }

  function exportFilling(config: ToolbarRuntimeConfig = {}): PortableDocumentEnvelope | null {
    const envelope = portableEnvelope(config);
    const extension = config.fileExtension ?? ".json";
    const suggestion = typeof config.exportBasename === "function" ? config.exportBasename() : config.exportBasename;
    const fallback = safeBasename(suggestion ?? envelope.moduleId, envelope.moduleId);
    const prompted = w.prompt(config.messages?.exportBasename ?? "Nome do arquivo:", fallback);
    if (prompted === null) {
      return null;
    }
    const basename = safeBasename(prompted, fallback);
    if (!basename) {
      return null;
    }

    const filename = basename.toLowerCase().endsWith(extension.toLowerCase()) ? basename : `${basename}${extension}`;
    downloadTextFile(filename, `${JSON.stringify(envelope, null, 2)}\n`);
    return envelope;
  }

  function isCompatibleVersion(expected: string | undefined, received: unknown, accepted: string[] | undefined): boolean {
    if (typeof received !== "string" || received.trim().length === 0) {
      return false;
    }

    if (accepted?.includes(received)) {
      return true;
    }

    if (!expected) {
      return true;
    }

    const [expectedMajor] = expected.split(".");
    const [receivedMajor] = received.split(".");
    return expectedMajor === receivedMajor;
  }

  function setControlValue(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: unknown): void {
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      control.checked = value === true || value === "true" || value === "on" || value === "1";
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (control instanceof HTMLInputElement && control.type === "radio") {
      control.checked = `${control.value}` === `${value}`;
      control.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    control.value = value == null ? "" : `${value}`;
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function applyDataToControls(data: Record<string, unknown>, root: ParentNode = d): void {
    const controls = $<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea", root);
    for (const control of controls) {
      if (control instanceof HTMLInputElement && ["button", "file", "reset", "submit"].includes(control.type)) {
        continue;
      }

      const keys = [control.id, control.name].filter(Boolean);
      const key = keys.find((candidate) => Object.prototype.hasOwnProperty.call(data, candidate));
      if (key) {
        setControlValue(control, data[key]);
      }
    }
  }

  function validatePortableEnvelope(value: unknown, config: ToolbarRuntimeConfig = {}): PortableDocumentEnvelope {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Arquivo invalido ou corrompido.");
    }

    const envelope = value as PortableDocumentEnvelope;
    const expectedModule = config.moduleId ?? moduleIdFromPath();
    const expectedSchema = config.schema ?? "jcem.document.fill.v1";

    if (envelope.moduleId !== expectedModule) {
      throw new Error(`Arquivo pertence ao modulo "${envelope.moduleId ?? "desconhecido"}" e nao pode ser aberto neste modulo.`);
    }

    if (envelope.schema !== expectedSchema) {
      throw new Error("Schema do arquivo incompativel com este modulo.");
    }

    if (!isCompatibleVersion(config.version ?? moduleVersion(), envelope.version, config.acceptVersions)) {
      throw new Error("Versao do arquivo incompativel com este modulo.");
    }

    if (!envelope.data || typeof envelope.data !== "object" || Array.isArray(envelope.data)) {
      throw new Error("Arquivo sem dados preenchiveis validos.");
    }

    return envelope;
  }

  function importFilling(config: ToolbarRuntimeConfig = {}): void {
    const extension = config.fileExtension ?? ".json";
    const input = d.createElement("input");
    input.type = "file";
    input.accept = extension;
    input.className = "jcem-file-dialog";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        return;
      }

      if (!file.name.toLowerCase().endsWith(extension.toLowerCase())) {
        w.alert(config.messages?.importFailed ?? `Arquivo recusado: extensao esperada ${extension}.`);
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        try {
          const envelope = validatePortableEnvelope(JSON.parse(`${reader.result ?? ""}`), config);
          if (config.importPayload) {
            config.importPayload(envelope.data, envelope);
          } else {
            applyDataToControls(envelope.data, typeof config.root === "string" ? one(config.root) ?? d : config.root ?? d);
          }
          w.alert(config.messages?.imported ?? "Arquivo aberto e dados preenchidos.");
        } catch (error) {
          w.alert(error instanceof Error ? error.message : config.messages?.importFailed ?? "Nao foi possivel abrir o arquivo.");
        }
      });
      reader.readAsText(file);
    });
    d.body.appendChild(input);
    input.click();
  }

  function bindTooltip(element: HTMLElement): void {
    if (tooltipBound.has(element) || !element.dataset.jcemTooltip) {
      return;
    }
    tooltipBound.add(element);

    let tooltip: HTMLElement | null = null;
    const close = (): void => {
      tooltip?.remove();
      tooltip = null;
    };
    const open = (): void => {
      close();
      const text = element.dataset.jcemTooltip ?? "";
      if (!text) {
        return;
      }
      tooltip = d.createElement("div");
      tooltip.className = "jcem-tooltip";
      tooltip.textContent = text;
      d.body.appendChild(tooltip);
      void computePosition(element, tooltip, {
        middleware: [offset(8), flip(), shift({ padding: 8 })],
        placement: "bottom"
      }).then(({ x, y }) => {
        if (tooltip) {
          Object.assign(tooltip.style, { left: `${x}px`, top: `${y}px` });
        }
      });
    };

    on(element, "mouseenter", open);
    on(element, "focus", open);
    on(element, "mouseleave", close);
    on(element, "blur", close);
    on(element, "keydown", (event) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        close();
      }
    });
  }

  function initTooltips(root: ParentNode = d): void {
    for (const element of $<HTMLElement>("[data-jcem-tooltip]", root)) {
      bindTooltip(element);
    }
  }

  function createToolbarSeparator(): HTMLElement {
    const separator = d.createElement("span");
    separator.className = "jcem-toolbar-separator";
    separator.setAttribute("role", "separator");
    separator.setAttribute("aria-orientation", "vertical");
    return separator;
  }

  /**
   * Renderiza um item de toolbar a partir de metadados declarativos.
   * Recebe a configuração normalizada, cria botão/link/separador, aplica acessibilidade, datasets, ícone, estado e hooks; retorna o elemento pronto para montagem.
   */
  function createToolbarElement(item: ToolbarItemConfig): HTMLElement {
    if (item.type === "separator") {
      return createToolbarSeparator();
    }

    const element = item.href ? d.createElement("a") : d.createElement("button");
    element.className = item.className ?? "";
    element.dataset.jcemToolbarId = item.id;
    element.dataset.jcemTooltip = item.hint || item.label || item.id;
    element.setAttribute("aria-label", item.hint || item.label || item.id);

    if (element instanceof HTMLButtonElement) {
      element.type = "button";
    } else {
      element.href = item.href ?? "#";
      if (item.download) {
        element.setAttribute("download", item.download === true ? "" : item.download);
      }
    }

    for (const [key, value] of Object.entries(item.dataset ?? {})) {
      element.dataset[key] = value;
    }

    if (item.hidden) {
      element.hidden = true;
    }

    if (item.enabled === false && element instanceof HTMLButtonElement) {
      element.disabled = true;
    } else if (item.enabled === false) {
      element.setAttribute("aria-disabled", "true");
    }

    const iconHtml = renderIcon(item.icon);
    const labelHtml = item.label ? `<span class="jcem-toolbar-label">${item.label}</span>` : "";
    element.innerHTML = `${iconHtml}${labelHtml}`;
    if (!item.label) {
      element.classList.add("jcem-icon-only");
    }
    bindToolbarHook(element, item);
    item.onClick?.(element);
    return element;
  }

  /**
   * Associa hook interno e ação declarativa de módulo ao item renderizado.
   * Recebe elemento e configuração do item; não retorna valor e resolve o comportamento no clique por metadados globais e runtime.
   */
  function bindToolbarHook(element: HTMLElement, item: ToolbarItemConfig): void {
    const hook = item.hook ? toolbarActionHooks[item.hook] : undefined;
    const actionKey = item.action || item.id;
    on(element, "click", (event) => {
      hook?.(element, item);
      const action = toolbarRuntime.actions?.[actionKey];
      if (action) {
        void action(event, element, item);
      }
    });
  }

  /**
   * Extrai o texto visível de um item legado usado como fonte declarativa.
   * Recebe o elemento original e retorna texto aparado para rótulos, dicas ou fallback de identificador.
   */
  function toolbarText(element: HTMLElement): string {
    return (element.textContent ?? "").trim();
  }

  /**
   * Resolve o identificador lógico de um item de toolbar.
   * Recebe elemento legado, blueprint e texto extraído; retorna id explícito, derivado ou fallback estável.
   */
  function toolbarId(element: HTMLElement, blueprint: ToolbarLegacyBlueprint, textValue: string): string {
    const configured = element.dataset.jcemToolbarId || blueprint.id;
    const fallback = blueprint.fallbackId ?? "acao";
    return configured || textValue.toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || fallback;
  }

  /**
   * Resolve o rótulo exibido de acordo com a estratégia declarada no blueprint.
   * Recebe a fonte do rótulo e o texto legado; retorna texto vazio, original ou fallback configurado.
   */
  function toolbarLabel(source: ToolbarLabelSource, textValue: string): string {
    if (source === "") {
      return "";
    }
    if (source === "text") {
      return textValue;
    }
    if (source.startsWith("fixed:")) {
      return source.slice("fixed:".length);
    }
    return textValue || source.slice("text:".length);
  }

  /**
   * Converte atributos legados em dataset declarativo consumido pelos hooks.
   * Recebe elemento e origem declarada; retorna dataset normalizado ou ausência de dataset.
   */
  function toolbarDataset(element: HTMLElement, source?: ToolbarDatasetSource): Record<string, string> | undefined {
    if (source === "bundle") {
      return { bundleDownload: element.dataset.bundleDownload ?? "" };
    }
    if (source === "targetInput" && element instanceof HTMLLabelElement && element.htmlFor) {
      return { targetInput: element.htmlFor };
    }
    return undefined;
  }

  /**
   * Resolve o href preservado para ações renderizadas como link.
   * Recebe elemento e origem declarada; retorna o href original apenas quando o blueprint permite.
   */
  function toolbarHref(element: HTMLElement, source?: ToolbarHrefSource): string | undefined {
    return source === "href" && element instanceof HTMLAnchorElement ? element.getAttribute("href") ?? undefined : undefined;
  }

  /**
   * Localiza o blueprint compatível com um item legado do slot de ações.
   * Recebe o elemento original e retorna a primeira regra declarativa aplicável.
   */
  function toolbarBlueprintFor(element: HTMLElement): ToolbarLegacyBlueprint | null {
    return toolbarLegacyBlueprints.find((blueprint) => element.matches(blueprint.selector)) ?? null;
  }

  /**
   * Normaliza um elemento legado para configuração declarativa de toolbar.
   * Recebe o elemento do slot, preserva compatibilidade de classes/dados e retorna item pronto para renderização.
   */
  function toolbarItemFromLegacy(element: HTMLElement): ToolbarItemConfig | null {
    if (element instanceof HTMLInputElement && element.type === "file") {
      return null;
    }

    const blueprint = toolbarBlueprintFor(element);
    if (!blueprint) {
      return null;
    }

    const textValue = toolbarText(element);
    return {
      className: element.className || "",
      dataset: toolbarDataset(element, blueprint.datasetSource),
      download: blueprint.download,
      hidden: element.hidden,
      hint: blueprint.hint || element.getAttribute("title") || textValue,
      hook: blueprint.hook,
      href: toolbarHref(element, blueprint.hrefSource),
      icon: blueprint.icon,
      id: toolbarId(element, blueprint, textValue),
      label: toolbarLabel(blueprint.label, textValue),
      order: blueprint.order
    };
  }

  /**
   * Separa controles preservados e ações declarativas de um slot de toolbar.
   * Recebe o container legado e retorna inputs auxiliares preservados e itens normalizados.
   */
  function toolbarItemsFromSlot(source: HTMLElement): { controls: HTMLElement[]; items: ToolbarItemConfig[] } {
    const controls: HTMLElement[] = [];
    const items: ToolbarItemConfig[] = [];
    for (const child of Array.from(source.children)) {
      if (!(child instanceof HTMLElement)) {
        continue;
      }
      if (child instanceof HTMLInputElement && child.type === "file") {
        child.classList.add("jcem-toolbar-control");
        controls.push(child);
        continue;
      }
      const item = toolbarItemFromLegacy(child);
      if (item) {
        items.push(item);
      }
    }
    return { controls, items };
  }

  /**
   * Ordena itens de toolbar usando metadados de precedência.
   * Recebe itens normalizados e retorna nova lista estável por ordem declarada e posição original.
   */
  function sortToolbarItems(items: ToolbarItemConfig[]): ToolbarItemConfig[] {
    return items
      .map((item, index) => ({ index, item }))
      .sort((left, right) => (left.item.order ?? 100 + left.index) - (right.item.order ?? 100 + right.index))
      .map(({ item }) => item);
  }

  /**
   * Renderiza a toolbar global a partir do slot declarado pelo módulo.
   * Recebe o container de destino e seletor do slot; monta ações globais, ações legadas normalizadas e tooltips.
   */
  function renderToolbarFromSlot(actions: HTMLElement, selector?: string): void {
    const source = selector ? one<HTMLElement>(selector) : null;
    if (!source) {
      return;
    }

    const { controls, items: legacyItems } = toolbarItemsFromSlot(source);
    const hasPdf = legacyItems.some((item) => item.id === "pdf");
    const items = sortToolbarItems([
      ...(hasPdf ? toolbarFillItems : []),
      ...legacyItems
    ]);

    actions.replaceChildren();
    for (const control of controls) {
      actions.appendChild(control);
    }
    for (const item of items) {
      actions.appendChild(createToolbarElement(item));
    }
    source.remove();
    initTooltips(actions);
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

  function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char] ?? char));
  }

  function externalLink(href: string, label: string, rel = "noopener noreferrer"): string {
    return `<a href="${escapeHtml(href)}" target="_blank" rel="${escapeHtml(rel)}">${escapeHtml(label)}</a>`;
  }

  function removeExistingChrome(): void {
    for (const element of $(".jcem-chrome-header,.jcem-chrome-footer")) {
      element.remove();
    }
  }

  function updateChromeScrollState(): void {
    d.body.classList.toggle("jcem-chrome-compact", w.scrollY > 24);
  }

  function bindChromeScrollState(): void {
    if (chromeScrollStateBound) {
      updateChromeScrollState();
      return;
    }

    chromeScrollStateBound = true;
    on(w, "scroll", updateChromeScrollState);
    on(w, "resize", updateChromeScrollState);
    updateChromeScrollState();
  }

  function renderChrome(options: ChromeOptions = {}): void {
    removeExistingChrome();

    const seal = guard();
    const domain = options.domain ?? seal.__p3;
    const licenseName = options.licenseName ?? seal.__p4;
    const licenseUrl = options.licenseUrl ?? seal.__p5;
    const brandName = seal.__p2;
    const authorName = options.authorName ?? options.author ?? seal.__p0;
    const authorUrl = options.authorUrl ?? seal.__p1;
    const authorLink = externalLink(authorUrl, authorName);
    const licenseLink = externalLink(licenseUrl, licenseName, "license noopener noreferrer");
    const mount = typeof options.mountBefore === "string"
      ? one(options.mountBefore)
      : options.mountBefore ?? d.body.firstElementChild;

    const header = d.createElement("header");
    header.className = "jcem-chrome jcem-chrome-header no-print";
    header.innerHTML = `
      <div class="jcem-chrome-identity">
        <a class="jcem-chrome-brand" href="https://${domain}/">${escapeHtml(brandName)}</a>
        <p>${seal.__p6}${authorLink}${seal.__p7}${escapeHtml(domain)}${seal.__p8}</p>
        <p>${seal.__p9}${licenseLink}${seal.__p10}</p>
      </div>
      <div class="jcem-chrome-meta">
        <span class="jcem-chrome-domain">${domain}</span>
        <span class="ico autosave jcem-autosave"><span>${seal.__p11}</span><span class="jcem-autosave-icon">${renderIcon({ unicode: "f0c7" })}</span></span>
      </div>
      <nav class="menu jcem-chrome-actions" aria-label="Ferramentas"></nav>
    `;

    const actions = one<HTMLElement>(".jcem-chrome-actions", header);
    if (actions) {
      renderToolbarFromSlot(actions, options.actionsSelector);
    }

    const footer = d.createElement("footer");
    footer.className = "jcem-chrome jcem-chrome-footer no-print";
    footer.innerHTML = `
      <section class="jcem-footer-block" aria-label="${seal.__p12}">
        <h2>${seal.__p12}</h2>
        <p>${seal.__p13}${authorLink}${seal.__p10}</p>
      </section>
      <section class="jcem-footer-block" aria-label="${seal.__p14}">
        <h2>${seal.__p14}</h2>
        <p>${seal.__p17}${licenseLink}${seal.__p18}</p>
      </section>
      <section class="jcem-footer-block" aria-label="${seal.__p15}">
        <h2>${seal.__p15}</h2>
        <p>${seal.__p19}${escapeHtml(domain)}${seal.__p20}</p>
      </section>
      <section class="jcem-footer-block jcem-footer-legal" aria-label="${seal.__p16}">
        <h2>${seal.__p16}</h2>
        <p>${seal.__p21}</p>
        <p>${seal.__p22}</p>
        <p>${seal.__p23}</p>
      </section>
    `;

    d.body.insertBefore(header, mount ?? null);
    d.body.appendChild(footer);
    initTooltips(header);
    bindChromeScrollState();
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
    data: {
      apply: applyDataToControls,
      envelope: portableEnvelope,
      export: exportFilling,
      import: importFilling
    },
    bundle: {
      bindDownload: bindBundleDownload
    },
    chrome: {
      render: renderChrome
    },
    layout: {
      printable: renderPrintableLayout
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
      bind: bindToolbar,
      configure: configureToolbar,
      tooltips: initTooltips
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
