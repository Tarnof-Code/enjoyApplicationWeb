/** Date locale → `YYYY-MM-DD` pour les paramètres d’API. */
export function dateVersChaineISO(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** Borne une date `YYYY-MM-DD` entre min et max (inclus), par ordre lexicographic ISO. */
export function clampDateISO(dateStr: string, minStr: string, maxStr: string): string {
    if (dateStr < minStr) return minStr;
    if (dateStr > maxStr) return maxStr;
    return dateStr;
}

/** Normalise une valeur `dateRepas` renvoyée par l’API en `YYYY-MM-DD`. */
export function normaliserDateRepasISO(dateRepas: string): string {
    if (!dateRepas || typeof dateRepas !== "string") return "";
    const s = dateRepas.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const t = s.indexOf("T");
    if (t === 10) return s.slice(0, 10);
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s.slice(0, 10) : dateVersChaineISO(d);
}

/** Toutes les dates comprises entre deux bornes ISO inclusives (segment valide). */
export function enumererDatesISOInclusif(debutISO: string, finISO: string): string[] {
    if (!debutISO || !finISO) return debutISO ? [debutISO] : [];
    const start = debutISO <= finISO ? debutISO : finISO;
    const end = debutISO <= finISO ? finISO : debutISO;
    const out: string[] = [];
    let cur = start;
    const maxJours = 370;
    let n = 0;
    while (cur <= end && n++ < maxJours) {
        out.push(cur);
        const dt = new Date(`${cur}T12:00:00`);
        dt.setDate(dt.getDate() + 1);
        cur = dateVersChaineISO(dt);
    }
    return out;
}
