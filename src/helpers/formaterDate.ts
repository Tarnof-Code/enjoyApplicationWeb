export default function formaterDate(date: string | Date): string {
    const newDate = new Date(date);
    return newDate.toLocaleDateString();
};