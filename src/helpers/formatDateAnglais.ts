export default function formatDateAnglais(date: string | Date | number | undefined | null): string {
    if (!date) return "";
    
    let newDate: Date;
    
    // Si c'est un nombre, vérifier si c'est en secondes ou millisecondes
    if (typeof date === 'number') {
        // Si le nombre est très petit (< 10000000000), c'est probablement en secondes
        // Sinon c'est en millisecondes
        newDate = date < 10000000000 ? new Date(date * 1000) : new Date(date);
    } else {
        newDate = new Date(date);
    }
    
    // Vérifier que la date est valide
    if (isNaN(newDate.getTime())) {
        return "";
    }
    
    // Utiliser les méthodes locales pour éviter les problèmes de fuseau horaire
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};
