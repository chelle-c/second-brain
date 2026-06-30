import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
interface ToggleOption<T extends string> {
	value: T;
	label: string;
	ariaLabel?: string;
}
interface AnimatedToggleProps<T extends string> {
	options: ToggleOption<T>[];
	value: T;
	onChange: (value: T) => void;
	className?: string;
}
export function AnimatedToggle<T extends string>({
	options,
	value,
	onChange,
	className = "",
}: AnimatedToggleProps<T>) {
	const [indicatorStyle, setIndicatorStyle] = useState<{
		left: number;
		width: number;
		animate: boolean;
	}>({ left: 0, width: 0, animate: false });
	const containerRef = useRef<HTMLDivElement>(null);
	const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
	const updateIndicator = useCallback(
		(animate: boolean) => {
			const currentIndex = options.findIndex(
				(opt) => opt.value === value,
			);
			const button = buttonsRef.current[currentIndex];
			if (button) {
				setIndicatorStyle({
					left: button.offsetLeft,
					width: button.offsetWidth,
					animate,
				});
			}
		},
		[value, options],
	);
	// Animate when the selected value changes (tab switch).
	useEffect(() => {
		updateIndicator(true);
	}, [updateIndicator]);
	// Follow size changes instantly (sidebar drag) with no transition lag.
	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const ro = new ResizeObserver(() => updateIndicator(false));
		ro.observe(container);
		buttonsRef.current.forEach((btn) => btn && ro.observe(btn));
		return () => ro.disconnect();
	}, [updateIndicator]);
	useEffect(() => {
		const handleResize = () => updateIndicator(false);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [updateIndicator]);
	return (
		<div
			ref={containerRef}
			className={`toggle-group relative flex bg-muted rounded-lg border-2 border-border ${className}`}
		>
			<div
				className="toggle-indicator"
				style={{
					left: `${indicatorStyle.left}px`,
					width: `${indicatorStyle.width}px`,
					height: "calc(100%)",
					top: "0px",
					transition: indicatorStyle.animate
						? "left 200ms ease, width 200ms ease"
						: "none",
				}}
			/>
			{options.map((option, index) => (
				<button
					type="button"
					key={option.value}
					ref={(el) => {
						buttonsRef.current[index] = el;
					}}
					onClick={() => onChange(option.value)}
					className={`flex-1 px-3 sm:px-4 py-3 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap ${
						value === option.value
							? "text-primary"
							: "text-muted-foreground"
					}`}
					aria-label={option.ariaLabel || `Select ${option.label}`}
					aria-pressed={value === option.value}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
