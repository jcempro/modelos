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

export type RegimeTributario = "MEI" | "Simples Nacional" | "Lucro Presumido" | "Lucro Real";

export const MEI_LIMIT_CENTS = 8_100_000;
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
  const match = /^(\d{1,2})\/(\d{4})$/.exec(`${value ?? ""}`.trim());

  if (!match) {
    return null;
  }

  const mes = Number.parseInt(match[1] ?? "", 10);
  const ano = Number.parseInt(match[2] ?? "", 10);

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

export function classifyMonth(month: MesAno, reference: MesAno): SituacaoFaturamento {
  return compareMesAno(month, reference) <= 0 ? "REALIZADO" : "PREVISTO";
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
    .sort((left, right) => right.fraction - left.fraction);

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
