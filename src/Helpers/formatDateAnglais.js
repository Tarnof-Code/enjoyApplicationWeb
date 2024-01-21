export default function formatDateAnglais(date) {
    const newDate = new Date(date);
    const formattedDate = newDate.toISOString().split('T')[0];
    return formattedDate;
};
