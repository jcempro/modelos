import test from "node:test";
import assert from "node:assert/strict";

import {
  convertDataset,
  parseCsv,
  serializeCsv
} from "../src/assets/js/tabular";

test("bd parser detects delimiter and preserves quoted line breaks", () => {
  const dataset = parseCsv("MCI;Nome;Fone;Obs\r\n1;'Maria Silva';11999990000;'linha 1\r\nlinha 2'\r\n");

  assert.equal(dataset.dialect.delimiter, ";");
  assert.deepEqual(dataset.columns, ["MCI", "Nome", "Fone", "Obs"]);
  assert.equal(dataset.rows.length, 1);
  assert.equal(dataset.rows[0]?.[3], "linha 1\r\nlinha 2");
});

test("bd converts modelo 1 to modelo 2 preserving unknown customer columns", () => {
  const source = parseCsv([
    "MCI;Nome;Fone;Nome 2;Fone 2;Segmento",
    "100;Ana;(11) 1111-0000;Ana Casa;+55 22 22;A",
    "200;Ana;11 1111-0000;;;B"
  ].join("\n"));

  const result = convertDataset(source, "modelo1", "modelo2");

  assert.equal(result.issues.some((issue) => issue.severity === "error"), false);
  assert.deepEqual(result.dataset.columns, ["Fone", "Nome", "MCI", "Segmento", "MCI 2", "Segmento 2"]);
  assert.deepEqual(result.dataset.rows[0], ["1111110000", "Ana", "100", "A", "200", "B"]);
  assert.deepEqual(result.dataset.rows[1], ["552222", "Ana Casa", "100", "A", "", ""]);
});

test("bd asks for name decision when the same phone has divergent names", () => {
  const source = parseCsv([
    "MCI;Nome;Fone",
    "100;Ana Silva;(11) 1111-0000",
    "200;Maria Souza;11 1111-0000"
  ].join("\n"));

  const result = convertDataset(source, "modelo1", "modelo2");

  assert.equal(result.pendingNameDecisions.length, 1);
  assert.deepEqual(result.pendingNameDecisions[0]?.candidates, ["Ana Silva", "Maria Souza"]);
  assert.deepEqual(result.dataset.columns, ["Fone", "Nome", "MCI", "MCI 2"]);
  assert.deepEqual(result.dataset.rows, [
    ["1111110000", "Ana Silva", "100", "200"]
  ]);
});

test("bd applies manual name decisions using phone as the modelo 2 key", () => {
  const source = parseCsv([
    "MCI;Nome;Fone",
    "100;Ana Silva;(11) 1111-0000",
    "200;Maria Souza;11 1111-0000"
  ].join("\n"));

  const result = convertDataset(source, "modelo1", "modelo2", {
    nameDecisions: {
      "1111110000": "Maria Souza"
    }
  });

  assert.equal(result.pendingNameDecisions.length, 0);
  assert.deepEqual(result.dataset.columns, ["Fone", "Nome", "MCI", "MCI 2"]);
  assert.deepEqual(result.dataset.rows, [
    ["1111110000", "Maria Souza", "100", "200"]
  ]);
});

test("bd infers the longest contained name variation automatically", () => {
  const source = parseCsv([
    "MCI;Nome;Fone",
    "100;Ana;(11) 1111-0000",
    "200;Ana Silva;11 1111-0000"
  ].join("\n"));

  const result = convertDataset(source, "modelo1", "modelo2");

  assert.equal(result.pendingNameDecisions.length, 0);
  assert.deepEqual(result.dataset.rows, [
    ["1111110000", "Ana Silva", "100", "200"]
  ]);
});

test("bd canonicalizes denormalized modelo 2 phone/name columns", () => {
  const source = parseCsv([
    "Fone;Nome;Fone 2;Nome 2;MCI;Segmento",
    "(11) 1111-0000;Ana;2222;Ana Casa;100;A"
  ].join("\n"));

  const result = convertDataset(source, "modelo2", "modelo2");

  assert.equal(result.issues.some((issue) => issue.code === "model2-denormalized-pairs"), true);
  assert.deepEqual(result.dataset.columns, ["Fone", "Nome", "MCI", "Segmento"]);
  assert.deepEqual(result.dataset.rows, [
    ["1111110000", "Ana", "100", "A"],
    ["2222", "Ana Casa", "100", "A"]
  ]);
});

test("bd consolidates denormalized modelo 2 rows by phone before export", () => {
  const source = parseCsv([
    "Fone;Nome;Fone 2;Nome 2;MCI;Segmento",
    "(11) 1111-0000;Ana Silva;11 1111-0000;Maria Souza;100;A"
  ].join("\n"));

  const result = convertDataset(source, "modelo2", "modelo2");

  assert.equal(result.pendingNameDecisions.length, 1);
  assert.deepEqual(result.dataset.columns, ["Fone", "Nome", "MCI", "Segmento"]);
  assert.deepEqual(result.dataset.rows, [
    ["1111110000", "Ana Silva", "100", "A"]
  ]);
});

test("bd propagates modelo 2 name decisions when reconstructing modelo 1", () => {
  const source = parseCsv([
    "Fone;Nome;Fone 2;Nome 2;MCI;Segmento",
    "(11) 1111-0000;Ana Silva;11 1111-0000;Maria Souza;100;A"
  ].join("\n"));

  const result = convertDataset(source, "modelo2", "modelo1");

  assert.equal(result.pendingNameDecisions.length, 1);
  assert.deepEqual(result.pendingNameDecisions[0]?.phone, "1111110000");
});

test("bd reconstructs modelo 1 from modelo 2 many-to-many data", () => {
  const source = parseCsv([
    "Fone;Nome;MCI;Segmento;MCI 2;Segmento 2",
    "(11) 1111-0000;Ana;100;A;200;B",
    "2222;Ana Casa;100;A;;"
  ].join("\n"));

  const result = convertDataset(source, "modelo2", "modelo1");

  assert.equal(result.issues.some((issue) => issue.severity === "error"), false);
  assert.deepEqual(result.dataset.columns, ["MCI", "Segmento", "Fone", "Nome", "Fone 2", "Nome 2"]);
  assert.deepEqual(result.dataset.rows[0], ["100", "A", "1111110000", "Ana", "2222", "Ana Casa"]);
  assert.deepEqual(result.dataset.rows[1], ["200", "B", "1111110000", "Ana", "", ""]);
});

test("bd serializer emits UTF-8 BOM and deterministic semicolon CSV", () => {
  const source = parseCsv("MCI,Fone,Nome\n100,1111,Ana\n");
  const csv = serializeCsv(source);

  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.equal(csv.slice(1), "MCI;Fone;Nome\r\n100;1111;Ana\r\n");
});
