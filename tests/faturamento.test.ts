import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPeriod,
  buildPeriodFromStart,
  classifyMonth,
  classifyMonthBySignatureDate,
  distributeCents,
  formatMesAno,
  isRegimeAllowed,
  MEI_LIMIT_CENTS,
  parseCurrencyToCents,
  parseMesAno,
  referenceFromPeriodAndSignature,
  redistributeAnnualValues,
  SIMPLES_NACIONAL_LIMIT_CENTS,
  splitAnnualTargets,
  sumRows,
  type LinhaFaturamento
} from "../src/faturamento/regras";

test("faturamento builds exactly twelve consecutive months ending at reference", () => {
  const reference = parseMesAno("05/2026");
  assert.ok(reference);

  const period = buildPeriod(reference);

  assert.equal(period.length, 12);
  assert.equal(formatMesAno(period[0]!), "06/2025");
  assert.equal(formatMesAno(period[11]!), "05/2026");
});

test("faturamento accepts compatible month-year inputs and normalizes them", () => {
  assert.equal(formatMesAno(parseMesAno("102025")!), "10/2025");
  assert.equal(formatMesAno(parseMesAno("10-2025")!), "10/2025");
  assert.equal(formatMesAno(parseMesAno("10.2025")!), "10/2025");
  assert.equal(formatMesAno(parseMesAno("1 2025")!), "01/2025");
  assert.equal(parseMesAno("13/2025"), null);
  assert.equal(parseMesAno("10/20/25"), null);
});

test("faturamento classifies months from reference", () => {
  const reference = parseMesAno("05/2026");
  const before = parseMesAno("04/2026");
  const same = parseMesAno("05/2026");
  const after = parseMesAno("06/2026");

  assert.ok(reference);
  assert.ok(before);
  assert.ok(same);
  assert.ok(after);
  assert.equal(classifyMonth(before, reference), "REALIZADO");
  assert.equal(classifyMonth(same, reference), "REALIZADO");
  assert.equal(classifyMonth(after, reference), "PREVISTO");
});

test("faturamento builds twelve months from the selected initial month", () => {
  const start = parseMesAno("07/2025");
  assert.ok(start);

  const period = buildPeriodFromStart(start);

  assert.equal(period.length, 12);
  assert.equal(formatMesAno(period[0]!), "07/2025");
  assert.equal(formatMesAno(period[11]!), "06/2026");
});

test("faturamento classifies realized and predicted months from signature date", () => {
  const before = parseMesAno("06/2026");
  const same = parseMesAno("07/2026");
  const after = parseMesAno("08/2026");
  const signature = new Date(2026, 6, 6);

  assert.ok(before);
  assert.ok(same);
  assert.ok(after);
  assert.equal(classifyMonthBySignatureDate(before, signature), "REALIZADO");
  assert.equal(classifyMonthBySignatureDate(same, signature), "PREVISTO");
  assert.equal(classifyMonthBySignatureDate(after, signature), "PREVISTO");
});

test("faturamento derives reference from the last realized visible month", () => {
  const start = parseMesAno("01/2026");
  assert.ok(start);

  const reference = referenceFromPeriodAndSignature(buildPeriodFromStart(start), new Date(2026, 6, 6));

  assert.equal(formatMesAno(reference), "06/2026");
});

test("faturamento distribution is deterministic and reconciles cents", () => {
  const first = distributeCents(674_784_44, 12);
  const second = distributeCents(674_784_44, 12);

  assert.deepEqual(first, second);
  assert.equal(first.reduce((sum, value) => sum + value, 0), 674_784_44);
  assert.equal(first.every((value) => Number.isInteger(value)), true);
  assert.equal(new Set(first).size > 1, true);
});

test("faturamento parses brazilian currency and rejects negatives", () => {
  assert.equal(parseCurrencyToCents("R$ 1.234,56"), 123_456);
  assert.equal(parseCurrencyToCents("1234.56"), 123_456);
  assert.equal(parseCurrencyToCents("-1,00"), null);
});

test("faturamento totals add vista and prazo columns", () => {
  const month = parseMesAno("05/2026");
  assert.ok(month);

  const rows: LinhaFaturamento[] = [
    { mesAno: month, prazoMedio: 30, situacao: "REALIZADO", vendasPrazo: 500, vendasVista: 1000 },
    { mesAno: month, prazoMedio: 30, situacao: "REALIZADO", vendasPrazo: 700, vendasVista: 300 }
  ];

  assert.deepEqual(sumRows(rows), {
    brutoAnual: 2500,
    prazo: 1200,
    vista: 1300
  });
});

test("faturamento splits annual target between vista and prazo", () => {
  assert.deepEqual(splitAnnualTargets(100_00, 100), { prazo: 0, vista: 100_00 });
  assert.deepEqual(splitAnnualTargets(100_00, 70), { prazo: 30_00, vista: 70_00 });
  assert.deepEqual(splitAnnualTargets(101_00, 50), { prazo: 50_50, vista: 50_50 });
});

test("faturamento infers distribution from manual monthly edits when not fixed", () => {
  const result = redistributeAnnualValues(
    [
      { fixarPrazo: true, vendasPrazo: 1_000_00, vendasVista: 1_000_00 },
      { vendasPrazo: 0, vendasVista: 11_000_00 }
    ],
    12_000_00,
    100,
    false
  );

  assert.equal(result.erro, undefined);
  assert.equal(result.totais.brutoAnual, 12_000_00);
  assert.equal(result.totais.prazo, 1_000_00);
  assert.equal(Math.round(result.percentualVista * 100), 9167);
});

test("faturamento preserves imposed annual split when distribution is fixed", () => {
  const result = redistributeAnnualValues(
    [
      { fixarPrazo: true, vendasPrazo: 1_500_00, vendasVista: 1_000_00 },
      { vendasPrazo: 0, vendasVista: 11_000_00 }
    ],
    12_000_00,
    75,
    true
  );

  assert.equal(result.erro, undefined);
  assert.equal(result.totais.brutoAnual, 12_000_00);
  assert.equal(result.totais.vista, 9_000_00);
  assert.equal(result.totais.prazo, 3_000_00);
  assert.equal(result.percentualVista, 75);
});

test("faturamento blocks tax regimes above configured annual limits", () => {
  assert.equal(isRegimeAllowed("MEI", MEI_LIMIT_CENTS), true);
  assert.equal(isRegimeAllowed("MEI", MEI_LIMIT_CENTS + 1), false);
  assert.equal(isRegimeAllowed("Simples Nacional", SIMPLES_NACIONAL_LIMIT_CENTS), true);
  assert.equal(isRegimeAllowed("Simples Nacional", SIMPLES_NACIONAL_LIMIT_CENTS + 1), false);
  assert.equal(isRegimeAllowed("Lucro Presumido", SIMPLES_NACIONAL_LIMIT_CENTS + 1), true);
});
