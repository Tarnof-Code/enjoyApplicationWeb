export function parseDate(date: string | Date | number | undefined | null): Date | null {
    if (!date) return null;

    let newDate: Date;

    // Si c'est un nombre, vérifier si c'est en secondes ou millisecondes
    if (typeof date === "number") {
        // Si le nombre est très petit (< 10000000000), c'est probablement en secondes Unix
        // Sinon c'est en millisecondes
        if (date < 10000000000) {
            // Timestamp en secondes, convertir en millisecondes
            newDate = new Date(date * 1000);
        } else {
            // Timestamp en millisecondes
            newDate = new Date(date);
        }
    } else if (typeof date === "string") {
        const trimmed = date.trim();
        // Chaîne uniquement numérique : souvent epoch (secondes ou ms) sérialisé depuis l'API
        if (/^\d+$/.test(trimmed)) {
            const n = Number(trimmed);
            if (!Number.isNaN(n)) {
                newDate = n < 10000000000 ? new Date(n * 1000) : new Date(n);
            } else {
                newDate = new Date(date);
            }
        } else {
            // ISO 8601 ou autre format reconnu par Date
            newDate = new Date(date);
        }
    } else {
        newDate = new Date(date);
    }

    return isNaN(newDate.getTime()) ? null : newDate;
}

export default function formaterDate(date: string | Date | number | undefined | null): string {
    const newDate = parseDate(date);
    
    if (!newDate) {
        return date ? "Date invalide" : "";
    }
    
    return newDate.toLocaleDateString();
};