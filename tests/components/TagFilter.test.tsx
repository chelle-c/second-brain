import { render, screen } from "@testing-library/react";
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

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render filter label", () => {
		render(
			<TagFilter
				tags={mockTags}
				activeTags={[]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		expect(screen.getByText("Filter by tags:")).toBeInTheDocument();
	});

	it("should render all available tags", () => {
		render(
			<TagFilter
				tags={mockTags}
				activeTags={[]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		expect(screen.getByText("Ideas")).toBeInTheDocument();
		expect(screen.getByText("Actions")).toBeInTheDocument();
		expect(screen.getByText("Reference")).toBeInTheDocument();
	});

	it("should highlight active tags", () => {
		render(
			<TagFilter
				tags={mockTags}
				activeTags={["ideas"]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		const ideasButton = screen.getByRole("button", { name: /ideas/i });
		expect(ideasButton).toHaveClass("bg-primary/10");
	});

	it("should not highlight inactive tags", () => {
		render(
			<TagFilter
				tags={mockTags}
				activeTags={["ideas"]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		const actionsButton = screen.getByRole("button", { name: /actions/i });
		expect(actionsButton).toHaveClass("bg-muted");
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

		const ideasButton = screen.getByRole("button", { name: /ideas/i });
		await user.click(ideasButton);

		expect(mockSetActiveTags).toHaveBeenCalledWith(["actions"]);
	});

	it("should show clear all button when tags are active", () => {
		render(
			<TagFilter
				tags={mockTags}
				activeTags={["ideas", "actions"]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		expect(screen.getByText("Clear all")).toBeInTheDocument();
	});

	it("should not show clear all button when no tags are active", () => {
		render(
			<TagFilter
				tags={mockTags}
				activeTags={[]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
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

		const clearButton = screen.getByText("Clear all");
		await user.click(clearButton);

		expect(mockSetActiveTags).toHaveBeenCalledWith([]);
	});

	it("should handle multiple active tags", () => {
		render(
			<TagFilter
				tags={mockTags}
				activeTags={["ideas", "actions", "reference"]}
				setActiveTags={mockSetActiveTags}
			/>,
		);

		const ideasButton = screen.getByRole("button", { name: /ideas/i });
		const actionsButton = screen.getByRole("button", { name: /actions/i });
		const referenceButton = screen.getByRole("button", { name: /reference/i });

		expect(ideasButton).toHaveClass("bg-primary/10");
		expect(actionsButton).toHaveClass("bg-primary/10");
		expect(referenceButton).toHaveClass("bg-primary/10");
	});

	it("should render with empty tags object", () => {
		render(
			<TagFilter tags={{}} activeTags={[]} setActiveTags={mockSetActiveTags} />,
		);

		expect(screen.getByText("Filter by tags:")).toBeInTheDocument();
		expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
	});
});
