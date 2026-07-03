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
  names: string[];
  occurrences: CustomerOccurrence[];
  phone: string;
}

interface CustomerAggregate {
  attributes: Map<string, string>;
  links: Array<{ name: string; phone: string }>;
}

const defaultIdentifierColumns = ["MCI", "CID", "MGI"];
const generatedDialect: CsvDialect = {
  delimiter: ";",
  encoding: "UTF-8 com BOM",
  hasBom: true,
  quote: "\""
};
const localIdColumn = "id";

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

export function oppositeModel(model: TabularModelKind): TabularModelKind {
  return model === "modelo1" ? "modelo2" : "modelo1";
}

export function inferModelKind(dataset: TabularDataset): TabularModelKind {
  const phoneColumns = collectIndexedColumns(dataset.columns, "fone");
  const nameColumns = collectIndexedColumns(dataset.columns, "nome");
  const hasIndexedPhonePairs = phoneColumns.some((column) => column.index > 1) || nameColumns.some((column) => column.index > 1);
  if (hasIndexedPhonePairs) {
    return "modelo1";
  }

  const hasReplicatedCustomerColumns = dataset.columns
    .filter((column) => !isPairColumn(column) && !isLocalIdColumn(column))
    .some((column) => indexedColumn(column).index > 1);
  if (hasReplicatedCustomerColumns) {
    return "modelo2";
  }

  return "modelo1";
}

export function convertDataset(dataset: TabularDataset, from: TabularModelKind, to: TabularModelKind, options: ConverterOptions = {}): ConversionResult {
  if (from === to) {
    return {
      dataset: cloneDataset(dataset),
      issues: [{
      code: "same-model",
        message: "Origem e destino nao podem ser iguais; escolha o modelo oposto para conversao.",
        severity: "error"
      }],
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
  const identifiers = options.identifierColumns ?? defaultIdentifierColumns;
  const preserveLocalId = shouldPreserveLocalId(identifiers);
  const knownPhoneColumns = collectIndexedColumns(dataset.columns, "fone");
  const knownNameColumns = collectIndexedColumns(dataset.columns, "nome");

  if (knownPhoneColumns.length === 0) {
    return failure(dataset, "missing-phone", "Modelo 1 sem coluna Fone identificavel.");
  }

  const pendingNameDecisions: NameDecision[] = [];
  const aggregates = new Map<string, PhoneAggregate>();

  dataset.rows.forEach((row, rowIndex) => {
    const record = rowToRecord(dataset.columns, row);
    const customerKey = resolveCustomerKey(record, identifiers, rowIndex);
    const customerAttributes = new Map<string, string>();

    for (const column of dataset.columns) {
      if (isPairColumn(column) || (!preserveLocalId && isLocalIdColumn(column))) {
        continue;
      }
      customerAttributes.set(column, record.get(column) ?? "");
    }

    for (const phoneColumn of knownPhoneColumns) {
      const rawPhone = (record.get(phoneColumn.column) ?? "").trim();
      const phone = normalizePhone(rawPhone);
      if (!phone) {
        if (rawPhone) {
          issues.push({
            code: "invalid-phone",
            message: `Linha ${rowIndex + 2}: coluna ${phoneColumn.column} nao contem identificador numerico de telefone.`,
            severity: "warning"
          });
        }
        continue;
      }

      const nameColumn = knownNameColumns.find((item) => item.index === phoneColumn.index)?.column
        ?? (phoneColumn.index === 1 ? findColumn(dataset.columns, "Nome") : findColumn(dataset.columns, `Nome ${phoneColumn.index}`));
      const name = nameColumn ? (record.get(nameColumn) ?? "").trim() : "";
      const aggregate = aggregates.get(phone) ?? { names: [], occurrences: [], phone };

      aggregate.names = appendUnique(aggregate.names, name);
      addCustomerOccurrence(aggregate.occurrences, {
        attributes: customerAttributes,
        index: 0,
        key: customerKey
      });
      aggregates.set(phone, aggregate);
    }
  });

  const occurrenceCount = Math.max(1, ...Array.from(aggregates.values()).map((aggregate) => aggregate.occurrences.length));
  const attributeColumns = dataset.columns.filter((column) => !isPairColumn(column) && (preserveLocalId || !isLocalIdColumn(column)));
  const columns = ["Fone", "Nome", ...expandOccurrenceColumns(attributeColumns, occurrenceCount)];
  const rows: string[][] = [];

  for (const aggregate of sortPhoneAggregates(aggregates)) {
    const chosenName = chooseName(aggregate.phone, aggregate.names, options.nameDecisions, pendingNameDecisions, issues);
    const output = emptyRecord(columns);
    output.set("Fone", aggregate.phone);
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
  const normalized = normalizeModel2Dataset(dataset, options);
  const issues: ConversionIssue[] = [...normalized.issues];
  const phoneColumn = findColumn(normalized.dataset.columns, "Fone");
  const nameColumn = findColumn(normalized.dataset.columns, "Nome");

  if (!phoneColumn) {
    return failure(dataset, "missing-phone", "Modelo 2 sem coluna Fone identificavel.");
  }

  const customerColumns = Array.from(new Set(normalized.dataset.columns
    .filter((column) => !isBase(column, "fone") && !isBase(column, "nome"))
    .map((column) => indexedColumn(column).base)));
  const customers = new Map<string, CustomerAggregate>();

  normalized.dataset.rows.forEach((row, rowIndex) => {
    const record = rowToRecord(normalized.dataset.columns, row);
    const phone = normalizePhone(record.get(phoneColumn)?.trim() ?? "");
    const name = nameColumn ? record.get(nameColumn)?.trim() ?? "" : "";
    const maxOccurrence = maxIndexedOccurrenceForColumns(normalized.dataset.columns.filter((column) => !isPairColumn(column)));

    for (let occurrence = 1; occurrence <= maxOccurrence; occurrence += 1) {
      const attributes = new Map<string, string>();
      for (const column of customerColumns) {
        const value = record.get(occurrence === 1 ? column : `${column} ${occurrence}`) ?? "";
        attributes.set(column, value);
      }

      const key = resolveCustomerKey(attributes, identifiers, rowIndex, occurrence);
      if (key.startsWith("__row_") && !hasAnyValue(attributes)) {
        continue;
      }

      const customer = customers.get(key) ?? { attributes, links: [] };
      mergeMissing(customer.attributes, attributes);
      customer.links = appendUniqueLink(customer.links, { phone, name });
      customers.set(key, customer);
    }
  });

  const maxPhones = Math.max(1, ...Array.from(customers.values()).map((customer) => customer.links.length));
  const columns = [...customerColumns, ...expandPhoneNameColumns(maxPhones)];
  const rows: string[][] = [];

  for (const [, customer] of Array.from(customers.entries()).sort(([left], [right]) => left.localeCompare(right))) {
    const output = emptyRecord(columns);
    for (const column of customerColumns) {
      output.set(column, customer.attributes.get(column) ?? "");
    }

    customer.links.forEach((link, index) => {
      output.set(index === 0 ? "Fone" : `Fone ${index + 1}`, link.phone);
      output.set(index === 0 ? "Nome" : `Nome ${index + 1}`, link.name);
    });

    rows.push(columns.map((column) => output.get(column) ?? ""));
  }

  if (rows.length === 0) {
    issues.push({ code: "empty-output", message: "Nenhum cliente reconstruido a partir do Modelo 2.", severity: "warning" });
  }

  return {
    dataset: { columns, dialect: generatedDialect, rows },
    issues,
    pendingNameDecisions: normalized.pendingNameDecisions
  };
}

function normalizeModel2Dataset(dataset: TabularDataset, options: ConverterOptions): ConversionResult {
  const identifiers = options.identifierColumns ?? defaultIdentifierColumns;
  const preserveLocalId = shouldPreserveLocalId(identifiers);
  const issues: ConversionIssue[] = [];
  const knownPhoneColumns = collectIndexedColumns(dataset.columns, "fone");
  const knownNameColumns = collectIndexedColumns(dataset.columns, "nome");
  const phoneColumn = knownPhoneColumns[0]?.column;

  if (!phoneColumn) {
    return failure(dataset, "missing-phone", "Modelo 2 sem coluna Fone identificavel.");
  }

  if (knownPhoneColumns.length > 1 || knownNameColumns.length > 1) {
    issues.push({
      code: "model2-denormalized-pairs",
      message: "Modelo 2 continha multiplas colunas Fone/Nome; os telefones foram consolidados em linhas canonicas.",
      severity: "warning"
    });
  }

  const customerColumns = Array.from(new Set(dataset.columns
    .filter((column) => !isPairColumn(column) && (preserveLocalId || !isLocalIdColumn(column)))
    .map((column) => indexedColumn(column).base)));
  const maxCustomerOccurrence = maxIndexedOccurrenceForColumns(dataset.columns.filter((column) => !isPairColumn(column)));
  const pendingNameDecisions: NameDecision[] = [];
  const aggregates = new Map<string, PhoneAggregate>();

  dataset.rows.forEach((row, rowIndex) => {
    const record = rowToRecord(dataset.columns, row);
    const occurrences = collectCustomerOccurrences(record, customerColumns, identifiers, rowIndex, maxCustomerOccurrence);

    for (const phoneItem of knownPhoneColumns) {
      const rawPhone = (record.get(phoneItem.column) ?? "").trim();
      const phone = normalizePhone(rawPhone);
      if (!phone) {
        if (rawPhone) {
          issues.push({
            code: "invalid-phone",
            message: `Linha ${rowIndex + 2}: coluna ${phoneItem.column} nao contem identificador numerico de telefone.`,
            severity: "warning"
          });
        }
        continue;
      }

      const nameColumn = knownNameColumns.find((item) => item.index === phoneItem.index)?.column
        ?? (phoneItem.index === 1 ? findColumn(dataset.columns, "Nome") : findColumn(dataset.columns, `Nome ${phoneItem.index}`));
      const name = nameColumn ? (record.get(nameColumn) ?? "").trim() : "";
      const aggregate = aggregates.get(phone) ?? { names: [], occurrences: [], phone };
      aggregate.names = appendUnique(aggregate.names, name);
      for (const occurrence of occurrences) {
        addCustomerOccurrence(aggregate.occurrences, occurrence);
      }
      aggregates.set(phone, aggregate);
    }
  });

  const occurrenceCount = Math.max(1, ...Array.from(aggregates.values()).map((aggregate) => aggregate.occurrences.length));
  const columns = ["Fone", "Nome", ...expandOccurrenceColumns(customerColumns, occurrenceCount)];
  const rows = sortPhoneAggregates(aggregates).map((aggregate) => {
    const chosenName = chooseName(aggregate.phone, aggregate.names, options.nameDecisions, pendingNameDecisions, issues);
    const output = emptyRecord(columns);
    output.set("Fone", aggregate.phone);
    output.set("Nome", chosenName);
    aggregate.occurrences.forEach((occurrence, index) => {
      for (const column of customerColumns) {
        const outputColumn = index === 0 ? column : `${column} ${index + 1}`;
        output.set(outputColumn, occurrence.attributes.get(column) ?? "");
      }
    });
    return columns.map((column) => output.get(column) ?? "");
  });

  if (rows.length === 0) {
    issues.push({ code: "empty-output", message: "Nenhum telefone identificado no Modelo 2.", severity: "warning" });
  }

  return {
    dataset: { columns, dialect: generatedDialect, rows },
    issues,
    pendingNameDecisions
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

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function findColumn(columns: string[], expected: string): string | undefined {
  const normalized = normalizeKey(expected);
  return columns.find((column) => normalizeKey(column) === normalized);
}

function isBase(column: string, base: string): boolean {
  return Boolean(indexedColumnForBase(column, base));
}

function isPairColumn(column: string): boolean {
  return isBase(column, "fone") || isBase(column, "nome");
}

function isLocalIdColumn(column: string): boolean {
  return normalizeKey(indexedColumn(column).base) === localIdColumn;
}

function shouldPreserveLocalId(identifiers: string[]): boolean {
  return identifiers.some((identifier) => normalizeKey(identifier) === localIdColumn);
}

function indexedColumn(column: string): { base: string; index: number } {
  const match = /^(.*?)(?:\s+(\d+))?$/.exec(column.trim());
  const base = match?.[1]?.trim() || column.trim();
  const index = Number.parseInt(match?.[2] ?? "1", 10);
  return { base, index: Number.isFinite(index) && index > 0 ? index : 1 };
}

function collectIndexedColumns(columns: string[], base: string): Array<{ column: string; index: number }> {
  return columns
    .map((column) => indexedColumnForBase(column, base))
    .filter((item): item is { column: string; index: number } => Boolean(item))
    .sort((left, right) => left.index - right.index);
}

function indexedColumnForBase(column: string, expectedBase: string): { column: string; index: number } | null {
  const spaced = indexedColumn(column);
  const expected = normalizeKey(expectedBase);
  if (normalizeKey(spaced.base) === expected) {
    return { column, index: spaced.index };
  }

  const compact = /^(.*?)(\d+)$/.exec(column.trim());
  const compactBase = compact?.[1]?.trim() ?? "";
  const compactIndex = Number.parseInt(compact?.[2] ?? "1", 10);
  if (compactBase && normalizeKey(compactBase) === expected && Number.isFinite(compactIndex) && compactIndex > 0) {
    return { column, index: compactIndex };
  }

  return null;
}

function resolveCustomerKey(record: Map<string, string>, identifiers: string[], rowIndex: number, occurrence = 1): string {
  for (const identifier of identifiers) {
    const column = findColumn([...record.keys()], identifier);
    const value = column ? record.get(column)?.trim() : "";
    if (value) {
      return `${normalizeKey(identifier)}:${value}`;
    }
  }

  return `__row_${rowIndex + 1}_${occurrence}`;
}

function appendUniqueLink(values: Array<{ name: string; phone: string }>, value: { name: string; phone: string }): Array<{ name: string; phone: string }> {
  return values.some((item) => normalizePhone(item.phone) === normalizePhone(value.phone)) ? values : [...values, value];
}

function appendUnique(values: string[], value: string): string[] {
  if (!value.trim()) {
    return values;
  }
  return values.some((item) => normalizeKey(item) === normalizeKey(value)) ? values : [...values, value];
}

function collectCustomerOccurrences(
  record: Map<string, string>,
  customerColumns: string[],
  identifiers: string[],
  rowIndex: number,
  maxOccurrence: number
): CustomerOccurrence[] {
  const occurrences: CustomerOccurrence[] = [];

  for (let occurrence = 1; occurrence <= maxOccurrence; occurrence += 1) {
    const attributes = new Map<string, string>();
    for (const column of customerColumns) {
      attributes.set(column, record.get(occurrence === 1 ? column : `${column} ${occurrence}`) ?? "");
    }

    if (!hasAnyValue(attributes)) {
      continue;
    }

    occurrences.push({
      attributes,
      index: occurrence,
      key: resolveCustomerKey(attributes, identifiers, rowIndex, occurrence)
    });
  }

  return occurrences;
}

function addCustomerOccurrence(occurrences: CustomerOccurrence[], occurrence: CustomerOccurrence): void {
  const existing = occurrences.find((item) => item.key === occurrence.key);
  if (existing) {
    mergeMissing(existing.attributes, occurrence.attributes);
    return;
  }

  occurrences.push({
    attributes: new Map(occurrence.attributes),
    index: occurrences.length + 1,
    key: occurrence.key
  });
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

function sortPhoneAggregates(aggregates: Map<string, PhoneAggregate>): PhoneAggregate[] {
  return Array.from(aggregates.values()).sort((left, right) => left.phone.localeCompare(right.phone));
}

function chooseName(
  phone: string,
  names: string[],
  decisions: Record<string, string> | undefined,
  pending: NameDecision[],
  issues: ConversionIssue[]
): string {
  if (names.length === 0) {
    return "";
  }

  const decided = decisions?.[phone]?.trim();
  if (decided) {
    return decided;
  }

  const normalized = new Map(names.map((name) => [normalizeKey(name), name]));
  if (normalized.size === 1) {
    return names[0] ?? "";
  }

  const ordered = [...names].sort((left, right) => right.length - left.length || left.localeCompare(right));
  const longest = ordered[0] ?? "";
  const longestKey = normalizeKey(longest);
  const allContained = names.every((name) => {
    const key = normalizeKey(name);
    return longestKey.includes(key) || key.includes(longestKey);
  });

  if (allContained) {
    return longest;
  }

  pending.push({ candidates: names, chosenName: names[0] ?? "", phone });
  issues.push({
    code: "name-decision",
    message: `Telefone ${phone} possui nomes divergentes e requer decisao do usuario.`,
    severity: "decision"
  });
  return names[0] ?? "";
}

function maxIndexedOccurrenceForColumns(columns: string[]): number {
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
