/**
 * Convertit une date en string ISO 8601 pour l'API
 * Gère tous les formats possibles :
 * - String ISO 8601 (déjà au bon format) → retourné tel quel
 * - Timestamp en secondes (< 10000000000) → converti en ISO
 * - Timestamp en millisecondes (>= 10000000000) → converti en ISO
 * - Date object → converti en ISO
 * - String format date (YYYY-MM-DD) → converti en ISO
 * 
 * @param date - La date à convertir (string ISO, timestamp, Date, ou undefined/null)
 * @returns String ISO 8601 ou undefined si la date est invalide/absente
 */
export default function dateToISO(date: string | Date | number | undefined | null): string | undefined {
    if (!date) return undefined;
    
    // Si c'est déjà une string ISO 8601 (contient 'T' ou se termine par 'Z' ou '+')
    if (typeof date === 'string') {
        // Vérifier si c'est déjà au format ISO 8601
        if (date.includes('T') || date.endsWith('Z') || date.includes('+') || date.includes('-') && date.length > 10) {
            // C'est déjà une string ISO, vérifier qu'elle est valide
            const testDate = new Date(date);
            if (!isNaN(testDate.getTime())) {
                return date;
            }
        }
        // Sinon, c'est probablement un format date simple (YYYY-MM-DD), convertir
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString();
        }
        return undefined;
    }
    
    // Si c'est un nombre (timestamp)
    if (typeof date === 'number') {
        // Si le nombre est très petit (< 10000000000), c'est probablement en secondes Unix
        // Sinon c'est en millisecondes
        const timestamp = date < 10000000000 ? date * 1000 : date;
        const convertedDate = new Date(timestamp);
        if (!isNaN(convertedDate.getTime())) {
            return convertedDate.toISOString();
        }
        return undefined;
    }
    
    // Si c'est un objet Date
    if (date instanceof Date) {
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
        return undefined;
    }
    
    return undefined;
}