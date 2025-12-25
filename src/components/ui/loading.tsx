import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

interface LoadingProps {
	className?: string;
	size?: "sm" | "md" | "lg";
	text?: string;
	fullScreen?: boolean;
}

const sizeClasses = {
	sm: "size-4",
	md: "size-6",
	lg: "size-8",
};

function Loading({
	className,
	size = "md",
	text,
	fullScreen = false,
}: LoadingProps) {
	const content = (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-3",
				className,
			)}
		>
			<Spinner className={cn(sizeClasses[size], "text-primary")} />
			{text && <span className="text-sm text-muted-foreground">{text}</span>}
		</div>
	);

	if (fullScreen) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-background">
				{content}
			</div>
		);
	}

	return content;
}

function PageLoading() {
	return (
		<div className="flex-1 flex items-center justify-center min-h-[200px]">
			<Loading size="lg" />
		</div>
	);
}

export { Loading, PageLoading };
