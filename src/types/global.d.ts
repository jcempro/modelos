export {};

declare global {
  namespace JSX {
    interface Element {
      readonly __jsxElementBrand: unique symbol;
    }

    interface IntrinsicElements {
      [elementName: string]: Record<string, unknown>;
    }
  }

  interface HTMLInputElement {
    tratando?: boolean;
  }

  interface Window {
    JCEMDocumentos?: JCEMDocumentosApi;
    $?: ZeptoStatic;
    html2pdf?: Html2PdfFactory | { default?: Html2PdfFactory };
    Zepto?: ZeptoStatic;
    isNum?: (value: unknown) => boolean;
  }

  interface JCEMDocumentosApi {
    $: <T extends Element = Element>(selector: string, root?: ParentNode) => T[];
    one: <T extends Element = Element>(selector: string, root?: ParentNode) => T | null;
    attr: (element: Element | null, key: string, value?: string) => string | true | undefined | Element;
    on: (element: EventTarget | null, eventName: string, handler: EventListenerOrEventListenerObject) => void;
    ready: (handler: () => void) => void;
    storage: Storage;
    validators: ValidatorCatalogApi;
    base64: {
      encode: (value: string) => string;
      decode: (value: string) => string;
    };
    query: {
      get: (names: string | string[]) => string;
      apply: (options: QueryApplyOptions) => boolean;
      json: (names?: string[]) => Record<string, unknown> | null;
    };
    validate: {
      input: (input: HTMLInputElement, shouldNormalize: boolean, config?: ValidationConfig, onlyAttribute?: string | null) => ValidationResult;
      all: (options?: ValidateAllOptions) => boolean;
    };
    autosave: {
      init: (options?: AutosaveOptions) => void;
      indicator: (selector?: string) => void;
      clearAutoFields: (options?: ClearFieldsOptions) => void;
    };
    print: {
      createPageStyle: (pageConfig: PageConfig) => void;
      pdf: (options: PrintPdfOptions) => void;
      withPrintMode: (callback: (restore: () => void) => void, options?: PrintModeOptions) => void;
    };
    image: {
      load: (options: StoredImageOptions) => void;
      bindUpload: (options: ImageUploadOptions) => void;
    };
    toolbar: {
      bind: (actions: Record<string, (event: Event) => void>) => void;
    };
    date: {
      current: (selector: string) => void;
    };
    clipboard: {
      copy: (value: string) => Promise<void>;
    };
    bundle: {
      bindDownload: (selector?: string) => void;
    };
    chrome: {
      render: (options?: ChromeOptions) => void;
    };
    share: {
      bindToolbar: (selector: string, options?: ShareOptions) => void;
      buildUrl: (mode: ShareMode, options?: ShareOptions, event?: Event) => ShareBuildResult;
      run: (options?: ShareOptions, event?: Event) => Promise<ShareResult | null>;
    };
    util: {
      digits: (value: string) => string;
      capitalizeFirst: (value: string) => string;
    };
  }

  type ValidationResult = 0 | -1 | string;
  type ValidatorFn = (value: string) => ValidationResult;

  interface ValidatorCatalogApi {
    catalog: Record<string, ValidatorFn>;
    mod11: (number: string, multipliers: string | number[], rawRemainder?: boolean) => number;
    cep: ValidatorFn;
    currency: ValidatorFn;
    mobile: ValidatorFn;
    phone: ValidatorFn;
    cnpj: ValidatorFn;
    cpf: ValidatorFn;
  }

  interface FieldRule {
    hint?: string;
    message?: string;
    pattern?: string;
    required?: boolean;
    selector?: string;
    type?: string;
    uppercase?: boolean;
    validate?: ValidatorFn | false;
    validator?: string | ValidatorFn | false;
  }

  interface ValidationConfig {
    customValidators?: Record<string, ValidatorFn>;
    emptyFieldMessage?: string;
    fields?: Record<string, FieldRule>;
    fieldRules?: FieldRule[];
    messages?: Record<string, string>;
    rules?: FieldRule[];
    uppercaseFields?: string[];
  }

  interface ValidateAllOptions {
    onlyAttribute?: string;
    root?: ParentNode;
    selector?: string;
    validation?: ValidationConfig;
  }

  interface AutosaveOptions {
    idPrefix?: string;
    root?: ParentNode;
    selector?: string;
    storage?: Storage;
    validation?: ValidationConfig;
  }

  interface ClearFieldsOptions {
    idPattern?: RegExp;
    removeStorage?: boolean;
    root?: ParentNode;
    selector?: string;
    storage?: Storage;
  }

  interface PageConfig {
    bottom: number;
    left: number;
    right: number;
    size: [number, number];
    top: number;
    unit: "cm" | "mm" | "in" | "pt";
  }

  interface PrintModeOptions {
    printClass?: string;
  }

  interface PrintPdfOptions extends PrintModeOptions {
    filename?: string | (() => string);
    orientation?: "portrait" | "landscape";
    pageConfig: PageConfig;
    scale?: number;
    source?: Element;
  }

  interface ChromeOptions {
    actionsSelector?: string;
    author?: string;
    domain?: string;
    licenseName?: string;
    licenseUrl?: string;
    mountBefore?: Element | string | null;
  }

  interface PdfOptions {
    filename: string;
    html2canvas: { scale: number };
    image: { quality: number; type: "jpeg" | "png" | "webp" };
    jsPDF: { format: [number, number]; orientation: "portrait" | "landscape"; unit: string };
    margin: [number, number, number, number];
  }

  type Html2PdfFactory = (source: Element, options: PdfOptions) => void;

  interface StoredImageOptions {
    key?: string;
    selector: string;
    storage?: Storage;
  }

  interface ImageUploadOptions extends StoredImageOptions {
    inputSelector: string;
  }

  interface QueryFieldMapping {
    jsonKeys?: string | string[];
    params?: string | string[];
    sanitizeRegex?: RegExp;
    selector: string;
  }

  interface QueryStorageMapping {
    afterSet?: () => void;
    jsonKeys?: string | string[];
    key: string;
    params: string | string[];
  }

  interface QueryApplyOptions {
    fields?: QueryFieldMapping[];
    jsonParamNames?: string[];
    reload?: boolean;
    storage?: Storage;
    storageMappings?: QueryStorageMapping[];
  }

  interface ZeptoCollection {
    append: (html: string) => ZeptoCollection;
    css: (property: string, value: string) => ZeptoCollection;
    each: (callback: (index: number, element: Element | string) => void) => ZeptoCollection;
  }

  interface ZeptoStatic {
    (selector: string | string[]): ZeptoCollection;
  }

  type ShareMode = "clean" | "filled";

  interface ShareMessages {
    copiedClean?: string;
    copiedFilled?: string;
    failed?: string;
    question?: string;
  }

  interface ShareContext {
    cleanUrl: string;
    event?: Event;
    mode: ShareMode;
    payload?: Record<string, unknown>;
    url?: string;
  }

  interface ShareBuildResult {
    cleanUrl: string;
    mode: ShareMode;
    payload?: Record<string, unknown>;
    url: string;
  }

  interface ShareResult extends ShareBuildResult {
    copied: boolean;
  }

  interface ShareOptions {
    afterShare?: (result: ShareResult) => void;
    beforeShare?: (context: ShareContext) => boolean | void;
    cleanUrl?: string | (() => string);
    dataParamName?: string;
    extendPayload?: (payload: Record<string, unknown>, context: ShareContext) => Record<string, unknown> | void | null;
    fieldSelector?: string;
    messages?: ShareMessages;
    payload?: () => Record<string, unknown> | null | undefined;
    promptMode?: (context: ShareContext) => ShareMode | null;
    root?: ParentNode | string;
  }
}
