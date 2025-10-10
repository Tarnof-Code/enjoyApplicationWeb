export default function dateToISO(date: string | Date): string {
    const dateToSend = new Date(date);
    const isoDateString = dateToSend.toISOString();
    return isoDateString
}