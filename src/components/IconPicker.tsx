import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
	ICON_CATEGORIES,
	EMOJI_CATEGORIES,
	type IconCategory,
	type EmojiCategory,
	type IconOption,
	type EmojiData,
	type IconPickerSelection,
} from "@/lib/icons";

// Re-export for consumers
export type { IconPickerSelection } from "@/lib/icons";
export {
	AVAILABLE_ICONS,
	DEFAULT_TAG_ICON,
	DEFAULT_FOLDER_ICON,
	DEFAULT_NOTE_ICON,
	getIconNameFromComponent,
	getValidIcon,
	findIconByName,
	isEmojiString,
	renderNoteIcon,
	renderFolderOrTagIcon,
} from "@/lib/icons";

type PickerTab = "icons" | "emojis";

// ── Memoized button components ───────────────────────────────────────────────

interface IconButtonProps {
	icon: LucideIcon;
	name: string;
	isSelected: boolean;
	isFocused: boolean;
	index: number;
	size: number;
	iconSize: number;
	onSelect: () => void;
	onFocus: () => void;
}

const IconButton = memo<IconButtonProps>(
	({ icon: Icon, name, isSelected, isFocused, index, size, iconSize, onSelect, onFocus }) => (
		<button
			type="button"
			data-picker-index={index}
			tabIndex={isFocused ? 0 : -1}
			onClick={onSelect}
			onFocus={onFocus}
			className={`flex items-center justify-center rounded-md cursor-pointer ${
				isSelected ?
					"border-primary bg-primary/10 text-primary ring-1 ring-primary"
				:	"border-transparent hover:bg-accent text-muted-foreground hover:text-foreground"
			} ${isFocused ? "ring-2 ring-primary/60" : ""}`}
			style={{ width: size, height: size }}
			title={name}
			aria-label={name}
		>
			<Icon size={iconSize} />
		</button>
	),
);
IconButton.displayName = "IconButton";

interface EmojiButtonProps {
	emoji: string;
	name: string;
	isSelected: boolean;
	isFocused: boolean;
	index: number;
	size: number;
	fontSize: number;
	onSelect: () => void;
	onFocus: () => void;
}

const EmojiButton = memo<EmojiButtonProps>(
	({ emoji, name, isSelected, isFocused, index, size, fontSize, onSelect, onFocus }) => (
		<button
			type="button"
			data-picker-index={index}
			tabIndex={isFocused ? 0 : -1}
			onClick={onSelect}
			onFocus={onFocus}
			className={`flex items-center justify-center rounded-md cursor-pointer ${
				isSelected ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-accent"
			} ${isFocused ? "ring-2 ring-primary/60" : ""}`}
			style={{ width: size, height: size, fontSize: `${fontSize}px`, lineHeight: 1 }}
			aria-label={name}
		>
			{emoji}
		</button>
	),
);
EmojiButton.displayName = "EmojiButton";

// ── Lazy category section ────────────────────────────────────────────────────

interface LazySectionProps {
	rootRef: React.RefObject<HTMLDivElement | null>;
	fallbackHeight: number;
	preload?: boolean;
	bypass?: boolean;
	onRef?: (el: HTMLDivElement | null) => void;
	children: React.ReactNode;
}

const LazySection = memo<LazySectionProps>(
	({ rootRef, fallbackHeight, preload = false, bypass = false, onRef, children }) => {
		const wrapperRef = useRef<HTMLDivElement | null>(null);
		const [isNear, setIsNear] = useState(preload);
		const capturedHeight = useRef(fallbackHeight);

		useEffect(() => {
			const el = wrapperRef.current;
			const root = rootRef.current;
			if (!el || !root) return;

			const observer = new IntersectionObserver(
				([entry]) => {
					if (!entry.isIntersecting && wrapperRef.current) {
						const h = wrapperRef.current.offsetHeight;
						if (h > 0) capturedHeight.current = h;
					}
					setIsNear(entry.isIntersecting);
				},
				{ root, rootMargin: "400px 0px" },
			);
			observer.observe(el);
			return () => observer.disconnect();
		}, [rootRef]);

		const setRefs = useCallback(
			(el: HTMLDivElement | null) => {
				wrapperRef.current = el;
				onRef?.(el);
			},
			[onRef],
		);

		const shouldRender = isNear || bypass;

		return (
			<div
				ref={setRefs}
				style={
					shouldRender ? undefined : (
						{ height: capturedHeight.current, overflow: "hidden" }
					)
				}
			>
				{shouldRender ? children : null}
			</div>
		);
	},
);
LazySection.displayName = "LazySection";

// ── Category grid components ─────────────────────────────────────────────────

interface IconCategoryGridProps {
	category: IconCategory;
	startIndex: number;
	focusedIndex: number;
	currentIcon?: LucideIcon;
	currentEmoji?: string;
	itemSize: number;
	iconSize: number;
	onIconSelect: (icon: LucideIcon, name: string) => void;
	onFocusChange: (index: number) => void;
}

const IconCategoryGrid = memo<IconCategoryGridProps>(
	({
		category,
		startIndex,
		focusedIndex,
		currentIcon,
		currentEmoji,
		itemSize,
		iconSize,
		onIconSelect,
		onFocusChange,
	}) => (
		<div>
			<h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1 px-0.5">
				{category.label}
			</h4>
			<div className="flex flex-wrap gap-0.5">
				{category.items.map((item: IconOption, i: number) => {
					const idx = startIndex + i;
					return (
						<IconButton
							key={item.name}
							icon={item.icon}
							name={item.name}
							isSelected={!currentEmoji && currentIcon === item.icon}
							isFocused={idx === focusedIndex}
							index={idx}
							size={itemSize}
							iconSize={iconSize}
							onSelect={() => onIconSelect(item.icon, item.name)}
							onFocus={() => onFocusChange(idx)}
						/>
					);
				})}
			</div>
		</div>
	),
);
IconCategoryGrid.displayName = "IconCategoryGrid";

interface EmojiCategoryGridProps {
	category: EmojiCategory;
	startIndex: number;
	focusedIndex: number;
	currentEmoji?: string;
	itemSize: number;
	fontSize: number;
	onEmojiSelect: (emoji: string) => void;
	onFocusChange: (index: number) => void;
}

const EmojiCategoryGrid = memo<EmojiCategoryGridProps>(
	({
		category,
		startIndex,
		focusedIndex,
		currentEmoji,
		itemSize,
		fontSize,
		onEmojiSelect,
		onFocusChange,
	}) => (
		<div>
			<h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1 px-0.5">
				{category.label}
			</h4>
			<div className="flex flex-wrap gap-0.5">
				{category.items.map((item: EmojiData, i: number) => {
					const idx = startIndex + i;
					return (
						<EmojiButton
							key={`${item.char}-${idx}`}
							emoji={item.char}
							name={item.name}
							isSelected={currentEmoji === item.char}
							isFocused={idx === focusedIndex}
							index={idx}
							size={itemSize}
							fontSize={fontSize}
							onSelect={() => onEmojiSelect(item.char)}
							onFocus={() => onFocusChange(idx)}
						/>
					);
				})}
			</div>
		</div>
	),
);
EmojiCategoryGrid.displayName = "EmojiCategoryGrid";

// ── Main IconPicker Component ────────────────────────────────────────────────

interface IconPickerProps {
	currentIcon?: LucideIcon;
	currentEmoji?: string;
	onSelect: (selection: IconPickerSelection) => void;
	onRemove?: () => void;
	variant?: "compact" | "default";
	showRemove?: boolean;
}

export const IconPicker: React.FC<IconPickerProps> = memo(
	({
		currentIcon,
		currentEmoji,
		onSelect,
		onRemove,
		variant = "default",
		showRemove = false,
	}) => {
		const [activeTab, setActiveTab] = useState<PickerTab>("icons");
		const [search, setSearch] = useState("");
		const [debouncedSearch, setDebouncedSearch] = useState("");
		const scrollRef = useRef<HTMLDivElement | null>(null);
		const pickerRef = useRef<HTMLDivElement | null>(null);
		const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
		const [focusedIndex, setFocusedIndex] = useState(-1);
		const [isExiting, setIsExiting] = useState(false);
		const exitHeightRef = useRef(0);

		const isCompact = variant === "compact";
		const cols = isCompact ? 8 : 9;
		const itemSize = isCompact ? 28 : 34;
		const iconSize = isCompact ? 15 : 19;
		const pickerWidth = isCompact ? 272 : 350;
		const gridHeight = isCompact ? 200 : 280;

		// ── Detect popover close to strip heavy content during exit animation ─
		useEffect(() => {
			const el = pickerRef.current;
			if (!el) return;

			const popover = el.closest("[data-state]") as HTMLElement | null;
			if (!popover) return;

			const observer = new MutationObserver(() => {
				const state = popover.getAttribute("data-state");
				if (state === "closed") {
					exitHeightRef.current = el.offsetHeight;
					setIsExiting(true);
				}
			});

			observer.observe(popover, { attributes: true, attributeFilter: ["data-state"] });
			return () => observer.disconnect();
		}, []);

		// Debounce search
		useEffect(() => {
			const timer = setTimeout(() => setDebouncedSearch(search), 150);
			return () => clearTimeout(timer);
		}, [search]);

		// ── Filtered data ────────────────────────────────────────────────────

		const filteredIconCategories = useMemo(() => {
			const q = debouncedSearch.toLowerCase().trim();
			if (!q) return ICON_CATEGORIES;
			return ICON_CATEGORIES.map((cat) => ({
				...cat,
				items: cat.items.filter(
					(item) =>
						item.name.toLowerCase().includes(q) ||
						item.keywords.some((kw) => kw.includes(q)),
				),
			})).filter((cat) => cat.items.length > 0);
		}, [debouncedSearch]);

		const filteredEmojiCategories = useMemo(() => {
			const q = debouncedSearch.toLowerCase().trim();
			if (!q) return EMOJI_CATEGORIES;
			return EMOJI_CATEGORIES.map((cat) => ({
				...cat,
				items: cat.items.filter(
					(item) =>
						item.name.toLowerCase().includes(q) ||
						item.keywords.some((kw) => kw.includes(q)),
				),
			})).filter((cat) => cat.items.length > 0);
		}, [debouncedSearch]);

		// ── Category index offsets ───────────────────────────────────────────

		const categoryOffsets = useMemo(() => {
			const cats = activeTab === "icons" ? filteredIconCategories : filteredEmojiCategories;
			const offsets: number[] = [];
			let offset = 0;
			for (const cat of cats) {
				offsets.push(offset);
				offset += cat.items.length;
			}
			return offsets;
		}, [activeTab, filteredIconCategories, filteredEmojiCategories]);

		const totalItems = useMemo(() => {
			const cats = activeTab === "icons" ? filteredIconCategories : filteredEmojiCategories;
			return cats.reduce((sum, cat) => sum + cat.items.length, 0);
		}, [activeTab, filteredIconCategories, filteredEmojiCategories]);

		const allItems = useMemo(() => {
			if (activeTab === "icons") {
				return filteredIconCategories.flatMap((cat) =>
					cat.items.map((item) => ({ type: "icon" as const, ...item })),
				);
			}
			return filteredEmojiCategories.flatMap((cat) =>
				cat.items.map((item) => ({ type: "emoji" as const, ...item })),
			);
		}, [activeTab, filteredIconCategories, filteredEmojiCategories]);

		// ── Lazy rendering bypass ────────────────────────────────────────────

		const isSearchActive = debouncedSearch.length > 0;
		const isKeyboardActive = focusedIndex >= 0;
		const bypassLazy = isSearchActive || isKeyboardActive;

		const estimateHeight = useCallback(
			(itemCount: number) => {
				const rows = Math.ceil(itemCount / cols);
				return 28 + rows * (itemSize + 2);
			},
			[cols, itemSize],
		);

		// ── Scroll to category ───────────────────────────────────────────────

		const scrollToCategory = useCallback((categoryId: string) => {
			const el = categoryRefs.current[categoryId];
			if (el && scrollRef.current) {
				const containerTop = scrollRef.current.getBoundingClientRect().top;
				const elTop = el.getBoundingClientRect().top;
				scrollRef.current.scrollTop += elTop - containerTop;
			}
		}, []);

		const setCategoryRef = useCallback((id: string) => {
			return (el: HTMLDivElement | null) => {
				categoryRefs.current[id] = el;
			};
		}, []);

		// ── Keyboard handling ────────────────────────────────────────────────

		const handleGridKeyDown = useCallback(
			(e: React.KeyboardEvent) => {
				if (totalItems === 0) return;
				let next = focusedIndex;

				switch (e.key) {
					case "ArrowRight":
						e.preventDefault();
						next = (focusedIndex + 1) % totalItems;
						break;
					case "ArrowLeft":
						e.preventDefault();
						next = (focusedIndex - 1 + totalItems) % totalItems;
						break;
					case "ArrowDown":
						e.preventDefault();
						next = Math.min(focusedIndex + cols, totalItems - 1);
						break;
					case "ArrowUp":
						e.preventDefault();
						next = Math.max(focusedIndex - cols, 0);
						break;
					case "Enter":
					case " ":
						e.preventDefault();
						if (focusedIndex >= 0 && focusedIndex < totalItems) {
							const item = allItems[focusedIndex];
							if (item.type === "icon") {
								onSelect({ type: "icon", icon: item.icon, name: item.name });
							} else {
								onSelect({ type: "emoji", emoji: item.char });
							}
						}
						return;
					case "Home":
						e.preventDefault();
						next = 0;
						break;
					case "End":
						e.preventDefault();
						next = totalItems - 1;
						break;
					default:
						return;
				}

				setFocusedIndex(next);
				requestAnimationFrame(() => {
					const btn = scrollRef.current?.querySelector(`[data-picker-index="${next}"]`);
					btn?.scrollIntoView({ block: "nearest" });
				});
			},
			[focusedIndex, totalItems, allItems, cols, onSelect],
		);

		useEffect(() => {
			setFocusedIndex(-1);
		}, [activeTab, debouncedSearch]);

		// ── Scroll propagation guard ─────────────────────────────────────────

		const handleWheel = useCallback((e: React.WheelEvent) => {
			const el = scrollRef.current;
			if (!el) return;
			const { scrollTop, scrollHeight, clientHeight } = el;
			const atTop = scrollTop === 0;
			const atBottom = scrollTop + clientHeight >= scrollHeight;
			if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
				e.stopPropagation();
			}
		}, []);

		// ── Memoized callbacks ───────────────────────────────────────────────

		const handleIconSelect = useCallback(
			(icon: LucideIcon, name: string) => onSelect({ type: "icon", icon, name }),
			[onSelect],
		);

		const handleEmojiSelect = useCallback(
			(emoji: string) => onSelect({ type: "emoji", emoji }),
			[onSelect],
		);

		const handleFocusChange = useCallback((index: number) => {
			setFocusedIndex(index);
		}, []);

		// ── During exit animation, render a lightweight shell ────────────────

		if (isExiting) {
			return (
				<div
					ref={pickerRef}
					style={{ width: pickerWidth, height: exitHeightRef.current }}
					className="flex flex-col"
					aria-hidden
				/>
			);
		}

		// ── Render ───────────────────────────────────────────────────────────

		return (
			<div
				ref={pickerRef}
				style={{ width: pickerWidth }}
				className="flex flex-col"
				role="dialog"
				aria-label="Icon picker"
			>
				{/* Tabs */}
				<div className="flex border-b border-border mb-1">
					<button
						type="button"
						onClick={() => {
							setActiveTab("icons");
							setSearch("");
						}}
						className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
							activeTab === "icons" ?
								"border-b-2 border-primary text-primary"
							:	"text-muted-foreground hover:text-foreground"
						}`}
					>
						Icons
					</button>
					<button
						type="button"
						onClick={() => {
							setActiveTab("emojis");
							setSearch("");
						}}
						className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
							activeTab === "emojis" ?
								"border-b-2 border-primary text-primary"
							:	"text-muted-foreground hover:text-foreground"
						}`}
					>
						Emojis
					</button>
				</div>

				{/* Search */}
				<div className="relative px-1.5 mb-1.5">
					<Search
						size={13}
						className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
					/>
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={activeTab === "icons" ? "Search icons…" : "Search emojis…"}
						className="w-full pl-7 pr-7 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
						aria-label="Search"
					/>
					{search && (
						<button
							type="button"
							onClick={() => setSearch("")}
							className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
							aria-label="Clear search"
						>
							<X size={12} />
						</button>
					)}
				</div>

				{/* Scrollable grid */}
				<div
					ref={scrollRef}
					className="overflow-y-auto px-1.5"
					style={{ maxHeight: gridHeight }}
					onWheel={handleWheel}
					onKeyDown={handleGridKeyDown}
					role="grid"
					aria-label={activeTab === "icons" ? "Icon grid" : "Emoji grid"}
					tabIndex={0}
				>
					{(activeTab === "icons" ? filteredIconCategories : filteredEmojiCategories)
						.length === 0 && (
						<p className="py-6 text-center text-xs text-muted-foreground">
							No results found
						</p>
					)}

					{activeTab === "icons" ?
						filteredIconCategories.map((cat, catIndex) => (
							<LazySection
								key={cat.id}
								rootRef={scrollRef}
								fallbackHeight={estimateHeight(cat.items.length)}
								preload={catIndex < 2}
								bypass={bypassLazy}
								onRef={setCategoryRef(cat.id)}
							>
								<IconCategoryGrid
									category={cat}
									startIndex={categoryOffsets[catIndex]}
									focusedIndex={focusedIndex}
									currentIcon={currentIcon}
									currentEmoji={currentEmoji}
									itemSize={itemSize}
									iconSize={iconSize}
									onIconSelect={handleIconSelect}
									onFocusChange={handleFocusChange}
								/>
							</LazySection>
						))
					:	filteredEmojiCategories.map((cat, catIndex) => (
							<LazySection
								key={cat.id}
								rootRef={scrollRef}
								fallbackHeight={estimateHeight(cat.items.length)}
								preload={catIndex < 2}
								bypass={bypassLazy}
								onRef={setCategoryRef(cat.id)}
							>
								<EmojiCategoryGrid
									category={cat}
									startIndex={categoryOffsets[catIndex]}
									focusedIndex={focusedIndex}
									currentEmoji={currentEmoji}
									itemSize={itemSize}
									fontSize={iconSize}
									onEmojiSelect={handleEmojiSelect}
									onFocusChange={handleFocusChange}
								/>
							</LazySection>
						))
					}
				</div>

				{/* Category quick-nav */}
				<div className="flex items-center gap-0.5 px-1.5 py-1 border-t border-border mt-1 overflow-x-auto">
					{(activeTab === "icons" ? ICON_CATEGORIES : EMOJI_CATEGORIES).map((cat) => (
						<button
							key={cat.id}
							type="button"
							onClick={() => {
								setSearch("");
								requestAnimationFrame(() => {
									requestAnimationFrame(() => scrollToCategory(cat.id));
								});
							}}
							className="shrink-0 flex items-center justify-center rounded-md hover:bg-accent transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
							style={{ width: 28, height: 28, fontSize: "14px" }}
							title={cat.label}
							aria-label={`Jump to ${cat.label}`}
						>
							{cat.navIcon}
						</button>
					))}
				</div>

				{/* Remove button */}
				{showRemove && onRemove && (
					<button
						type="button"
						onClick={onRemove}
						className="mx-1.5 mb-1 mt-0.5 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-colors cursor-pointer"
					>
						<X size={12} />
						Remove
					</button>
				)}
			</div>
		);
	},
);

IconPicker.displayName = "IconPicker";
