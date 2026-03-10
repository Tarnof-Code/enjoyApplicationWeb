export default function calculerAge(date: string | Date, referenceDate?: string | Date): number {
    var aujourdHui = referenceDate ? new Date(referenceDate) : new Date();
    var dateNaissance = new Date(date)
    var anneeAujourdHui = aujourdHui.getFullYear();
    var anneeNaissance = dateNaissance.getFullYear();

    var age = anneeAujourdHui - anneeNaissance;

    // Si l'anniversaire de cette année n'est pas encore passé, on soustrait 1 à l'âge
    if (
        aujourdHui.getMonth() < dateNaissance.getMonth() ||
        (aujourdHui.getMonth() == dateNaissance.getMonth() && aujourdHui.getDate() < dateNaissance.getDate())
    ) {
        age--;
    }

    return age;
}
