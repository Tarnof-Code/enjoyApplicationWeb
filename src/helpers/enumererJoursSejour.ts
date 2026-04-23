/** Jours du séjour inclus, en yyyy-MM-dd (dates locales, sans décalage UTC). */
function toYyyyMmDdLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/**
 * Ramène toute forme de date renvoyée par l'API (LocalDate, ISO, tableau Jackson) à `yyyy-MM-dd`
 * pour comparer la cellule et les colonnes du planning.
 */
export function normaliserJourPlanningPourCle(v: unknown): string {
    if (v == null) return "";
    if (Array.isArray(v) && v.length >= 3) {
        const y = Number(v[0]);
        const mo = Number(v[1]);
        const d = Number(v[2]);
        if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(d)) {
            return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
    }
    if (typeof v === "string") {
        const s = v.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const d = new Date(s);
        if (!Number.isNaN(d.getTime())) return toYyyyMmDdLocal(d);
        const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m) return m[1]!;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
        const d = new Date(v);
        if (!Number.isNaN(d.getTime())) return toYyyyMmDdLocal(d);
    }
    return String(v);
}

export function enumererJoursSejour(dateDebut: string | number, dateFin: string | number): string[] {
    const d0 = new Date(dateDebut);
    const d1 = new Date(dateFin);
    const cur = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
    const end = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const out: string[] = [];
    while (cur <= end) {
        out.push(toYyyyMmDdLocal(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return out;
}
