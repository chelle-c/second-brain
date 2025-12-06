import { CURRENCY_OPTIONS } from "@/types/settings";

export function getCurrencySymbol(currencyCode: string): string {
	const currency = CURRENCY_OPTIONS.find((c) => c.value === currencyCode);
	return currency?.symbol || "$";
}

export function formatCurrency(amount: number, currencyCode: string): string {
	const symbol = getCurrencySymbol(currencyCode);

	// Format with 2 decimal places and thousands separator
	const formatted = amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	return `${symbol}${formatted}`;
}

export function formatCurrencyCompact(amount: number, currencyCode: string): string {
	const symbol = getCurrencySymbol(currencyCode);

	// For compact display, show whole numbers if no cents
	if (amount % 1 === 0) {
		return `${symbol}${amount.toLocaleString()}`;
	}

	return `${symbol}${amount.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}
