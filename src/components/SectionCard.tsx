import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionCardProps {
	title?: string;
	description?: string;
	icon?: React.ReactNode;
	action?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
	contentClassName?: string;
	noPadding?: boolean;
}

export function SectionCard({
	title,
	description,
	icon,
	action,
	children,
	className,
	contentClassName,
	noPadding = false,
}: SectionCardProps) {
	const hasHeader = title || description || icon || action;

	return (
		<Card className={cn("shadow-sm", className)}>
			{hasHeader && (
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{icon && <span className="text-muted-foreground">{icon}</span>}
							<div>
								{title && <CardTitle className="text-base">{title}</CardTitle>}
								{description && <CardDescription>{description}</CardDescription>}
							</div>
						</div>
						{action && <div>{action}</div>}
					</div>
				</CardHeader>
			)}
			<CardContent className={cn(noPadding && "p-0", !hasHeader && "pt-6", contentClassName)}>
				{children}
			</CardContent>
		</Card>
	);
}
