export default function formatDateAnglais(date: string | Date | number): string {
    const newDate = new Date(date);
    
    // Utiliser les méthodes locales pour éviter les problèmes de fuseau horaire
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};
