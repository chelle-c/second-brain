import { getWeek } from "date-fns";

// ============================================
// Constants
// ============================================

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
export const CURRENT_YEAR = new Date().getFullYear();
export const CURRENT_WEEK = getWeek(new Date(), { weekStartsOn: 1 });

export const years = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - 5 + i);
