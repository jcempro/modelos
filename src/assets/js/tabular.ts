export type TabularModelKind = "modelo1" | "modelo2";

export interface CsvDialect {
  delimiter: string;
  encoding: string;
  hasBom: boolean;
  quote: "'" | "\"";
}

export interface TabularDataset {
  columns: string[];
  dialect: CsvDialect;
  rows: string[][];
}

export interface ConversionIssue {
  code: string;
  message: string;
  severity: "error" | "info" | "warning" | "decision";
}

export interface NameDecision {
  chosenName: string;
  candidates: string[];
  phone: string;
}

export interface ConversionResult {
  dataset: TabularDataset;
  issues: ConversionIssue[];
  pendingNameDecisions: NameDecision[];
}

export interface ConverterOptions {
  identifierColumns?: string[];
  nameDecisions?: Record<string, string>;
}

interface CustomerOccurrence {
  attributes: Map<string, string>;
  index: number;
  key: string;
}

interface PhoneAggregate {
  occurrences: CustomerOccurrence[];
  originalPhone: string;
  names: string[];
}

const defaultIdentifierColumns = ["MCI", "CID", "MGI"];
const generatedDialect: CsvDialect = {
  delimiter: ";",
  encoding: "UTF-8 com BOM",
  hasBom: true,
  quote: "\""
};

export function decodeTextBuffer(buffer: ArrayBuffer): { dialect: Pick<CsvDialect, "encoding" | "hasBom">; text: string } {
  const bytes = new Uint8Array(buffer);
  const hasBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const body = hasBom ? bytes.slice(3) : bytes;

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    return {
      dialect: { encoding: hasBom ? "UTF-8 com BOM" : "UTF-8", hasBom },
      text
    };
  } catch (_error) {
    return {
      dialect: { encoding: "ANSI/Windows-1252", hasBom: false },
      text: new TextDecoder("windows-1252").decode(bytes)
    };
  }
}

export function parseCsv(text: string, encoding = "UTF-8"): TabularDataset {
  const normalized = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(normalized);
  const quote = detectQuote(normalized);
  const rows = parseCsvRows(normalized, delimiter);
  const firstRow = rows[0] ?? [];
  const columns = firstRow.map((column, index) => normalizeHeader(column, index));
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim().length > 0));

  return {
    columns,
    dialect: {
      delimiter,
      encoding,
      hasBom: text.charCodeAt(0) === 0xfeff,
      quote
    },
    rows: dataRows.map((row) => normalizeRowLength(row, columns.length))
  };
}

export function serializeCsv(dataset: TabularDataset): string {
  const delimiter = generatedDialect.delimiter;
  const lines = [dataset.columns, ...dataset.rows].map((row) => row.map((cell) => quoteCsvCell(cell, delimiter)).join(delimiter));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function convertDataset(dataset: TabularDataset, from: TabularModelKind, to: TabularModelKind, options: ConverterOptions = {}): ConversionResult {
  if (from === to) {
    return {
      dataset: cloneDataset(dataset),
      issues: [{ code: "same-model", message: "Origem e destino sao iguais; dados preservados sem transformacao.", severity: "info" }],
      pendingNameDecisions: []
    };
  }

  return from === "modelo1" ? convertModel1ToModel2(dataset, options) : convertModel2ToModel1(dataset, options);
}

function detectDelimiter(text: string): string {
  const candidates = [",", ";", "\t", "|", ":"];
  const lines = sampleLines(text);
  let best = ";";
  let bestScore = -1;

  for (const candidate of candidates) {
    const counts = lines.map((line) => splitCsvLine(line, candidate).length).filter((count) => count > 1);
    if (counts.length === 0) {
      continue;
    }

    const first = counts[0] ?? 0;
    const consistent = counts.filter((count) => count === first).length;
    const score = consistent * 100 + first;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

function detectQuote(text: string): "'" | "\"" {
  const doubleQuotes = (text.match(/"/g) ?? []).length;
  const singleQuotes = (text.match(/'/g) ?? []).length;
  return singleQuotes > doubleQuotes ? "'" : "\"";
}

function sampleLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let quote: string | null = null;

  for (let index = 0; index < text.length && lines.length < 8; index += 1) {
    const char = text[index] ?? "";
    const next = text[index + 1] ?? "";

    if ((char === "\"" || char === "'") && (!quote || quote === char)) {
      if (quote === char && next === char) {
        current += char + next;
        index += 1;
        continue;
      }
      quote = quote ? null : char;
    }

    if (!quote && (char === "\n" || char === "\r")) {
      if (current.trim()) {
        lines.push(current);
      }
      current = "";
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      continue;
    }

    current += char;
  }

  if (current.trim() && lines.length < 8) {
    lines.push(current);
  }

  return lines;
}

function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quote: string | null = null;
  let atCellStart = true;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? "";
    const next = text[index + 1] ?? "";

    if (quote) {
      if (char === quote) {
        if (next === quote) {
          cell += char;
          index += 1;
        } else {
          quote = null;
        }
        continue;
      }
      cell += char;
      continue;
    }

    if ((char === "\"" || char === "'") && (atCellStart || cell.trim().length === 0)) {
      quote = char;
      atCellStart = false;
      continue;
    }

    if (char === delimiter) {
      row.push(cell.trim());
      cell = "";
      atCellStart = true;
      continue;
    }

    if (char === "\n" || char === "\r") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      atCellStart = true;
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      continue;
    }

    cell += char;
    atCellStart = false;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  return parseCsvRows(line, delimiter)[0] ?? [];
}

function normalizeHeader(value: string, index: number): string {
  const trimmed = value.replace(/^\uFEFF/, "").trim();
  return trimmed || `Coluna ${index + 1}`;
}

function normalizeRowLength(row: string[], length: number): string[] {
  return Array.from({ length }, (_item, index) => row[index] ?? "");
}

function quoteCsvCell(value: string, delimiter: string): string {
  const cell = value ?? "";
  if (!cell.includes(delimiter) && !/["\r\n]/.test(cell) && !/^\s|\s$/.test(cell)) {
    return cell;
  }
  return `"${cell.replace(/"/g, "\"\"")}"`;
}

function cloneDataset(dataset: TabularDataset): TabularDataset {
  return {
    columns: [...dataset.columns],
    dialect: { ...dataset.dialect },
    rows: dataset.rows.map((row) => [...row])
  };
}

function convertModel1ToModel2(dataset: TabularDataset, options: ConverterOptions): ConversionResult {
  const issues: ConversionIssue[] = [];
  const pendingNameDecisions: NameDecision[] = [];
  const identifiers = options.identifierColumns ?? defaultIdentifierColumns;
  const knownPhoneColumns = collectIndexedColumns(dataset.columns, "fone");
  const knownNameColumns = collectIndexedColumns(dataset.columns, "nome");

  if (knownPhoneColumns.length === 0) {
    return failure(dataset, "missing-phone", "Modelo 1 sem coluna Fone identificavel.");
  }

  const aggregates = new Map<string, PhoneAggregate>();

  dataset.rows.forEach((row, rowIndex) => {
    const record = rowToRecord(dataset.columns, row);
    const customerKey = resolveCustomerKey(record, identifiers, rowIndex);
    const customerAttributes = new Map<string, string>();

    for (const column of dataset.columns) {
      if (isPairColumn(column)) {
        continue;
      }
      customerAttributes.set(column, record.get(column) ?? "");
    }

    for (const phoneColumn of knownPhoneColumns) {
      const phone = (record.get(phoneColumn.column) ?? "").trim();
      if (!phone) {
        continue;
      }

      const nameColumn = knownNameColumns.find((item) => item.index === phoneColumn.index)?.column
        ?? (phoneColumn.index === 1 ? findColumn(dataset.columns, "Nome") : findColumn(dataset.columns, `Nome ${phoneColumn.index}`));
      const name = nameColumn ? (record.get(nameColumn) ?? "").trim() : "";
      const phoneKey = normalizePhoneKey(phone);
      const aggregate = aggregates.get(phoneKey) ?? { occurrences: [], originalPhone: phone, names: [] };

      aggregate.names = appendUnique(aggregate.names, name);
      aggregate.occurrences.push({
        attributes: customerAttributes,
        index: aggregate.occurrences.length + 1,
        key: customerKey
      });
      aggregates.set(phoneKey, aggregate);
    }
  });

  const occurrenceCount = Math.max(1, ...Array.from(aggregates.values()).map((aggregate) => aggregate.occurrences.length));
  const attributeColumns = dataset.columns.filter((column) => !isPairColumn(column));
  const columns = ["Fone", "Nome", ...expandOccurrenceColumns(attributeColumns, occurrenceCount)];
  const rows: string[][] = [];

  for (const [phoneKey, aggregate] of sortAggregates(aggregates)) {
    const chosenName = chooseName(phoneKey, aggregate.names, options.nameDecisions, pendingNameDecisions, issues);
    const output = emptyRecord(columns);
    output.set("Fone", aggregate.originalPhone);
    output.set("Nome", chosenName);

    aggregate.occurrences.forEach((occurrence, index) => {
      for (const column of attributeColumns) {
        const outputColumn = index === 0 ? column : `${column} ${index + 1}`;
        output.set(outputColumn, occurrence.attributes.get(column) ?? "");
      }
    });

    rows.push(columns.map((column) => output.get(column) ?? ""));
  }

  return {
    dataset: { columns, dialect: generatedDialect, rows },
    issues,
    pendingNameDecisions
  };
}

function convertModel2ToModel1(dataset: TabularDataset, options: ConverterOptions): ConversionResult {
  const identifiers = options.identifierColumns ?? defaultIdentifierColumns;
  const issues: ConversionIssue[] = [];
  const phoneColumn = findColumn(dataset.columns, "Fone");
  const nameColumn = findColumn(dataset.columns, "Nome");

  if (!phoneColumn) {
    return failure(dataset, "missing-phone", "Modelo 2 sem coluna Fone identificavel.");
  }

  const customerColumns = Array.from(new Set(dataset.columns
    .filter((column) => !isBase(column, "fone") && !isBase(column, "nome"))
    .map((column) => indexedColumn(column).base)));
  const customers = new Map<string, { attributes: Map<string, string>; names: string[]; phones: string[] }>();

  dataset.rows.forEach((row, rowIndex) => {
    const record = rowToRecord(dataset.columns, row);
    const phone = record.get(phoneColumn)?.trim() ?? "";
    const name = nameColumn ? record.get(nameColumn)?.trim() ?? "" : "";
    const maxOccurrence = maxIndexedOccurrence(dataset.columns);

    for (let occurrence = 1; occurrence <= maxOccurrence; occurrence += 1) {
      const attributes = new Map<string, string>();
      for (const column of customerColumns) {
        const value = record.get(occurrence === 1 ? column : `${column} ${occurrence}`) ?? "";
        attributes.set(column, value);
      }

      const key = resolveCustomerKey(attributes, identifiers, rowIndex);
      if (key.startsWith("__row_") && !hasAnyValue(attributes)) {
        continue;
      }

      const customer = customers.get(key) ?? { attributes, names: [], phones: [] };
      mergeMissing(customer.attributes, attributes);
      customer.phones = appendUnique(customer.phones, phone);
      customer.names = appendUnique(customer.names, name);
      customers.set(key, customer);
    }
  });

  const maxPhones = Math.max(1, ...Array.from(customers.values()).map((customer) => customer.phones.length));
  const columns = [...customerColumns, ...expandPhoneNameColumns(maxPhones)];
  const rows: string[][] = [];

  for (const [, customer] of Array.from(customers.entries()).sort(([left], [right]) => left.localeCompare(right))) {
    const output = emptyRecord(columns);
    for (const column of customerColumns) {
      output.set(column, customer.attributes.get(column) ?? "");
    }

    customer.phones.forEach((phone, index) => {
      output.set(index === 0 ? "Fone" : `Fone ${index + 1}`, phone);
      output.set(index === 0 ? "Nome" : `Nome ${index + 1}`, customer.names[index] ?? customer.names[0] ?? "");
    });

    rows.push(columns.map((column) => output.get(column) ?? ""));
  }

  if (rows.length === 0) {
    issues.push({ code: "empty-output", message: "Nenhum cliente reconstruido a partir do Modelo 2.", severity: "warning" });
  }

  return {
    dataset: { columns, dialect: generatedDialect, rows },
    issues,
    pendingNameDecisions: []
  };
}

function failure(source: TabularDataset, code: string, message: string): ConversionResult {
  return {
    dataset: cloneDataset(source),
    issues: [{ code, message, severity: "error" }],
    pendingNameDecisions: []
  };
}

function rowToRecord(columns: string[], row: string[]): Map<string, string> {
  const record = new Map<string, string>();
  columns.forEach((column, index) => record.set(column, row[index] ?? ""));
  return record;
}

function emptyRecord(columns: string[]): Map<string, string> {
  return new Map(columns.map((column) => [column, ""]));
}

function normalizeKey(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function normalizePhoneKey(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  return digits || normalizeKey(value);
}

function findColumn(columns: string[], expected: string): string | undefined {
  const normalized = normalizeKey(expected);
  return columns.find((column) => normalizeKey(column) === normalized);
}

function isBase(column: string, base: string): boolean {
  return normalizeKey(indexedColumn(column).base) === normalizeKey(base);
}

function isPairColumn(column: string): boolean {
  return isBase(column, "fone") || isBase(column, "nome");
}

function indexedColumn(column: string): { base: string; index: number } {
  const match = /^(.*?)(?:\s+(\d+))?$/.exec(column.trim());
  const base = match?.[1]?.trim() || column.trim();
  const index = Number.parseInt(match?.[2] ?? "1", 10);
  return { base, index: Number.isFinite(index) && index > 0 ? index : 1 };
}

function collectIndexedColumns(columns: string[], base: string): Array<{ column: string; index: number }> {
  return columns
    .map((column) => ({ column, ...indexedColumn(column) }))
    .filter((item) => normalizeKey(item.base) === normalizeKey(base))
    .sort((left, right) => left.index - right.index);
}

function resolveCustomerKey(record: Map<string, string>, identifiers: string[], rowIndex: number): string {
  for (const identifier of identifiers) {
    const column = findColumn([...record.keys()], identifier);
    const value = column ? record.get(column)?.trim() : "";
    if (value) {
      return `${normalizeKey(identifier)}:${value}`;
    }
  }

  return `__row_${rowIndex + 1}`;
}

function appendUnique(values: string[], value: string): string[] {
  if (!value.trim()) {
    return values;
  }
  return values.some((item) => normalizeKey(item) === normalizeKey(value)) ? values : [...values, value];
}

function expandOccurrenceColumns(columns: string[], count: number): string[] {
  const expanded: string[] = [];
  for (let occurrence = 1; occurrence <= count; occurrence += 1) {
    for (const column of columns) {
      expanded.push(occurrence === 1 ? column : `${column} ${occurrence}`);
    }
  }
  return expanded;
}

function expandPhoneNameColumns(count: number): string[] {
  const columns: string[] = [];
  for (let index = 1; index <= count; index += 1) {
    columns.push(index === 1 ? "Fone" : `Fone ${index}`);
    columns.push(index === 1 ? "Nome" : `Nome ${index}`);
  }
  return columns;
}

function sortAggregates(aggregates: Map<string, PhoneAggregate>): Array<[string, PhoneAggregate]> {
  return Array.from(aggregates.entries()).sort((left, right) => left[1].originalPhone.localeCompare(right[1].originalPhone));
}

function chooseName(
  phoneKey: string,
  names: string[],
  decisions: Record<string, string> | undefined,
  pending: NameDecision[],
  issues: ConversionIssue[]
): string {
  if (names.length === 0) {
    return "";
  }

  if (decisions?.[phoneKey]) {
    return decisions[phoneKey] ?? "";
  }

  const normalized = new Map(names.map((name) => [normalizeKey(name), name]));
  if (normalized.size === 1) {
    return names[0] ?? "";
  }

  const ordered = [...names].sort((left, right) => right.length - left.length || left.localeCompare(right));
  const longest = ordered[0] ?? "";
  const allContained = names.every((name) => normalizeKey(longest).includes(normalizeKey(name)) || normalizeKey(name).includes(normalizeKey(longest)));

  if (allContained) {
    return longest;
  }

  pending.push({ candidates: names, chosenName: names[0] ?? "", phone: phoneKey });
  issues.push({
    code: "name-decision",
    message: `Telefone ${phoneKey} possui nomes divergentes e requer decisao do usuario.`,
    severity: "decision"
  });
  return names[0] ?? "";
}

function maxIndexedOccurrence(columns: string[]): number {
  return Math.max(1, ...columns.map((column) => indexedColumn(column).index));
}

function hasAnyValue(record: Map<string, string>): boolean {
  return [...record.values()].some((value) => value.trim().length > 0);
}

function mergeMissing(target: Map<string, string>, source: Map<string, string>): void {
  for (const [key, value] of source) {
    if (!target.get(key) && value) {
      target.set(key, value);
    }
  }
}
