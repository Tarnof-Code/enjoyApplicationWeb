export default function formaterDate(date: string | Date | number | undefined | null): string {
    if (!date) return "";
    const newDate = new Date(date);
    if (isNaN(newDate.getTime())) {
        return "Date invalide";
    }
    return newDate.toLocaleDateString();
};