import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function deepEqual(obj1: unknown, obj2: unknown): boolean {
	if (obj1 === obj2) return true;

	if (obj1 == null || obj2 == null) return false;
	if (typeof obj1 !== typeof obj2) return false;

	// Handle Dates
	if (obj1 instanceof Date && obj2 instanceof Date) {
		return obj1.getTime() === obj2.getTime();
	}

	// Handle Arrays
	if (Array.isArray(obj1) && Array.isArray(obj2)) {
		if (obj1.length !== obj2.length) return false;
		return obj1.every((item, index) => deepEqual(item, obj2[index]));
	}

	// Handle Objects
	if (typeof obj1 === "object" && typeof obj2 === "object") {
		const keys1 = Object.keys(obj1 as object);
		const keys2 = Object.keys(obj2 as object);

		if (keys1.length !== keys2.length) return false;

		return keys1.every((key) =>
			deepEqual(
				(obj1 as Record<string, unknown>)[key],
				(obj2 as Record<string, unknown>)[key],
			),
		);
	}

	return false;
}
