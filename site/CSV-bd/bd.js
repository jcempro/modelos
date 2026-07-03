"use strict";
(() => {
  var defaultIdentifierColumns = ["MCI", "CID", "MGI"];
  var generatedDialect = {
    delimiter: ";",
    encoding: "UTF-8 com BOM",
    hasBom: true,
    quote: '"'
  };
  function decodeTextBuffer(buffer) {
    const bytes = new Uint8Array(buffer);
    const hasBom = bytes.length >= 3 && bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191;
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
  function parseCsv(text, encoding = "UTF-8") {
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
        hasBom: text.charCodeAt(0) === 65279,
        quote
      },
      rows: dataRows.map((row) => normalizeRowLength(row, columns.length))
    };
  }
  function serializeCsv(dataset) {
    const delimiter = generatedDialect.delimiter;
    const lines = [dataset.columns, ...dataset.rows].map((row) => row.map((cell) => quoteCsvCell(cell, delimiter)).join(delimiter));
    return `\uFEFF${lines.join("\r\n")}\r
`;
  }
  function convertDataset(dataset, from, to, options = {}) {
    if (from === to) {
      const result = from === "modelo2" ? normalizeModel2Dataset(dataset, options) : normalizeModel1Dataset(dataset);
      result.issues.unshift({
        code: "same-model",
        message: "Origem e destino sao iguais; estrutura validada e telefones normalizados conforme o modelo.",
        severity: "info"
      });
      return {
        dataset: result.dataset,
        issues: result.issues,
        pendingNameDecisions: result.pendingNameDecisions
      };
    }
    return from === "modelo1" ? convertModel1ToModel2(dataset, options) : convertModel2ToModel1(dataset, options);
  }
  function detectDelimiter(text) {
    const candidates = [",", ";", "	", "|", ":"];
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
  function detectQuote(text) {
    const doubleQuotes = (text.match(/"/g) ?? []).length;
    const singleQuotes = (text.match(/'/g) ?? []).length;
    return singleQuotes > doubleQuotes ? "'" : '"';
  }
  function sampleLines(text) {
    const lines = [];
    let current = "";
    let quote = null;
    for (let index = 0; index < text.length && lines.length < 8; index += 1) {
      const char = text[index] ?? "";
      const next = text[index + 1] ?? "";
      if ((char === '"' || char === "'") && (!quote || quote === char)) {
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
  function parseCsvRows(text, delimiter) {
    const rows = [];
    let row = [];
    let cell = "";
    let quote = null;
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
      if ((char === '"' || char === "'") && (atCellStart || cell.trim().length === 0)) {
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
  function splitCsvLine(line, delimiter) {
    return parseCsvRows(line, delimiter)[0] ?? [];
  }
  function normalizeHeader(value, index) {
    const trimmed = value.replace(/^\uFEFF/, "").trim();
    return trimmed || `Coluna ${index + 1}`;
  }
  function normalizeRowLength(row, length) {
    return Array.from({ length }, (_item, index) => row[index] ?? "");
  }
  function quoteCsvCell(value, delimiter) {
    const cell = value ?? "";
    if (!cell.includes(delimiter) && !/["\r\n]/.test(cell) && !/^\s|\s$/.test(cell)) {
      return cell;
    }
    return `"${cell.replace(/"/g, '""')}"`;
  }
  function cloneDataset(dataset) {
    return {
      columns: [...dataset.columns],
      dialect: { ...dataset.dialect },
      rows: dataset.rows.map((row) => [...row])
    };
  }
  function convertModel1ToModel2(dataset, options) {
    const issues = [];
    const identifiers = options.identifierColumns ?? defaultIdentifierColumns;
    const knownPhoneColumns = collectIndexedColumns(dataset.columns, "fone");
    const knownNameColumns = collectIndexedColumns(dataset.columns, "nome");
    if (knownPhoneColumns.length === 0) {
      return failure(dataset, "missing-phone", "Modelo 1 sem coluna Fone identificavel.");
    }
    const pendingNameDecisions = [];
    const aggregates = /* @__PURE__ */ new Map();
    dataset.rows.forEach((row, rowIndex) => {
      const record = rowToRecord(dataset.columns, row);
      const customerKey = resolveCustomerKey(record, identifiers, rowIndex);
      const customerAttributes = /* @__PURE__ */ new Map();
      for (const column of dataset.columns) {
        if (isPairColumn(column)) {
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
        const nameColumn = knownNameColumns.find((item) => item.index === phoneColumn.index)?.column ?? (phoneColumn.index === 1 ? findColumn(dataset.columns, "Nome") : findColumn(dataset.columns, `Nome ${phoneColumn.index}`));
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
    const attributeColumns = dataset.columns.filter((column) => !isPairColumn(column));
    const columns = ["Fone", "Nome", ...expandOccurrenceColumns(attributeColumns, occurrenceCount)];
    const rows = [];
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
  function convertModel2ToModel1(dataset, options) {
    const identifiers = options.identifierColumns ?? defaultIdentifierColumns;
    const normalized = normalizeModel2Dataset(dataset, options);
    const issues = [...normalized.issues];
    const phoneColumn = findColumn(normalized.dataset.columns, "Fone");
    const nameColumn = findColumn(normalized.dataset.columns, "Nome");
    if (!phoneColumn) {
      return failure(dataset, "missing-phone", "Modelo 2 sem coluna Fone identificavel.");
    }
    const customerColumns = Array.from(new Set(normalized.dataset.columns.filter((column) => !isBase(column, "fone") && !isBase(column, "nome")).map((column) => indexedColumn(column).base)));
    const customers = /* @__PURE__ */ new Map();
    normalized.dataset.rows.forEach((row, rowIndex) => {
      const record = rowToRecord(normalized.dataset.columns, row);
      const phone = normalizePhone(record.get(phoneColumn)?.trim() ?? "");
      const name = nameColumn ? record.get(nameColumn)?.trim() ?? "" : "";
      const maxOccurrence = maxIndexedOccurrenceForColumns(normalized.dataset.columns.filter((column) => !isPairColumn(column)));
      for (let occurrence = 1; occurrence <= maxOccurrence; occurrence += 1) {
        const attributes = /* @__PURE__ */ new Map();
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
    const rows = [];
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
  function normalizeModel1Dataset(dataset) {
    const issues = [];
    return {
      dataset: {
        columns: [...dataset.columns],
        dialect: { ...dataset.dialect },
        rows: dataset.rows.map((row, rowIndex) => dataset.columns.map((column, columnIndex) => {
          const value = row[columnIndex] ?? "";
          if (!isBase(column, "fone")) {
            return value;
          }
          const phone = normalizePhone(value);
          if (!phone && value.trim()) {
            issues.push({
              code: "invalid-phone",
              message: `Linha ${rowIndex + 2}: coluna ${column} nao contem identificador numerico de telefone.`,
              severity: "warning"
            });
          }
          return phone;
        }))
      },
      issues,
      pendingNameDecisions: []
    };
  }
  function normalizeModel2Dataset(dataset, options) {
    const identifiers = options.identifierColumns ?? defaultIdentifierColumns;
    const issues = [];
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
    const customerColumns = Array.from(new Set(dataset.columns.filter((column) => !isPairColumn(column)).map((column) => indexedColumn(column).base)));
    const maxCustomerOccurrence = maxIndexedOccurrenceForColumns(dataset.columns.filter((column) => !isPairColumn(column)));
    const pendingNameDecisions = [];
    const aggregates = /* @__PURE__ */ new Map();
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
        const nameColumn = knownNameColumns.find((item) => item.index === phoneItem.index)?.column ?? (phoneItem.index === 1 ? findColumn(dataset.columns, "Nome") : findColumn(dataset.columns, `Nome ${phoneItem.index}`));
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
  function failure(source, code, message) {
    return {
      dataset: cloneDataset(source),
      issues: [{ code, message, severity: "error" }],
      pendingNameDecisions: []
    };
  }
  function rowToRecord(columns, row) {
    const record = /* @__PURE__ */ new Map();
    columns.forEach((column, index) => record.set(column, row[index] ?? ""));
    return record;
  }
  function emptyRecord(columns) {
    return new Map(columns.map((column) => [column, ""]));
  }
  function normalizeKey(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  }
  function normalizePhone(value) {
    return value.replace(/\D/g, "");
  }
  function findColumn(columns, expected) {
    const normalized = normalizeKey(expected);
    return columns.find((column) => normalizeKey(column) === normalized);
  }
  function isBase(column, base) {
    return normalizeKey(indexedColumn(column).base) === normalizeKey(base);
  }
  function isPairColumn(column) {
    return isBase(column, "fone") || isBase(column, "nome");
  }
  function indexedColumn(column) {
    const match = /^(.*?)(?:\s+(\d+))?$/.exec(column.trim());
    const base = match?.[1]?.trim() || column.trim();
    const index = Number.parseInt(match?.[2] ?? "1", 10);
    return { base, index: Number.isFinite(index) && index > 0 ? index : 1 };
  }
  function collectIndexedColumns(columns, base) {
    return columns.map((column) => ({ column, ...indexedColumn(column) })).filter((item) => normalizeKey(item.base) === normalizeKey(base)).sort((left, right) => left.index - right.index);
  }
  function resolveCustomerKey(record, identifiers, rowIndex, occurrence = 1) {
    for (const identifier of identifiers) {
      const column = findColumn([...record.keys()], identifier);
      const value = column ? record.get(column)?.trim() : "";
      if (value) {
        return `${normalizeKey(identifier)}:${value}`;
      }
    }
    return `__row_${rowIndex + 1}_${occurrence}`;
  }
  function appendUniqueLink(values, value) {
    return values.some((item) => normalizePhone(item.phone) === normalizePhone(value.phone)) ? values : [...values, value];
  }
  function appendUnique(values, value) {
    if (!value.trim()) {
      return values;
    }
    return values.some((item) => normalizeKey(item) === normalizeKey(value)) ? values : [...values, value];
  }
  function collectCustomerOccurrences(record, customerColumns, identifiers, rowIndex, maxOccurrence) {
    const occurrences = [];
    for (let occurrence = 1; occurrence <= maxOccurrence; occurrence += 1) {
      const attributes = /* @__PURE__ */ new Map();
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
  function addCustomerOccurrence(occurrences, occurrence) {
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
  function expandOccurrenceColumns(columns, count) {
    const expanded = [];
    for (let occurrence = 1; occurrence <= count; occurrence += 1) {
      for (const column of columns) {
        expanded.push(occurrence === 1 ? column : `${column} ${occurrence}`);
      }
    }
    return expanded;
  }
  function expandPhoneNameColumns(count) {
    const columns = [];
    for (let index = 1; index <= count; index += 1) {
      columns.push(index === 1 ? "Fone" : `Fone ${index}`);
      columns.push(index === 1 ? "Nome" : `Nome ${index}`);
    }
    return columns;
  }
  function sortPhoneAggregates(aggregates) {
    return Array.from(aggregates.values()).sort((left, right) => left.phone.localeCompare(right.phone));
  }
  function chooseName(phone, names, decisions, pending, issues) {
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
  function maxIndexedOccurrenceForColumns(columns) {
    return Math.max(1, ...columns.map((column) => indexedColumn(column).index));
  }
  function hasAnyValue(record) {
    return [...record.values()].some((value) => value.trim().length > 0);
  }
  function mergeMissing(target, source) {
    for (const [key, value] of source) {
      if (!target.get(key) && value) {
        target.set(key, value);
      }
    }
  }
  (function bootstrapBd(w, d) {
    "use strict";
    let sourceDataset = null;
    let currentResult = null;
    const nameDecisions = {};
    function one(selector) {
      const element = d.querySelector(selector);
      if (!element) {
        throw new Error(`Elemento obrigatorio ausente: ${selector}`);
      }
      return element;
    }
    function ready(handler) {
      if (d.readyState === "loading") {
        d.addEventListener("DOMContentLoaded", handler);
        return;
      }
      handler();
    }
    function input(selector) {
      return one(selector);
    }
    function textarea(selector) {
      return one(selector);
    }
    function select(selector) {
      return one(selector);
    }
    function button(selector) {
      return one(selector);
    }
    function model(selector) {
      const value = select(selector).value;
      return value === "modelo1" ? "modelo1" : "modelo2";
    }
    function identifiers() {
      const values = input("#identifier-columns").value.split(",").map((value) => value.trim()).filter(Boolean);
      return values.length > 0 ? values : ["MCI", "CID", "MGI"];
    }
    function log(message, severity = "info") {
      const item = d.createElement("li");
      item.className = severity;
      item.textContent = `[${(/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR")}] ${message}`;
      one("#logs").appendChild(item);
      item.scrollIntoView({ block: "nearest" });
    }
    function clearLogs() {
      one("#logs").innerHTML = "";
    }
    function setOutput(value) {
      textarea("#csv-output").value = value;
      button("#download").disabled = value.length === 0;
    }
    function updateSummary(source, target, dataset) {
      const cells = Array.from(one("#summary").querySelectorAll("span"));
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
    function readSourceText() {
      return textarea("#csv-text").value.trim();
    }
    function parseSource() {
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
    function convert() {
      clearLogs();
      setOutput("");
      hideDecisions();
      log("Inicio da conversao.");
      sourceDataset = parseSource();
      if (!sourceDataset) {
        updateSummary("-", "-", null);
        return;
      }
      const from = model("#source-model");
      const to = model("#target-model");
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
    function labelDelimiter(value) {
      if (value === "	") {
        return "TAB";
      }
      return value;
    }
    function renderDecisions(decisions) {
      const container = one("#decisions");
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
        const choices = Array.from(container.querySelectorAll("select[data-phone]"));
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
    function hideDecisions() {
      const container = one("#decisions");
      container.hidden = true;
      container.innerHTML = "";
    }
    async function loadFile(file) {
      clearLogs();
      setOutput("");
      hideDecisions();
      log(`Lendo arquivo ${file.name}.`);
      const decoded = decodeTextBuffer(await file.arrayBuffer());
      textarea("#csv-text").value = decoded.text;
      log(`Codificacao detectada: ${decoded.dialect.encoding}.`);
    }
    function swapModels() {
      const source = select("#source-model");
      const target = select("#target-model");
      const previous = source.value;
      source.value = target.value;
      target.value = previous;
      log(`Direcao alterada para ${source.options[source.selectedIndex]?.text ?? source.value} -> ${target.options[target.selectedIndex]?.text ?? target.value}.`);
    }
    function clearAll() {
      sourceDataset = null;
      currentResult = null;
      for (const key of Object.keys(nameDecisions)) {
        delete nameDecisions[key];
      }
      textarea("#csv-text").value = "";
      setOutput("");
      updateSummary("-", "-", null);
      hideDecisions();
      clearLogs();
      log("Estado limpo.");
    }
    function downloadCsv() {
      const content = textarea("#csv-output").value;
      if (!content || !currentResult) {
        log("Nao ha CSV convertido para baixar.", "warning");
        return;
      }
      const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = d.createElement("a");
      link.href = url;
      link.download = `modelo-convertido-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
      d.body.appendChild(link);
      link.click();
      d.body.removeChild(link);
      URL.revokeObjectURL(url);
      log("Arquivo CSV preparado para download.");
    }
    async function copyLog() {
      const text = Array.from(one("#logs").querySelectorAll("li")).map((item) => item.textContent ?? "").join("\n");
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
      button("#swap").addEventListener("click", swapModels);
      button("#clear").addEventListener("click", clearAll);
      button("#download").addEventListener("click", downloadCsv);
      button("#copy-log").addEventListener("click", () => void copyLog());
      log("Ferramenta pronta para conversao local.");
    });
  })(window, document);
})();
