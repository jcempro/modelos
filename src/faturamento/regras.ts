export type SituacaoFaturamento = "REALIZADO" | "PREVISTO";

export interface MesAno {
  mes: number;
  ano: number;
}

export interface LinhaFaturamento {
  mesAno: MesAno;
  prazoMedio: number;
  situacao: SituacaoFaturamento;
  vendasPrazo: number;
  vendasVista: number;
}

export interface TotaisFaturamento {
  brutoAnual: number;
  prazo: number;
  vista: number;
}

export interface LinhaRedistribuicao {
  fixarPrazo?: boolean;
  fixarVista?: boolean;
  vendasPrazo: number;
  vendasVista: number;
}

export interface ResultadoRedistribuicao {
  erro?: string;
  linhas: Array<{ vendasPrazo: number; vendasVista: number }>;
  percentualVista: number;
  totais: TotaisFaturamento;
}

export type RegimeTributario = "MEI" | "Simples Nacional" | "Lucro Presumido" | "Lucro Real";

export const MEI_LIMIT_CENTS = 8_100_000;
export const MONTHLY_DISTRIBUTION_TOLERANCE_PERCENT = 40;
export const SIMPLES_NACIONAL_LIMIT_CENTS = 480_000_000;

const currencyFormatter = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  style: "percent"
});

export function onlyDigits(value: string): string {
  return (value || "").replace(/[^\d]/g, "");
}

export function parseCurrencyToCents(value: string): number | null {
  const raw = `${value ?? ""}`.trim();

  if (!raw) {
    return 0;
  }

  if (/^-/.test(raw) || /\(\s*R?\$?/.test(raw)) {
    return null;
  }

  const cleaned = raw.replace(/[^\d,.-]/g, "");
  const hasComma = cleaned.includes(",");
  const decimalSeparator = hasComma ? "," : cleaned.lastIndexOf(".") > -1 ? "." : "";
  let normalized = cleaned;

  if (decimalSeparator === ",") {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (decimalSeparator === ".") {
    const lastDot = cleaned.lastIndexOf(".");
    normalized = `${cleaned.slice(0, lastDot).replace(/\./g, "")}.${cleaned.slice(lastDot + 1)}`;
  }

  const parsed = Number.parseFloat(normalized.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function formatCurrencyFromCents(value: number): string {
  return currencyFormatter.format(Math.max(0, Math.round(value)) / 100);
}

export function parsePercent(value: string): number | null {
  const raw = `${value ?? ""}`.trim();

  if (!raw) {
    return 0;
  }

  if (/^-/.test(raw)) {
    return null;
  }

  const normalized = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return parsed;
}

export function formatPercent(value: number): string {
  return percentFormatter.format(Math.min(100, Math.max(0, value)) / 100);
}

export function splitAnnualTargets(total: number, vistaPercent: number): { prazo: number; vista: number } {
  const normalizedTotal = Math.max(0, Math.round(total));
  const normalizedPercent = Math.min(100, Math.max(0, Number.isFinite(vistaPercent) ? vistaPercent : 100));
  const vista = Math.round((normalizedTotal * normalizedPercent) / 100);

  return {
    prazo: normalizedTotal - vista,
    vista
  };
}

function sumLocked(linhas: LinhaRedistribuicao[], column: "prazo" | "vista"): number {
  return linhas.reduce((sum, linha) => {
    const locked = column === "vista" ? linha.fixarVista : linha.fixarPrazo;
    const value = column === "vista" ? linha.vendasVista : linha.vendasPrazo;
    return sum + (locked ? Math.max(0, Math.round(value)) : 0);
  }, 0);
}

function sumUnlocked(linhas: LinhaRedistribuicao[], column: "prazo" | "vista"): number {
  return linhas.reduce((sum, linha) => {
    const locked = column === "vista" ? linha.fixarVista : linha.fixarPrazo;
    const value = column === "vista" ? linha.vendasVista : linha.vendasPrazo;
    return sum + (!locked ? Math.max(0, Math.round(value)) : 0);
  }, 0);
}

function distributeColumn(
  linhas: LinhaRedistribuicao[],
  column: "prazo" | "vista",
  target: number
): { erro?: string; values: number[] } {
  const normalizedTarget = Math.max(0, Math.round(target));
  const values = linhas.map((linha) => Math.max(0, Math.round(column === "vista" ? linha.vendasVista : linha.vendasPrazo)));
  const locked = linhas.map((linha) => Boolean(column === "vista" ? linha.fixarVista : linha.fixarPrazo));
  const lockedTotal = values.reduce((sum, value, index) => sum + (locked[index] ? value : 0), 0);
  const unlockedIndexes = locked
    .map((isLocked, index) => ({ index, isLocked }))
    .filter((item) => !item.isLocked)
    .map((item) => item.index);

  if (normalizedTarget === 0) {
    return { values: values.map(() => 0) };
  }

  if (lockedTotal > normalizedTarget) {
    return { erro: "Valores fixados superam a meta da coluna.", values };
  }

  if (unlockedIndexes.length === 0) {
    return lockedTotal === normalizedTarget
      ? { values }
      : { erro: "Todos os valores da coluna estao fixados e nao reconciliam a meta.", values };
  }

  const distributed = distributeCents(normalizedTarget - lockedTotal, unlockedIndexes.length);
  const next = [...values];
  unlockedIndexes.forEach((rowIndex, index) => {
    next[rowIndex] = distributed[index] ?? 0;
  });

  return { values: next };
}

function calculateTotalsFromRedistribution(linhas: Array<{ vendasPrazo: number; vendasVista: number }>): TotaisFaturamento {
  return sumRows(linhas.map((linha) => ({
    mesAno: { ano: 2000, mes: 1 },
    prazoMedio: 0,
    situacao: "REALIZADO",
    vendasPrazo: linha.vendasPrazo,
    vendasVista: linha.vendasVista
  })));
}

function monthlyToleranceError(
  linhas: Array<{ vendasPrazo: number; vendasVista: number }>,
  vistaPercent: number
): string | undefined {
  const minimum = Math.max(0, vistaPercent - MONTHLY_DISTRIBUTION_TOLERANCE_PERCENT);
  const maximum = Math.min(100, vistaPercent + MONTHLY_DISTRIBUTION_TOLERANCE_PERCENT);
  const invalidIndex = linhas.findIndex((linha) => {
    const total = linha.vendasVista + linha.vendasPrazo;
    if (total <= 0) {
      return false;
    }
    const share = (linha.vendasVista / total) * 100;
    return share < minimum - 0.01 || share > maximum + 0.01;
  });

  if (invalidIndex < 0) {
    return undefined;
  }

  return `A distribuicao do mes ${invalidIndex + 1} excede a tolerancia de ${MONTHLY_DISTRIBUTION_TOLERANCE_PERCENT}% em relacao ao percentual global fixado.`;
}

export function redistributeAnnualValues(
  linhas: LinhaRedistribuicao[],
  total: number,
  vistaPercent: number,
  fixarDistribuicao: boolean
): ResultadoRedistribuicao {
  const normalizedTotal = Math.max(0, Math.round(total));
  const safePercent = Math.min(100, Math.max(0, Number.isFinite(vistaPercent) ? vistaPercent : 100));

  if (linhas.length === 0) {
    return {
      linhas: [],
      percentualVista: safePercent,
      totais: { brutoAnual: 0, prazo: 0, vista: 0 }
    };
  }

  if (fixarDistribuicao) {
    const targets = splitAnnualTargets(normalizedTotal, safePercent);
    const vista = distributeColumn(linhas, "vista", targets.vista);
    const prazo = distributeColumn(linhas, "prazo", targets.prazo);
    const output = linhas.map((_linha, index) => ({
      vendasPrazo: prazo.values[index] ?? 0,
      vendasVista: vista.values[index] ?? 0
    }));
    const totals = calculateTotalsFromRedistribution(output);
    const erro = vista.erro || prazo.erro || monthlyToleranceError(output, safePercent);

    return {
      erro,
      linhas: output,
      percentualVista: safePercent,
      totais: totals
    };
  }

  const lockedVista = sumLocked(linhas, "vista");
  const lockedPrazo = sumLocked(linhas, "prazo");
  const lockedTotal = lockedVista + lockedPrazo;

  if (lockedTotal > normalizedTotal) {
    const output = linhas.map((linha) => ({
      vendasPrazo: Math.max(0, Math.round(linha.vendasPrazo)),
      vendasVista: Math.max(0, Math.round(linha.vendasVista))
    }));
    return {
      erro: "Valores informados pelo usuario superam o faturamento anual.",
      linhas: output,
      percentualVista: normalizedTotal > 0 ? (calculateTotalsFromRedistribution(output).vista / normalizedTotal) * 100 : safePercent,
      totais: calculateTotalsFromRedistribution(output)
    };
  }

  const remaining = normalizedTotal - lockedTotal;
  const unlockedVista = sumUnlocked(linhas, "vista");
  const unlockedPrazo = sumUnlocked(linhas, "prazo");
  const hasUnlockedVista = linhas.some((linha) => !linha.fixarVista);
  const hasUnlockedPrazo = linhas.some((linha) => !linha.fixarPrazo);
  let residualVistaPercent = safePercent;

  if (hasUnlockedVista && !hasUnlockedPrazo) {
    residualVistaPercent = 100;
  } else if (!hasUnlockedVista && hasUnlockedPrazo) {
    residualVistaPercent = 0;
  } else if (unlockedVista + unlockedPrazo > 0) {
    residualVistaPercent = (unlockedVista / (unlockedVista + unlockedPrazo)) * 100;
  }

  const residualTargets = splitAnnualTargets(remaining, residualVistaPercent);
  const vista = distributeColumn(linhas, "vista", lockedVista + residualTargets.vista);
  const prazo = distributeColumn(linhas, "prazo", lockedPrazo + residualTargets.prazo);
  const output = linhas.map((_linha, index) => ({
    vendasPrazo: prazo.values[index] ?? 0,
    vendasVista: vista.values[index] ?? 0
  }));
  const totals = calculateTotalsFromRedistribution(output);

  return {
    erro: vista.erro || prazo.erro,
    linhas: output,
    percentualVista: normalizedTotal > 0 ? (totals.vista / normalizedTotal) * 100 : safePercent,
    totais: totals
  };
}

export function isRegimeAllowed(regime: string, annualCents: number | null): boolean {
  if (!regime || annualCents === null || annualCents <= 0) {
    return true;
  }

  if (regime === "MEI") {
    return annualCents <= MEI_LIMIT_CENTS;
  }

  if (regime === "Simples Nacional") {
    return annualCents <= SIMPLES_NACIONAL_LIMIT_CENTS;
  }

  return true;
}

export function parseMesAno(value: string): MesAno | null {
  const raw = `${value ?? ""}`.trim();
  const separated = /^(\d{1,2})\D+(\d{4})$/.exec(raw);
  const compact = /^\d{5,6}$/.test(raw) ? raw : "";

  if (!separated && !compact) {
    return null;
  }

  const mesText = separated ? (separated[1] ?? "") : compact.slice(0, compact.length - 4);
  const anoText = separated ? (separated[2] ?? "") : compact.slice(-4);
  const mes = Number.parseInt(mesText, 10);
  const ano = Number.parseInt(anoText, 10);

  if (mes < 1 || mes > 12 || ano < 1900 || ano > 2999) {
    return null;
  }

  return { ano, mes };
}

export function formatMesAno(value: MesAno): string {
  return `${`${value.mes}`.padStart(2, "0")}/${value.ano}`;
}

export function compareMesAno(left: MesAno, right: MesAno): number {
  return (left.ano * 12 + left.mes) - (right.ano * 12 + right.mes);
}

export function addMonths(value: MesAno, amount: number): MesAno {
  const zeroBased = (value.ano * 12) + (value.mes - 1) + amount;
  const ano = Math.floor(zeroBased / 12);
  const mes = (zeroBased % 12) + 1;

  return { ano, mes };
}

export function monthFromDate(date: Date): MesAno {
  return { ano: date.getFullYear(), mes: date.getMonth() + 1 };
}

export function previousClosedMonth(date: Date): MesAno {
  const candidate = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return { ano: candidate.getFullYear(), mes: candidate.getMonth() + 1 };
}

export function buildPeriod(reference: MesAno, count = 12): MesAno[] {
  if (count < 1) {
    return [];
  }

  const start = addMonths(reference, -(count - 1));
  return Array.from({ length: count }, (_item, index) => addMonths(start, index));
}

export function buildPeriodFromStart(start: MesAno, count = 12): MesAno[] {
  if (count < 1) {
    return [];
  }

  return Array.from({ length: count }, (_item, index) => addMonths(start, index));
}

export function classifyMonth(month: MesAno, reference: MesAno): SituacaoFaturamento {
  return compareMesAno(month, reference) <= 0 ? "REALIZADO" : "PREVISTO";
}

export function classifyMonthBySignatureDate(month: MesAno, signatureDate: Date): SituacaoFaturamento {
  return compareMesAno(month, monthFromDate(signatureDate)) < 0 ? "REALIZADO" : "PREVISTO";
}

export function referenceFromPeriodAndSignature(period: MesAno[], signatureDate: Date): MesAno {
  const lastRealized = [...period]
    .reverse()
    .find((month) => classifyMonthBySignatureDate(month, signatureDate) === "REALIZADO");

  return lastRealized ?? previousClosedMonth(signatureDate);
}

export function distributeCents(total: number, count = 12): number[] {
  const normalizedTotal = Math.max(0, Math.round(total));

  if (count < 1) {
    return [];
  }

  if (normalizedTotal === 0) {
    return Array.from({ length: count }, () => 0);
  }

  const weights = Array.from({ length: count }, (_item, index) => {
    const trend = 0.86 + (index * 0.025);
    const wave = [0.02, -0.035, 0.045, -0.025, 0.03, -0.015][index % 6] ?? 0;
    const late = index > count * 0.65 ? 0.035 : 0;
    return Math.max(0.1, trend + wave + late);
  });
  const weightTotal = weights.reduce((sum, item) => sum + item, 0);
  const exact = weights.map((weight) => (normalizedTotal * weight) / weightTotal);
  const cents = exact.map(Math.floor);
  let remainder = normalizedTotal - cents.reduce((sum, item) => sum + item, 0);
  const order = exact
    .map((value, index) => ({ fraction: value - Math.floor(value), index }))
    .sort((left, right) => {
      const byFraction = right.fraction - left.fraction;
      return byFraction === 0 ? left.index - right.index : byFraction;
    });

  for (const item of order) {
    if (remainder <= 0) {
      break;
    }
    cents[item.index] = (cents[item.index] ?? 0) + 1;
    remainder -= 1;
  }

  return cents;
}

export function sumRows(rows: LinhaFaturamento[]): TotaisFaturamento {
  const totals = rows.reduce<TotaisFaturamento>(
    (acc, row) => ({
      brutoAnual: acc.brutoAnual + row.vendasVista + row.vendasPrazo,
      prazo: acc.prazo + row.vendasPrazo,
      vista: acc.vista + row.vendasVista
    }),
    { brutoAnual: 0, prazo: 0, vista: 0 }
  );

  return {
    brutoAnual: Math.round(totals.brutoAnual),
    prazo: Math.round(totals.prazo),
    vista: Math.round(totals.vista)
  };
}
