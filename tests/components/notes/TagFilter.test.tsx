import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { BookOpen, Lightbulb, Target } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TagFilter } from "@/apps/Notes/components/TagFilter";
import type { Tag } from "@/types/notes";

describe("TagFilter", () => {
	const mockTags: Record<string, Tag> = {
		ideas: {
			id: "ideas",
			name: "Ideas",
			color: "#3b82f6",
			icon: Lightbulb,
		},
		actions: {
			id: "actions",
			name: "Actions",
			color: "#10b981",
			icon: Target,
		},
		reference: {
			id: "reference",
			name: "Reference",
			color: "#f59e0b",
			icon: BookOpen,
		},
	};

	const mockSetActiveTags = vi.fn();

	const openPopover = async (user: ReturnType<typeof userEvent.setup>) => {
		// The trigger button text changes based on active tags, so we find it by data-slot attribute
		const trigger = document.querySelector('[data-slot="popover-trigger"]') as HTMLElement;
		await user.click(trigger);
	};

	const getPopoverContent = () => {
		return document.querySelector('[data-slot="popover-content"]') as HTMLElement;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render filter trigger button", () => {
		render(
			<TagFilter
				tags={mockTags}
				activeTags={[]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		expect(screen.getByText("Filter by tag")).toBeInTheDocument();
	});

	it("should render all available tags in popover", async () => {
		const user = userEvent.setup();
		render(
			<TagFilter
				tags={mockTags}
				activeTags={[]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		await openPopover(user);

		expect(screen.getByText("Ideas")).toBeInTheDocument();
		expect(screen.getByText("Actions")).toBeInTheDocument();
		expect(screen.getByText("Reference")).toBeInTheDocument();
	});

	it("should highlight active tags", async () => {
		const user = userEvent.setup();
		render(
			<TagFilter
				tags={mockTags}
				activeTags={["ideas"]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		await openPopover(user);

		const popover = getPopoverContent();
		const ideasButton = within(popover).getByRole("button", { name: /ideas/i });
		expect(ideasButton).toHaveClass("bg-primary/10");
	});

	it("should not highlight inactive tags", async () => {
		const user = userEvent.setup();
		render(
			<TagFilter
				tags={mockTags}
				activeTags={["ideas"]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		await openPopover(user);

		const actionsButton = screen.getByRole("button", { name: /actions/i });
		expect(actionsButton).toHaveClass("text-foreground");
		expect(actionsButton).not.toHaveClass("bg-primary/10");
	});

	it("should call setActiveTags when tag is clicked", async () => {
		const user = userEvent.setup();
		render(
			<TagFilter
				tags={mockTags}
				activeTags={[]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		await openPopover(user);

		const ideasButton = screen.getByRole("button", { name: /ideas/i });
		await user.click(ideasButton);

		expect(mockSetActiveTags).toHaveBeenCalledWith(["ideas"]);
	});

	it("should remove tag when active tag is clicked", async () => {
		const user = userEvent.setup();
		render(
			<TagFilter
				tags={mockTags}
				activeTags={["ideas", "actions"]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		await openPopover(user);

		const popover = getPopoverContent();
		const ideasButton = within(popover).getByRole("button", { name: /ideas/i });
		await user.click(ideasButton);

		expect(mockSetActiveTags).toHaveBeenCalledWith(["actions"]);
	});

	it("should show clear all button when tags are active", async () => {
		const user = userEvent.setup();
		render(
			<TagFilter
				tags={mockTags}
				activeTags={["ideas", "actions"]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		await openPopover(user);

		expect(screen.getByText("Clear all filters")).toBeInTheDocument();
	});

	it("should not show clear all button when no tags are active", async () => {
		const user = userEvent.setup();
		render(
			<TagFilter
				tags={mockTags}
				activeTags={[]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		await openPopover(user);

		expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();
	});

	it("should clear all tags when clear all is clicked", async () => {
		const user = userEvent.setup();
		render(
			<TagFilter
				tags={mockTags}
				activeTags={["ideas", "actions"]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		await openPopover(user);

		const clearButton = screen.getByText("Clear all filters");
		await user.click(clearButton);

		expect(mockSetActiveTags).toHaveBeenCalledWith([]);
	});

	it("should handle multiple active tags", async () => {
		const user = userEvent.setup();
		render(
			<TagFilter
				tags={mockTags}
				activeTags={["ideas", "actions", "reference"]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		await openPopover(user);

		const popover = getPopoverContent();
		const ideasButton = within(popover).getByRole("button", { name: /ideas/i });
		const actionsButton = within(popover).getByRole("button", { name: /actions/i });
		const referenceButton = within(popover).getByRole("button", { name: /reference/i });

		expect(ideasButton).toHaveClass("bg-primary/10");
		expect(actionsButton).toHaveClass("bg-primary/10");
		expect(referenceButton).toHaveClass("bg-primary/10");
	});

	it("should render with empty tags object", async () => {
		const user = userEvent.setup();
		render(
			<TagFilter tags={{}} activeTags={[]} setActiveTags={mockSetActiveTags} />,
		);

		expect(screen.getByText("Filter by tag")).toBeInTheDocument();

		await openPopover(user);

		expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();
	});

	it("should show active tag count on trigger button", () => {
		render(
			<TagFilter
				tags={mockTags}
				activeTags={["ideas", "actions"]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		expect(screen.getByText("2")).toBeInTheDocument();
	});

	it("should display active tag names on trigger button", () => {
		render(
			<TagFilter
				tags={mockTags}
				activeTags={["ideas"]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		expect(screen.getByText("Ideas")).toBeInTheDocument();
	});
});
