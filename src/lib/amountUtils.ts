import type { AmountRange, AmountType } from "@/types/expense";
import { getCurrencySymbol } from "@/lib/currencyUtils";

/**
 * Given an Expense's amountData (or a fallback amount), return the display string
 * e.g. "$5.00", "$5.00 - $10.00", "~ $7.50"
 */
export function formatAmountDisplay(
	amountData: AmountRange | undefined,
	fallbackAmount: number,
	currency: string,
): string {
	const symbol = getCurrencySymbol(currency);

	if (!amountData) {
		return `${symbol}${fallbackAmount.toFixed(2)}`;
	}

	switch (amountData.type) {
		case "exact": {
			const val = amountData.exact ?? fallbackAmount;
			return `${symbol}${val.toFixed(2)}`;
		}
		case "range": {
			const min = amountData.rangeMin ?? 0;
			const max = amountData.rangeMax ?? 0;
			return `${symbol}${min.toFixed(2)} - ${max.toFixed(2)}`;
		}
		case "estimate": {
			const val = amountData.estimate ?? fallbackAmount;
			return `~ ${symbol}${val.toFixed(2)}`;
		}
		default:
			return `${symbol}${fallbackAmount.toFixed(2)}`;
	}
}

export function getAmountTooltip(type: AmountType): string {
	switch (type) {
		case "exact":
			return "Exact total";
		case "range":
			return "Range (min – max)";
		case "estimate":
			return "Rough estimate";
		default:
			return "";
	}
}

/**
 * Derive the primary numeric amount from amountData for store/calculation purposes.
 * Uses the midpoint for range, the estimate value, or the exact value.
 */
export function deriveNumericAmount(amountData: AmountRange): number {
	switch (amountData.type) {
		case "exact":
			return amountData.exact ?? 0;
		case "range": {
			const min = amountData.rangeMin ?? 0;
			const max = amountData.rangeMax ?? 0;
			return (min + max) / 2;
		}
		case "estimate":
			return amountData.estimate ?? 0;
		default:
			return 0;
	}
}
