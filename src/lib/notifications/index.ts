/**
 * Barrel + bootstrap.
 *
 * Import bootstrapNotifications once (useAppLifecycle) to wire every
 * provider into the singleton service and start the polling loop.
 */

export { notificationService } from "./service";
export { expenseProvider, checkExpenseNotificationsOnStartup } from "./expense";
export { noteProvider } from "./notes";

import { notificationService } from "./service";
import { expenseProvider } from "./expense";
import { noteProvider } from "./notes";

export function bootstrapNotifications(): void {
	notificationService.register("expenses", expenseProvider);
	notificationService.register("notes", noteProvider);
	notificationService.start();
}
