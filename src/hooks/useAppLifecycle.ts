import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef } from "react";
import { checkExpenseNotifications } from "@/lib/notifications";
import { startReminderService, stopReminderService } from "@/lib/reminderService";
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
		let started = false;

		const initializeApp = async () => {
			try {
				await initializeBackup();
				await loadFromFile();
				await useSettingsStore.getState().initializeDesktopSettings();
				await checkExpenseNotifications();

				// Start note-reminder polling *after* data is loaded
				startReminderService();
				started = true;
			} catch (error) {
				console.error("Failed to initialize app:", error);
			}
		};

		initializeApp();

		// Cleanup: stop polling when the effect tears down
		return () => {
			if (started) stopReminderService();
		};
	}, [loadFromFile, initializeBackup]);

	// ── tray quit ───────────────────────────────────────────────────────────
	useEffect(() => {
		const unlistenPromise = listen("tray-quit-requested", async () => {
			if (isSavingRef.current) return;
			isSavingRef.current = true;
			console.log("Tray quit requested – saving data…");
			try {
				stopReminderService();
				await useAppStore.getState().saveToFile(AppToSave.All);
				console.log("Data saved successfully");
				await sqlStorage.close();
				console.log("Database closed");
				if (sqlStorage.isOpen()) {
					console.warn("Database connection still open, waiting…");
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
				await invoke("quit_app");
			} catch (error) {
				console.error("Error handling tray quit:", error);
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
				useAppStore
					.getState()
					.saveToFile(AppToSave.All)
					.catch((error) => {
						console.error("Background save failed:", error);
					});
				return;
			}

			if (isSavingRef.current) return;
			isSavingRef.current = true;
			console.log("Window close requested – saving data…");
			try {
				stopReminderService();
				await useAppStore.getState().saveToFile(AppToSave.All);
				console.log("Data saved successfully");
				await sqlStorage.close();
				console.log("Database closed, destroying window");
				if (sqlStorage.isOpen()) {
					console.warn("Database connection still open, waiting…");
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
				await appWindow.destroy();
			} catch (error) {
				console.error("Error handling close:", error);
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
