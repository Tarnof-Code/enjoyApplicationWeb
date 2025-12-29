export default function formaterDate(date: string | Date | number | undefined | null): string {
    if (!date) return "";
    
    let newDate: Date;
    
    // Si c'est un nombre, vérifier si c'est en secondes ou millisecondes
    if (typeof date === 'number') {
        // Si le nombre est très petit (< 10000000000), c'est probablement en secondes Unix
        // Sinon c'est en millisecondes
        // Les dates en 1970 suggèrent qu'on traite un timestamp en secondes comme des millisecondes
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
    
    if (isNaN(newDate.getTime())) {
        return "Date invalide";
    }
    
    return newDate.toLocaleDateString();
};