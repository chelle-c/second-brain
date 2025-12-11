import { Layout } from "./components/Layout";
import { GeneralSettings } from "./components/GeneralSettings";
import { AppearanceSettings } from "./components/AppearanceSettings";
import { NotesSettings } from "./components/NotesSettings";
import { ExpenseSettings } from "./components/ExpenseSettings";
import { IncomeSettings } from "./components/IncomeSettings";
import { BackupSettings } from "./components/BackupSettings";

export const Settings = () => {
	return (
		<Layout>
			<GeneralSettings />
			<AppearanceSettings />
			<NotesSettings />
			<ExpenseSettings />
			<IncomeSettings />
			<div id="backup" className="scroll-mt-6 space-y-6">
				<BackupSettings />
			</div>
		</Layout>
	);
};
