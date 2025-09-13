export const toISODate = (d: Date) => d.toISOString().slice(0,10);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function diffDays(aISO: string, bISO: string){
  const a = new Date(aISO+"T00:00:00"); const b = new Date(bISO+"T00:00:00");
  return Math.round((+b - +a)/86400000);
}

export function isBetween(dateISO: string, startISO: string, endISO: string){
  return dateISO >= startISO && dateISO <= endISO;
}

export function parseHHmm(hhmm = "22:00", dateISO: string){
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(`${dateISO}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00`);
}