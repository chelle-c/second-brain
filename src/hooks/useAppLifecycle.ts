import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef } from "react";
import { checkExpenseNotifications } from "@/lib/notifications";
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

	// Initialize app on mount
	useEffect(() => {
		const initializeApp = async () => {
			try {
				await initializeBackup();
				await loadFromFile();
				// Initialize desktop settings (sync autostart state with system)
				await useSettingsStore.getState().initializeDesktopSettings();
				// Check for expense notifications (once per day)
				await checkExpenseNotifications();
			} catch (error) {
				console.error("Failed to initialize app:", error);
			}
		};

		initializeApp();
	}, [loadFromFile, initializeBackup]);

	// Handle tray quit - save data and close database before exiting
	useEffect(() => {
		const unlistenPromise = listen("tray-quit-requested", async () => {
			// Prevent multiple simultaneous save attempts
			if (isSavingRef.current) {
				return;
			}

			isSavingRef.current = true;
			console.log("Tray quit requested - saving data...");

			try {
				// Force save all data before quitting
				await useAppStore.getState().saveToFile(AppToSave.All);
				console.log("Data saved successfully");

				// Close the database properly
				await sqlStorage.close();
				console.log("Database closed");

				// Verify connection is closed before quitting
				if (sqlStorage.isOpen()) {
					console.warn("Database connection still open, waiting...");
					await new Promise((resolve) => setTimeout(resolve, 100));
				}

				// Now actually quit the app
				await invoke("quit_app");
			} catch (error) {
				console.error("Error handling tray quit:", error);
				// Try to quit anyway
				await invoke("quit_app");
			} finally {
				isSavingRef.current = false;
			}
		});

		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	}, []);

	// Handle window close - save data and either minimize to tray or close
	useEffect(() => {
		const appWindow = getCurrentWindow();

		const unlistenPromise = appWindow.onCloseRequested(async (event) => {
			const minimizeToTray = useSettingsStore.getState().minimizeToTray;

			// Prevent default close - we'll handle it manually
			event.preventDefault();

			if (minimizeToTray) {
				// Hide window immediately for instant feedback
				await appWindow.hide();
				console.log("Window hidden to tray");

				// Save data in background (non-blocking)
				useAppStore.getState().saveToFile(AppToSave.All).catch((error) => {
					console.error("Background save failed:", error);
				});
				return;
			}

			// For actual close, we need to save first
			if (isSavingRef.current) return;
			isSavingRef.current = true;
			console.log("Window close requested - saving data...");

			try {
				// Force save all data before closing
				await useAppStore.getState().saveToFile(AppToSave.All);
				console.log("Data saved successfully");

				// Actually close the app
				await sqlStorage.close();
				console.log("Database closed, destroying window");

				// Verify connection is closed before destroying window
				if (sqlStorage.isOpen()) {
					console.warn("Database connection still open, waiting...");
					await new Promise((resolve) => setTimeout(resolve, 100));
				}

				await appWindow.destroy();
			} catch (error) {
				console.error("Error handling close:", error);
				// If something goes wrong, try to close anyway
				await appWindow.destroy();
			} finally {
				isSavingRef.current = false;
			}
		});

		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	}, []);
}
