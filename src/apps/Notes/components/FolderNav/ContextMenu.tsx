import { Archive, ArchiveRestore, Edit2, FolderPlus, Palette, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

interface ContextMenuProps {
	x: number;
	y: number;
	folderId: string;
	folderName: string;
	onClose: () => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string, name: string) => void;
	onAddSubfolder: (id: string) => void;
	onChangeIcon: (id: string) => void;
	onArchive: () => void;
	isArchived: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
	x,
	y,
	folderId,
	folderName,
	onClose,
	onRename,
	onDelete,
	onAddSubfolder,
	onChangeIcon,
	onArchive,
	isArchived,
}) => {
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		};

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [onClose]);

	// Keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const items =
				menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
			if (!items || items.length === 0) return;

			const currentIndex = Array.from(items).indexOf(
				document.activeElement as HTMLButtonElement
			);

			if (e.key === "ArrowDown") {
				e.preventDefault();
				const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
				items[nextIndex].focus();
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
				items[prevIndex].focus();
			} else if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				(document.activeElement as HTMLButtonElement)?.click();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Focus first item on mount
	useEffect(() => {
		const firstButton =
			menuRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])");
		firstButton?.focus();
	}, []);

	// Adjust position if menu would go off screen
	const adjustedX = Math.min(x, window.innerWidth - 200);
	const adjustedY = Math.min(y, window.innerHeight - 250);

	return (
		<div
			ref={menuRef}
			className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
			style={{ left: adjustedX, top: adjustedY }}
			role="menu"
			aria-label="Folder actions"
		>
			<button
				type="button"
				onClick={() => onRename(folderId, folderName)}
				className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
				role="menuitem"
			>
				<Edit2 size={14} />
				Rename (F2)
			</button>

			<button
				type="button"
				onClick={() => onAddSubfolder(folderId)}
				className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
				role="menuitem"
			>
				<FolderPlus size={14} />
				Add Subfolder
			</button>

			<button
				type="button"
				onClick={() => onChangeIcon(folderId)}
				className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
				role="menuitem"
			>
				<Palette size={14} />
				Change Icon
			</button>

			<div className="h-px bg-border my-1" role="separator" />

			<button
				type="button"
				onClick={onArchive}
				className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
				role="menuitem"
			>
				{isArchived ? (
					<>
						<ArchiveRestore size={14} />
						Unarchive Folder
					</>
				) : (
					<>
						<Archive size={14} />
						Archive Folder
					</>
				)}
			</button>

			<div className="h-px bg-border my-1" role="separator" />

			<button
				type="button"
				onClick={() => onDelete(folderId, folderName)}
				className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
				role="menuitem"
			>
				<Trash2 size={14} />
				Delete (Del)
			</button>
		</div>
	);
};
