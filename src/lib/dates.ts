import { format, parseISO } from "date-fns";

export const shortDate = (iso: string) => format(parseISO(iso), "dd/MM");
export const fullDate = (iso: string) => format(parseISO(iso), "dd/MM/yyyy");
