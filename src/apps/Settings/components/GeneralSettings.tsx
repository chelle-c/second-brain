import {
	FolderOpen,
	RotateCcw,
	Save,
	Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { sqlStorage } from "@/lib/storage";
import useAppStore from "@/stores/useAppStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { AppToSave } from "@/types";

export const GeneralSettings = () => {
	const { lastSaved, saveToFile } = useAppStore();
	const { autoSaveEnabled, setAutoSaveEnabled, resetToDefaults } =
		useSettingsStore();

	const handleOpenDataFolder = async () => {
		try {
			await sqlStorage.openDataFolder();
		} catch (error) {
			console.error("Failed to open data folder:", error);
		}
	};

	return (
		<Card id="general" className="scroll-mt-6">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<SettingsIcon className="w-5 h-5" />
					General
				</CardTitle>
				<CardDescription>App-wide settings and data management</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="auto-save" className="text-base font-medium">
							Auto-save
						</Label>
						<p className="text-sm text-muted-foreground">
							Automatically save changes as you work
						</p>
					</div>
					<Switch
						id="auto-save"
						checked={autoSaveEnabled}
						onCheckedChange={setAutoSaveEnabled}
					/>
				</div>

				<Separator />

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-base font-medium">Last Saved</Label>
						<p className="text-sm text-muted-foreground">
							{lastSaved
								? new Date(lastSaved).toLocaleString()
								: "Not saved yet"}
						</p>
					</div>
					<Button
						onClick={() => saveToFile(AppToSave.All)}
						variant="outline"
						className="gap-2"
					>
						<Save className="w-4 h-4" />
						Save Now
					</Button>
				</div>

				<Separator />

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-base font-medium">Data Location</Label>
						<p className="text-sm text-muted-foreground">
							Open the folder where your data is stored
						</p>
					</div>
					<Button
						onClick={handleOpenDataFolder}
						variant="outline"
						className="gap-2"
					>
						<FolderOpen className="w-4 h-4" />
						Open Folder
					</Button>
				</div>

				<Separator />

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-base font-medium">Reset Settings</Label>
						<p className="text-sm text-muted-foreground">
							Restore all settings to their default values
						</p>
					</div>
					<Button onClick={resetToDefaults} variant="outline" className="gap-2">
						<RotateCcw className="w-4 h-4" />
						Reset
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};
