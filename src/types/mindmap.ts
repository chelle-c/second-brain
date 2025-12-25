export interface MindMapNode {
	id: string;
	text: string;
	x: number;
	y: number;
	children: string[];
	parentId?: string;
}

export interface MindMapsData {
	mindMaps: MindMapNode[];
	version: string;
}
