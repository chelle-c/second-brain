import { Archive, ArchiveRestore, Edit2, FilePlus, FolderPlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ContextMenuProps {
	x: number;
	y: number;
	folderId: string;
	folderName: string;
	onClose: () => void;
	onCreateNote: () => void;
	onRename: (id: string, name: string) => void;
	onDelete: (id: string, name: string) => void;
	onAddSubfolder: (id: string) => void;
	onArchive: () => void;
	isArchived: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
	x,
	y,
	folderId,
	folderName,
	onClose,
	onCreateNote,
	onRename,
	onDelete,
	onAddSubfolder,
	onArchive,
	isArchived,
}) => {
	const menuRef = useRef<HTMLDivElement>(null);
	const [keyboardActive, setKeyboardActive] = useState(false);

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

	// Keyboard navigation - only focus items when keyboard is used
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const items =
				menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
			if (!items || items.length === 0) return;

			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				setKeyboardActive(true);

				const currentIndex = Array.from(items).indexOf(
					document.activeElement as HTMLButtonElement
				);

				if (e.key === "ArrowDown") {
					// If no item focused yet, focus first item
					const nextIndex = currentIndex === -1 ? 0 : (currentIndex < items.length - 1 ? currentIndex + 1 : 0);
					items[nextIndex].focus();
				} else {
					// ArrowUp - if no item focused yet, focus last item
					const prevIndex = currentIndex === -1 ? items.length - 1 : (currentIndex > 0 ? currentIndex - 1 : items.length - 1);
					items[prevIndex].focus();
				}
			} else if (e.key === "Enter" || e.key === " ") {
				if (document.activeElement && menuRef.current?.contains(document.activeElement)) {
					e.preventDefault();
					(document.activeElement as HTMLButtonElement)?.click();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Adjust position if menu would go off screen
	const adjustedX = Math.min(x, window.innerWidth - 200);
	const adjustedY = Math.min(y, window.innerHeight - 250);

	// Base button styles - only show focus ring when keyboard navigation is active
	const buttonClass = `w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left outline-none ${
		keyboardActive ? "focus:bg-accent" : ""
	}`;

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
				onClick={onCreateNote}
				className={buttonClass}
				role="menuitem"
			>
				<FilePlus size={14} />
				Create Note
			</button>

			<div className="h-px bg-border my-1" role="separator" />

			<button
				type="button"
				onClick={() => onRename(folderId, folderName)}
				className={buttonClass}
				role="menuitem"
			>
				<Edit2 size={14} />
				Rename (F2)
			</button>

			<button
				type="button"
				onClick={() => onAddSubfolder(folderId)}
				className={buttonClass}
				role="menuitem"
			>
				<FolderPlus size={14} />
				Add Subfolder
			</button>

			<div className="h-px bg-border my-1" role="separator" />

			<button
				type="button"
				onClick={onArchive}
				className={buttonClass}
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
				className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left outline-none ${
					keyboardActive ? "focus:bg-red-50 dark:focus:bg-red-950/20" : ""
				}`}
				role="menuitem"
			>
				<Trash2 size={14} />
				Delete (Del)
			</button>
		</div>
	);
};
