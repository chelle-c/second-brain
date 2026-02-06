/**
 * useCurrentTimeIndicator.ts
 *
 * Returns the current time rounded DOWN to the nearest 15-minute quarter.
 * Re-calculates every quarter-hour by computing the exact delay until the
 * next quarter boundary and using a single setTimeout (no drift).
 *
 * Consumers use the returned `quarterTime` Date to:
 *   • Compute a pixel-offset for the red "now" line in Day / Week views.
 *   • Display the current time label.
 */

import { useEffect, useState } from "react";

/**
 * Round a Date down to the nearest 15-minute boundary.
 */
export function roundDownToQuarter(date: Date): Date {
	const rounded = new Date(date);
	rounded.setMinutes(Math.floor(date.getMinutes() / 15) * 15, 0, 0);
	return rounded;
}

/**
 * Calculate milliseconds from `now` until the next 15-minute boundary.
 */
function msUntilNextQuarter(now: Date): number {
	const nextQuarter = new Date(now);
	const currentMinute = now.getMinutes();
	const nextQuarterMinute = (Math.floor(currentMinute / 15) + 1) * 15;

	if (nextQuarterMinute >= 60) {
		// Roll to next hour, minute 0
		nextQuarter.setHours(now.getHours() + 1, 0, 0, 0);
	} else {
		nextQuarter.setMinutes(nextQuarterMinute, 0, 0);
	}

	return nextQuarter.getTime() - now.getTime();
}

/**
 * Hook.  Returns `quarterTime` — a Date snapped to the current quarter-hour.
 * Updates automatically at each quarter boundary while the component is
 * mounted.
 */
export function useCurrentTimeIndicator(): { quarterTime: Date } {
	const [quarterTime, setQuarterTime] = useState<Date>(() => roundDownToQuarter(new Date()));

	useEffect(() => {
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		function scheduleNext(): void {
			const now = new Date();
			setQuarterTime(roundDownToQuarter(now));
			timeoutId = setTimeout(() => {
				scheduleNext();
			}, msUntilNextQuarter(now));
		}

		scheduleNext();

		return () => {
			if (timeoutId !== null) clearTimeout(timeoutId);
		};
	}, []);

	return { quarterTime };
}
