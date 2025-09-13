import { format, isBefore, isToday, isTomorrow, parseISO, differenceInMinutes } from "date-fns";


export const fmt = (iso?: string) => (iso ? format(parseISO(iso), "dd/MM HH:mm") : "–");
export const urgency = (dueAt?: string) => {
    if (!dueAt) return 0; 
    const now = new Date();
    const due = parseISO(dueAt);
    const diff = Math.max(1, differenceInMinutes(due, now));
    return 1 / diff;
};
export const badgeDue = (dueAt?: string) => {
    if (!dueAt) return { label: "No deadline", tone: "gray" } as const;
    const d = parseISO(dueAt);
    if (isBefore(d, new Date())) return { label: `Overdue • ${format(d, "dd/MM HH:mm")}`, tone: "red" } as const;
    if (isToday(d)) return { label: `Today • ${format(d, "HH:mm")}`, tone: "orange" } as const;
    if (isTomorrow(d)) return { label: `Tomorrow • ${format(d, "HH:mm")}`, tone: "yellow" } as const;
    return { label: format(d, "EEE, dd/MM HH:mm"), tone: "gray" } as const;
};