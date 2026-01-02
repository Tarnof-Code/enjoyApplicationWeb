export function parseDate(date: string | Date | number | undefined | null): Date | null {
    if (!date) return null;
    
    let newDate: Date;
    
    // Si c'est un nombre, vérifier si c'est en secondes ou millisecondes
    if (typeof date === 'number') {
        // Si le nombre est très petit (< 10000000000), c'est probablement en secondes Unix
        // Sinon c'est en millisecondes
        if (date < 10000000000) {
            // Timestamp en secondes, convertir en millisecondes
            newDate = new Date(date * 1000);
        } else {
            // Timestamp en millisecondes
            newDate = new Date(date);
        }
    } else {
        // String ISO 8601 ou Date
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