import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import {
  faBoxOpen,
  faBars,
  faCircleDown,
  faCircleHalfStroke,
  faEllipsisVertical,
  faFolderOpen,
  faDownload,
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

declare const __JCEM_BUILD_VERSION__: string;

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
    icons?: Array<ToolbarIconRef | string>;
    id: string;
    label: ToolbarLabelSource;
    order: number;
    selector: string;
  };

  const storage = w.localStorage;
  const defaultAuthorLogoUrl = "https://jcem.pro/logo/64-dark.png";
  const placeholders = new WeakMap<HTMLInputElement, string | null>();
  const autosaveBound = new WeakSet<HTMLInputElement>();
  const tooltipBound = new WeakSet<HTMLElement>();
  let updateCheckStarted = false;
  const mpl2BadgeSvg = `<svg class="jcem-mpl2-icon" aria-hidden="true" focusable="false" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"><path d="M42.05 0.08C99.37 0.08 156.7 0.08 214.03 0.08C215.92 1.22 218.05 0.69 220.12 1.19C225 2.38 230.38 4.27 234.6 7.15C242.68 12.65 249.15 20.35 252.78 29.41C254.28 33.18 254.24 39.4 255.92 42.4C255.92 67.44 255.92 92.47 255.92 117.5C254.11 116.7 255 111.22 255 109.25C255 101.07 256.35 91.48 254.75 83.5C254.58 114.89 254.42 146.28 254.25 177.67C253.92 155.89 253.58 134.1 253.25 112.32C252.75 113.27 252.25 114.23 251.75 115.19C248.87 109.54 249.73 126.63 249.72 128.25C249.72 138.24 249.52 148.25 249.41 158.25C249.3 168.58 249.04 178.92 249.12 189.25C249.18 197.62 250.23 207.02 248.6 215.26C245.33 231.9 233.41 244.8 216.74 248.46C210.52 249.82 203.58 249.14 197.25 249.06C186.92 248.94 176.58 249.03 166.25 249.05C130.58 249.08 94.92 249.07 59.25 249.09C53.4 249.09 47.22 249.61 41.42 248.77C27.85 246.8 15.9 237.42 10.24 225.04C5.46 214.59 6.7 202.92 6.65 191.75C6.55 172.44 6.78 153.04 6.1 133.75C5.81 125.75 7.24 114.15 5.51 106.75C4.28 107.8 5.31 113.54 2.7 112.25C2.38 119.05 2.07 125.84 1.75 132.64C1.58 114.19 1.42 95.73 1.25 77.27C0.03 84.49 1 92.06 1 99.25C1 103.82 0.24 108.37 0.5 112.75C0.71 116.34 1.61 127.08 0.08 130C0.08 100.34 0.08 70.69 0.08 41.03C1.41 39.18 2.76 30.26 4.25 26.95C7.4 19.97 12.56 14.07 18.46 9.21C22.24 6.1 27.73 3.51 32.34 2.16C35.22 1.31 39.67 1.76 42.05 0.08Z" fill="#044c99"/><path d="M42.3 7.21C57.9 5.92 74.09 7.11 89.75 7.11C119.92 7.11 150.08 7.11 180.25 7.11C199.11 7.11 221.46 3.3 236.47 17.28C251.83 31.58 249.06 52.09 249.01 71.25C248.99 79.42 249.03 87.58 249.02 95.75C249.02 98.43 249.94 103.15 248.8 105.59C247.81 107.72 239.69 111.84 237.43 113.21C225.33 120.51 212.37 125.83 198.99 130.26C152.29 145.72 93.67 144.19 47.64 127.16C36.81 123.15 26.42 118.25 16.56 112.22C13.94 110.61 8.99 108.59 7.28 105.98C5.97 103.97 6.79 99.61 6.8 97.25C6.82 90.25 6.79 83.25 6.81 76.25C6.87 51.17 1.99 23.38 29.43 10.68C33.43 8.83 37.88 7.57 42.3 7.21ZM75.75 73.71C71.67 69.78 65.31 55.79 62.17 50.11C60.88 47.78 59.12 42.25 56.78 40.95C54.48 39.67 49.37 40.65 46.75 40.65C44.45 40.66 42.21 40.39 40.06 41.25C40.06 63.75 40.06 86.25 40.06 108.75C43.67 110.16 51.83 110.2 55.42 108.75C55.42 95.46 55.42 82.16 55.42 68.87C57.31 69.98 58.15 72.51 59.29 74.46C62.36 79.7 65.55 84.89 68.57 90.16C70.65 93.79 72.12 97.77 77.18 96.4C79.57 95.76 80.96 91.29 82.13 89.36C85.07 84.46 87.91 79.47 90.74 74.51C91.85 72.55 92.69 69.99 94.56 68.88C94.56 82.17 94.56 95.46 94.56 108.75C98.22 110.22 106.29 110.11 110.02 108.8C110.02 86.27 110.02 63.73 110.02 41.2C108.03 40.46 95.9 39.94 94.35 41.07C91.89 42.86 90.31 47.99 88.83 50.61C84.63 58.11 80.99 66.91 75.75 73.71ZM137.87 87.25C147.34 85.94 156.53 88.42 165.05 82.78C177.36 74.65 177.72 53.67 165.38 45.36C156.46 39.35 145.5 40.69 135.25 40.66C131.17 40.65 126.03 39.81 122.21 41.25C122.21 63.75 122.21 86.25 122.21 108.75C125.91 110.16 134.18 110.21 137.87 108.75C137.87 101.58 137.87 94.42 137.87 87.25ZM198.23 40.96C193.91 40.11 186.27 39.61 182.18 41.25C182.18 63.75 182.18 86.25 182.18 108.75C185.96 110.2 191.2 109.33 195.25 109.32C202.82 109.31 217.41 110.65 224.12 108.94C224.12 104.6 224.12 100.26 224.12 95.93C215.49 95.93 206.86 95.93 198.23 95.93C198.23 77.6 198.23 59.28 198.23 40.96Z" fill="#fefefe"/><path d="M255.92 117.5C255.92 149.17 255.92 180.84 255.92 212.51C254.81 214.35 255.27 216.47 254.74 218.49C253.95 221.51 253.09 224.8 251.83 227.64C248.4 235.37 242.83 241.65 236.35 247.09C232.75 250.11 227.5 252.32 223.11 253.76C220.49 254.62 216.73 254.37 214.52 255.92C156.87 255.92 99.22 255.92 41.57 255.92C39.64 254.35 33.14 253.95 30.33 252.84C24.45 250.52 18.64 246.67 14.11 242.14C9.47 237.5 5.33 231.31 3.17 225.19C2.28 222.69 1.42 215.41 0.08 213.94C0.08 185.96 0.08 157.98 0.08 130C1.61 127.08 0.71 116.34 0.5 112.75C0.24 108.37 1 103.82 1 99.25C1 92.06 0.03 84.49 1.25 77.27C1.42 95.73 1.58 114.19 1.75 132.64C2.07 125.84 2.38 119.05 2.7 112.25C5.31 113.54 4.28 107.8 5.51 106.75C7.24 114.15 5.81 125.75 6.1 133.75C6.78 153.04 6.55 172.44 6.65 191.75C6.7 202.92 5.46 214.59 10.24 225.04C15.9 237.42 27.85 246.8 41.42 248.77C47.22 249.61 53.4 249.09 59.25 249.09C94.92 249.07 130.58 249.08 166.25 249.05C176.58 249.03 186.92 248.94 197.25 249.06C203.58 249.14 210.52 249.82 216.74 248.46C233.41 244.8 245.33 231.9 248.6 215.26C250.23 207.02 249.18 197.62 249.12 189.25C249.04 178.92 249.3 168.58 249.41 158.25C249.52 148.25 249.72 138.24 249.72 128.25C249.73 126.63 248.87 109.54 251.75 115.19C252.25 114.23 252.75 113.27 253.25 112.32C253.58 134.1 253.92 155.89 254.25 177.67C254.42 146.28 254.58 114.89 254.75 83.5C256.35 91.48 255 101.07 255 109.25C255 111.22 254.11 116.7 255.92 117.5Z" fill="#2271c0"/></svg>`;

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

    if (indicator) indicator.dataset.jcemAutosaveIndicator = "true";
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
    style.textContent = `@page{size:${width}${unit} ${height}${unit};margin:0;}`;
    style.textContent += `@media screen{body:not(.imprimir) div.main{width:${width}${unit};min-height:${height}${unit};max-width:none;padding:${pageConfig.top}${unit} ${pageConfig.right}${unit} ${pageConfig.bottom}${unit} ${pageConfig.left}${unit};}}`;
    style.textContent += `@media print{div.main{box-sizing:border-box;width:${width}${unit};min-height:${height}${unit};max-width:none;padding:${pageConfig.top}${unit} ${pageConfig.right}${unit} ${pageConfig.bottom}${unit} ${pageConfig.left}${unit};}}body.imprimir div.main{box-sizing:border-box;width:${width}${unit};min-height:${height}${unit};max-width:none;padding:${pageConfig.top}${unit} ${pageConfig.right}${unit} ${pageConfig.bottom}${unit} ${pageConfig.left}${unit};}`;
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
          margin: options.margin ?? [0, 0, 0, 0]
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

  function ensureFormDrawerControl(workspace: HTMLElement): void {
    const controlId = `${moduleIdFromPath()}-form-drawer`;
    let control = one<HTMLInputElement>(`#${controlId}`);

    if (!control) {
      control = d.createElement("input");
      control.className = "jcem-form-drawer-state";
      control.id = controlId;
      control.type = "checkbox";
      control.setAttribute("aria-label", "Expandir ou recolher formulario");
    }

    if (control.parentElement !== workspace) {
      workspace.prepend(control);
    }
  }

  function ensureFormDrawerToggle(form: HTMLElement): void {
    const control = one<HTMLInputElement>(".jcem-form-drawer-state");
    if (!control) {
      return;
    }

    let toggle = one<HTMLLabelElement>(".jcem-document-form-toggle", form);
    if (!toggle) {
      toggle = d.createElement("label");
      toggle.className = "jcem-document-form-toggle";
      toggle.htmlFor = control.id;
      toggle.setAttribute("aria-label", "Abrir ou recolher campos do formulario");
      toggle.title = "Abrir ou recolher campos do formulario";
      toggle.innerHTML = `${renderIcon({ unicode: "f142" })}<span class="jcem-form-toggle-copy jcem-form-toggle-copy--open">Campos preenchíveis</span><span class="jcem-form-toggle-copy jcem-form-toggle-copy--close">Recolher campos</span>`;
      form.prepend(toggle);
    }

    if (!one(".jcem-document-form-scroll", form)) {
      const scroll = d.createElement("div");
      scroll.className = "jcem-document-form-scroll";
      for (const child of Array.from(form.children)) {
        if (child !== toggle) {
          scroll.appendChild(child);
        }
      }
      form.appendChild(scroll);
    }
  }

  function initOverflowGroup(root: HTMLElement, actions: HTMLElement, overflow: HTMLElement, stateSelector: string, options: { compactAutosave?: boolean; compactBrand?: boolean } = {}): void {
    const state = one<HTMLInputElement>(stateSelector, root);
    const brandName = one<HTMLElement>(".jcem-brand-name", root);
    const items = Array.from(actions.children) as HTMLElement[];
    let pending = 0;

    const setBrandMode = (mode: "full" | "short"): void => {
      if (!brandName) {
        return;
      }
      const value = mode === "short" ? (brandName.dataset.short || brandName.dataset.full || brandName.textContent || "") : (brandName.dataset.full || brandName.textContent || "");
      brandName.textContent = value;
    };
    const brandFits = (): boolean => !brandName || brandName.scrollWidth <= brandName.clientWidth + 1;
    const fits = (): boolean => root.scrollWidth <= root.clientWidth + 1 && actions.scrollWidth <= actions.clientWidth + 1 && brandFits();

    const restoreItems = (): void => {
      for (const item of items) {
        actions.appendChild(item);
      }
    };

    const rebalance = (): void => {
      pending = 0;
      root.classList.remove("jcem-header-brand-short", "jcem-header-autosave-compact", "jcem-header-autosave-icon-only", "jcem-has-overflow");
      setBrandMode("full");
      restoreItems();
      if (state) {
        state.checked = false;
      }

      if (fits()) {
        return;
      }

      if (options.compactBrand) {
        root.classList.add("jcem-header-brand-short");
        setBrandMode("short");
        if (fits()) {
          return;
        }
      }

      if (options.compactAutosave) {
        root.classList.add("jcem-header-autosave-compact");
        if (fits()) {
          return;
        }

        root.classList.add("jcem-header-autosave-icon-only");
        if (fits()) {
          return;
        }
      }

      root.classList.add("jcem-has-overflow");
      while (!fits() && actions.lastElementChild) {
        overflow.prepend(actions.lastElementChild);
      }

      if (!overflow.children.length) {
        root.classList.remove("jcem-has-overflow");
      }
    };

    const schedule = (): void => {
      if (pending) {
        return;
      }
      pending = w.requestAnimationFrame(rebalance);
    };

    if ("ResizeObserver" in w) {
      const observer = new ResizeObserver(schedule);
      observer.observe(root);
    } else {
      w.addEventListener("resize", schedule, { passive: true });
    }
    w.addEventListener("orientationchange", schedule, { passive: true });
    root.addEventListener("jcem:overflow-refresh", schedule);

    schedule();
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
      ensureFormDrawerControl(workspace);
      for (const form of externalForms) {
        ensureClass(form, "jcem-document-form-region");
        ensureFormDrawerToggle(form);
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
    faBars,
    faCircleDown,
    faCircleHalfStroke,
    faDownload,
    faEllipsisVertical,
    faFolderOpen,
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
    { className: "ico save-fill jcem-export-fill", hint: "Salvar localmente", hook: "document.export", icon: { unicode: "f0c7" }, id: "export-fill", label: "", order: 10 },
    { className: "ico open-fill jcem-import-fill", hint: "Abrir a partir do arquivo", hook: "document.import", icon: { unicode: "f07c" }, id: "import-fill", label: "", order: 20 },
    { id: "separator-fill", order: 30, type: "separator" as const }
  ];
  const toolbarLegacyBlueprints: ToolbarLegacyBlueprint[] = [
    // FIX-BUG: preserva ações utilitárias do CSV na normalização da toolbar global.
    { hint: "Abrir CSV", icon: { unicode: "f574" }, id: "csv-open", label: "", order: 20, selector: ".csv-open" },
    { hint: "Baixar CSV convertido", icon: { unicode: "f56d" }, id: "csv-download", label: "", order: 40, selector: ".csv-download" },
    { datasetSource: "bundle", download: true, hint: "Baixar versão offline", hrefSource: "href", icons: [{ unicode: "f49e" }, { unicode: "f358" }], id: "bundle", label: "", order: 90, selector: "[data-bundle-download],.bundle" },
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
    const prompted = w.prompt(config.messages?.exportBasename ?? "Salvar os dados diretamente em um arquivo local. Informe o nome do arquivo:", fallback);
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

    const iconHtml = (item.icons ?? (item.icon ? [item.icon] : [])).map(renderIcon).join("");
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
      icons: blueprint.icons,
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
    const hasPrintAndClear = legacyItems.some((item) => item.id === "print") && legacyItems.some((item) => item.id === "clear");
    const items = sortToolbarItems([
      ...(hasPdf ? toolbarFillItems : []),
      ...(hasPrintAndClear ? [{ id: "separator-print-clear", order: 55, type: "separator" as const }] : []),
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
    for (const element of $(".jcem-chrome-header,.jcem-chrome-footer,.jcem-app-nav")) {
      element.remove();
    }
    one<HTMLInputElement>(".jcem-nav-state")?.remove();
    const shell = one<HTMLElement>(".jcem-app-shell");
    const content = one<HTMLElement>(".jcem-app-shell-content", shell ?? d);
    if (shell && content) {
      for (const child of Array.from(content.children)) d.body.insertBefore(child, shell);
      shell.remove();
    }
    for (const element of $(".jcem-app-shell-content")) element.classList.remove("jcem-app-shell-content");
    d.body.classList.remove("jcem-has-app-nav", "jcem-has-app-nav-right");
  }

  function applyTheme(theme: "dark" | "light"): void {
    d.documentElement.dataset.theme = theme;
    try { storage.setItem("jcem-theme", theme); } catch { /* PROTECAO: tema continua funcional sem persistencia. */ }
  }

  function initTheme(): HTMLButtonElement {
    let stored: string | null = null;
    try { stored = storage.getItem("jcem-theme"); } catch { /* PROTECAO: usa preferencia do sistema. */ }
    const initial = stored === "dark" || stored === "light" ? stored : (w.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(initial);
    const button = d.createElement("button");
    button.className = "jcem-theme-toggle";
    button.type = "button";
    button.setAttribute("aria-label", "Alternar tema claro e escuro");
    button.innerHTML = renderIcon({ unicode: "f042" });
    on(button, "click", () => applyTheme(d.documentElement.dataset.theme === "dark" ? "light" : "dark"));
    return button;
  }

  async function renderAppNavigation(): Promise<void> {
    try {
      type AppCatalog = { apps?: Array<{ href: string; id: string; logo?: string; offlineLogo?: string; title: string }>; authorLogo?: string; authorLogoUrl?: string; currentAppId?: string; navigationPosition?: string; siteNameFull?: string; siteNameShort?: string; workspaceLogo?: string; workspaceOfflineLogo?: string };
      const embedded = (w as Window & { __JCEM_APP_CATALOG__?: AppCatalog }).__JCEM_APP_CATALOG__;
      const encoded = one<HTMLMetaElement>('meta[name="jcem-app-catalog"]')?.content;
      const metadata: AppCatalog | undefined = encoded
        ? JSON.parse((encoded.match(/\\u[0-9a-f]{4}/gi) ?? []).map((unit) => String.fromCharCode(Number.parseInt(unit.slice(2), 16))).join(""))
        : undefined;
      const catalog = embedded ?? metadata ?? await fetch("/assets/config/apps.json").then((response) => response.json()) as AppCatalog;
      if (!Array.isArray(catalog.apps)) return;
      const bundled = Boolean(encoded);
      const authorImage = one<HTMLImageElement>(".jcem-author-badge img");
      if (authorImage && bundled && catalog.authorLogo?.startsWith("data:image/png;base64,")) {
        authorImage.src = catalog.authorLogo;
      } else if (authorImage && catalog.authorLogoUrl) {
        authorImage.src = catalog.authorLogoUrl;
      }
      const brandName = one<HTMLElement>(".jcem-brand-name");
      if (brandName) {
        const full = catalog.siteNameFull || brandName.dataset.full || brandName.textContent || "";
        const short = catalog.siteNameShort || brandName.dataset.short || full;
        brandName.dataset.full = full;
        brandName.dataset.short = short;
        brandName.textContent = full;
        brandName.parentElement?.setAttribute("aria-label", full);
        one<HTMLElement>(".jcem-chrome-header")?.dispatchEvent(new Event("jcem:overflow-refresh"));
      }
      const appLogo = (app: NonNullable<AppCatalog["apps"]>[number]): string => bundled ? (app.offlineLogo ?? app.logo ?? "") : (app.logo ?? "");
      const aside = d.createElement("aside");
      aside.className = `jcem-app-nav no-print jcem-app-nav-${catalog.navigationPosition === "right" ? "right" : "left"}`;
      const appLinks = catalog.apps.map((app) => `<a href="${escapeHtml(app.href)}" title="${escapeHtml(app.title)}"><span class="jcem-app-logo" data-logo="${escapeHtml(appLogo(app))}"></span><span>${escapeHtml(app.title)}</span></a>`).join("");
      const workspaceLogo = bundled ? (catalog.workspaceOfflineLogo ?? catalog.workspaceLogo ?? "") : (catalog.workspaceLogo ?? "");
      const toggle = d.createElement("input");
      toggle.className = "jcem-nav-state";
      toggle.id = "jcem-nav-state";
      toggle.type = "checkbox";
      const toggleLabel = d.createElement("label");
      toggleLabel.className = "jcem-nav-toggle";
      toggleLabel.htmlFor = toggle.id;
      toggleLabel.setAttribute("aria-label", "Expandir ou recolher aplicativos");
      toggleLabel.innerHTML = renderIcon({ unicode: "f0c9" });
      aside.innerHTML = `<nav aria-label="Aplicativos"><a href="/" title="Workspace"><span class="jcem-app-logo" data-logo="${escapeHtml(workspaceLogo)}"></span><span>Workspace</span></a>${appLinks}</nav>`;
      for (const slot of $<HTMLElement>("[data-logo]", aside)) {
        const image = d.createElement("img");
        image.className = slot.className;
        image.src = slot.dataset.logo ?? "";
        image.alt = "";
        slot.replaceWith(image);
      }
      const header = one<HTMLElement>(".jcem-chrome-header");
      header?.insertAdjacentElement("afterend", toggle);
      toggle.insertAdjacentElement("afterend", toggleLabel);
      aside.prepend(toggleLabel);
      const shell = d.createElement("div");
      shell.className = "jcem-app-shell";
      const content = d.createElement("main");
      content.className = "jcem-app-shell-content";
      const footer = one<HTMLElement>(".jcem-chrome-footer");
      for (const child of Array.from(d.body.children)) {
        if (!child.matches(".jcem-chrome-header,.jcem-chrome-footer,.jcem-nav-state,script,.jcem-consent-blocker")) {
          content.appendChild(child);
        }
      }
      shell.append(aside, content);
      d.body.insertBefore(shell, footer ?? null);
      const right = catalog.navigationPosition === "right";
      d.body.classList.add("jcem-has-app-nav");
      d.body.classList.toggle("jcem-has-app-nav-right", right);
    } catch { /* PROTECAO: falha do catalogo nao bloqueia o aplicativo. */ }
  }

  /** Resolve a pagina publica equivalente, inclusive quando o bundle e aberto por `file:`. */
  function publicPageUrl(domain: string): string {
    if (w.location.protocol === "https:" || w.location.protocol === "http:") {
      return `https://${domain}${w.location.pathname.endsWith("/") ? w.location.pathname : `${w.location.pathname}/`}`;
    }

    try {
      const encoded = one<HTMLMetaElement>('meta[name="jcem-app-catalog"]')?.content;
      if (encoded) {
        const catalog = JSON.parse((encoded.match(/\\u[0-9a-f]{4}/gi) ?? []).map((unit) => String.fromCharCode(Number.parseInt(unit.slice(2), 16))).join("")) as {
          apps?: Array<{ href: string; id: string }>;
          currentAppId?: string;
        };
        const href = catalog.apps?.find((app) => app.id === catalog.currentAppId)?.href;
        if (href) return href;
      }
    } catch { /* PROTECAO: metadado offline invalido converge para a raiz publica. */ }

    return `https://${domain}/`;
  }

  /** Busca e valida o indexador com timeout; cada chamada representa uma unica tentativa de rede. */
  async function fetchVersionIndex(url: string, cache: RequestCache): Promise<{ hash: string; timestamp: number }> {
    const controller = new AbortController();
    const timeout = w.setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(url, { cache, headers: { Accept: "application/json" }, signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { hash?: unknown; timestamp?: unknown };
      if (typeof payload.hash !== "string" || !/^[0-9a-f]{40}$/i.test(payload.hash) || !Number.isSafeInteger(payload.timestamp)) {
        throw new Error("Indexador de versao invalido");
      }
      return { hash: payload.hash.toLowerCase(), timestamp: Number(payload.timestamp) };
    } finally {
      w.clearTimeout(timeout);
    }
  }

  /** Executa uma checagem fail-safe por carregamento e alterna somente a classe visual de estado. */
  async function checkForUpdate(container: HTMLElement | null, domain: string): Promise<void> {
    if (updateCheckStarted || !container || __JCEM_BUILD_VERSION__ === "development") return;
    updateCheckStarted = true;
    const endpoint = `https://${domain}/version.json`;
    try {
      let upstream: { hash: string; timestamp: number };
      try {
        upstream = await fetchVersionIndex(endpoint, "no-cache");
      } catch {
        upstream = await fetchVersionIndex(`${endpoint}?t=${Date.now()}`, "no-store");
      }
      container.classList.toggle("has-update", upstream.hash !== __JCEM_BUILD_VERSION__.toLowerCase());
    } catch { /* PROTECAO: atualizacao indisponivel nunca interfere na interface principal. */ }
  }

  function renderChrome(options: ChromeOptions = {}): void {
    removeExistingChrome();

    const seal = guard();
    const domain = options.domain ?? seal.__p3;
    const licenseName = options.licenseName ?? seal.__p4;
    const licenseUrl = options.licenseUrl ?? seal.__p5;
    const brandName = seal.__p2;
    const brandShortName = brandName;
    const authorName = options.authorName ?? options.author ?? seal.__p0;
    const authorUrl = options.authorUrl ?? seal.__p1;
    const authorLogoUrl = options.authorLogoUrl ?? defaultAuthorLogoUrl;
    const authorLink = externalLink(authorUrl, authorName);
    const licenseLink = externalLink(licenseUrl, licenseName, "license noopener noreferrer");
    const autosave = options.autosave === false ? "" : `<span class="ico autosave jcem-autosave" title="${escapeHtml(seal.__p11)}"><span class="jcem-autosave-copy"><span>Local e </span><strong>automático</strong></span><span class="jcem-autosave-icon">${renderIcon({ unicode: "f0c7" })}</span></span>`;
    const updateHint = "há atualização disponível, baixe e substitua";
    const updateIndicator = `<a class="jcem-update-indicator" href="${escapeHtml(publicPageUrl(domain))}" aria-label="${updateHint}" data-jcem-tooltip="${updateHint}">${renderIcon({ unicode: "f019" })}</a>`;
    const mount = typeof options.mountBefore === "string"
      ? one(options.mountBefore)
      : options.mountBefore ?? d.body.firstElementChild;

    const header = d.createElement("header");
    header.className = "jcem-chrome jcem-chrome-header no-print";
    header.innerHTML = `
      <div class="jcem-chrome-identity">
        <a class="jcem-chrome-brand" href="https://${domain}/" aria-label="${escapeHtml(brandName)}"><img class="jcem-global-logo" src="/assets/brand/logo.svg" alt=""><span class="jcem-brand-name" data-full="${escapeHtml(brandName)}" data-short="${escapeHtml(brandShortName)}">${escapeHtml(brandName)}</span></a>
      </div>
      <div class="jcem-chrome-meta">
        ${autosave}
        ${updateIndicator}
      </div>
      <div class="jcem-chrome-header-actions" aria-label="Controles do cabeçalho"></div>
      <div class="jcem-header-overflow">
        <input class="jcem-header-menu-state" id="jcem-header-menu-state" type="checkbox" aria-label="Mostrar controles do cabeçalho">
        <label class="jcem-header-menu-toggle" for="jcem-header-menu-state" aria-label="Mostrar controles do cabeçalho">${renderIcon({ unicode: "f142" })}</label>
        <nav class="menu jcem-chrome-header-overflow" aria-label="Controles adicionais do cabeçalho"></nav>
      </div>
      <div class="jcem-chrome-toolbar-row">
        <nav class="jcem-chrome-toolbar menu jcem-chrome-actions" aria-label="Ferramentas"></nav>
        <div class="jcem-toolbar-overflow">
          <input class="jcem-toolbar-menu-state" id="jcem-toolbar-menu-state" type="checkbox" aria-label="Mostrar ferramentas adicionais">
          <label class="jcem-toolbar-menu-toggle" for="jcem-toolbar-menu-state" aria-label="Mostrar ferramentas adicionais">${renderIcon({ unicode: "f142" })}</label>
          <nav class="menu jcem-chrome-toolbar-overflow" aria-label="Ferramentas adicionais"></nav>
        </div>
      </div>
    `;

    const actions = one<HTMLElement>(".jcem-chrome-actions", header);
    const headerActions = one<HTMLElement>(".jcem-chrome-header-actions", header);
    const headerOverflow = one<HTMLElement>(".jcem-chrome-header-overflow", header);
    const toolbarRow = one<HTMLElement>(".jcem-chrome-toolbar-row", header);
    const toolbarOverflow = one<HTMLElement>(".jcem-chrome-toolbar-overflow", header);

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
        <p>Este site utiliza cookies essenciais e armazenamento local para preferências e dados preenchidos.</p>
      </section>
    `;

    d.body.insertBefore(header, mount ?? null);
    const meta = one<HTMLElement>(".jcem-chrome-meta", header);
    headerActions?.appendChild(initTheme());
    const licenseBadge = d.createElement("a");
    licenseBadge.className = "jcem-license-badge";
    licenseBadge.href = licenseUrl;
    licenseBadge.target = "_blank";
    licenseBadge.rel = "license noopener noreferrer";
    licenseBadge.setAttribute("aria-label", seal.__p9 + licenseName);
    licenseBadge.title = licenseName;
    licenseBadge.innerHTML = mpl2BadgeSvg;
    headerActions?.appendChild(licenseBadge);
    const authorBadge = d.createElement("a");
    authorBadge.className = "jcem-author-badge";
    authorBadge.href = authorUrl;
    authorBadge.target = "_blank";
    authorBadge.rel = "noopener noreferrer";
    authorBadge.setAttribute("aria-label", authorName);
    const authorImage = d.createElement("img");
    authorImage.src = authorLogoUrl;
    authorImage.alt = "";
    authorBadge.appendChild(authorImage);
    headerActions?.appendChild(authorBadge);
    if (actions) {
      renderToolbarFromSlot(actions, options.actionsSelector);
    }
    if (headerActions && headerOverflow) {
      initOverflowGroup(header, headerActions, headerOverflow, ".jcem-header-menu-state", { compactAutosave: true, compactBrand: true });
    }
    if (toolbarRow && actions && toolbarOverflow) {
      initOverflowGroup(toolbarRow, actions, toolbarOverflow, ".jcem-toolbar-menu-state");
    }
    d.body.appendChild(footer);
    void renderAppNavigation();
    initTooltips(header);
    queueMicrotask(() => {
      void checkForUpdate(meta, domain).finally(() => {
        header.dispatchEvent(new Event("jcem:overflow-refresh"));
        toolbarRow?.dispatchEvent(new Event("jcem:overflow-refresh"));
      });
    });
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
