export default function dateToISO(date) {
    const dateToSend = new Date(date);
    const isoDateString = dateToSend.toISOString();
    return isoDateString
}