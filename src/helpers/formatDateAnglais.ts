export default function formatDateAnglais(date: string | Date): string {
    const newDate = new Date(date);
    const formattedDate = newDate.toISOString().split('T')[0];
    return formattedDate;
};
