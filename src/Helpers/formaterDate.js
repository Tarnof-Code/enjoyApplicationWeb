export default function formaterDate(date) {
    const newDate = new Date(date);
    return newDate.toLocaleDateString();
};