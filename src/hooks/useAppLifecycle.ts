import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef } from "react";
import { bootstrapNotifications, checkExpenseNotificationsOnStartup, shutdownNotifications } from "@/lib/notifications";
import { sqlStorage } from "@/lib/storage";
import useAppStore from "@/stores/useAppStore";
import { useBackupStore } from "@/stores/useBackupStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { AppToSave } from "@/types";

/**
 * Hook that manages the app lifecycle:
 * - Initializes the app on mount (backup, data loading, settings, notifications)
 * - Handles tray quit events (save data, close database, quit)
 * - Handles window close events (minimize to tray or close)
 */
export function useAppLifecycle() {
	const loadFromFile = useAppStore((state) => state.loadFromFile);
	const initializeBackup = useBackupStore((state) => state.initialize);
	const isSavingRef = useRef(false);

	// ── initialisation ──────────────────────────────────────────────────────
	useEffect(() => {
		const initializeApp = async () => {
			try {
				await initializeBackup();
				await loadFromFile();
				await useSettingsStore.getState().initializeDesktopSettings();

				bootstrapNotifications(); // registers providers + starts polling
				await checkExpenseNotificationsOnStartup(); // fires the "once per day" startup batch immediately
			} catch (error) {
				console.error("Failed to initialize app:", error);
			}
		};

		initializeApp();
	}, [loadFromFile, initializeBackup]);

	// ── tray quit ───────────────────────────────────────────────────────────
	useEffect(() => {
		const unlistenPromise = listen("tray-quit-requested", async () => {
			if (isSavingRef.current) return;
			isSavingRef.current = true;
			console.log("Tray quit requested – saving data…");
			try {
				// Stop background services first to prevent interference
				shutdownNotifications();

				await useAppStore.getState().saveToFile(AppToSave.All);
				console.log("Data saved successfully");
				await sqlStorage.close();
				console.log("Database closed");
				await invoke("quit_app");
			} catch (error) {
				console.error("Error handling tray quit:", error);
				// Still try to close the database before quitting
				try {
					await sqlStorage.close();
				} catch {
					// Ignore close errors during error recovery
				}
				await invoke("quit_app");
			} finally {
				isSavingRef.current = false;
			}
		});
		return () => {
			unlistenPromise.then((u) => u());
		};
	}, []);

	// ── window close ────────────────────────────────────────────────────────
	useEffect(() => {
		const appWindow = getCurrentWindow();
		const unlistenPromise = appWindow.onCloseRequested(async (event) => {
			const minimizeToTray = useSettingsStore.getState().minimizeToTray;
			event.preventDefault();

			if (minimizeToTray) {
				await appWindow.hide();
				console.log("Window hidden to tray");
				// Await the save so it completes before we return.
				// This prevents a race if the user quits from the tray shortly after.
				try {
					await useAppStore.getState().saveToFile(AppToSave.All);
				} catch (error) {
					console.error("Background save failed:", error);
				}
				return;
			}

			if (isSavingRef.current) return;
			isSavingRef.current = true;
			console.log("Window close requested – saving data…");
			try {
				// Stop background services first to prevent interference
				shutdownNotifications();

				await useAppStore.getState().saveToFile(AppToSave.All);
				console.log("Data saved successfully");
				await sqlStorage.close();
				console.log("Database closed, destroying window");
				await appWindow.destroy();
			} catch (error) {
				console.error("Error handling close:", error);
				// Still try to close the database before destroying
				try {
					await sqlStorage.close();
				} catch {
					// Ignore close errors during error recovery
				}
				await appWindow.destroy();
			} finally {
				isSavingRef.current = false;
			}
		});
		return () => {
			unlistenPromise.then((u) => u());
		};
	}, []);
}
