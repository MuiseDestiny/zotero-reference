type ItemBaseInfo = {
	identifiers: {
		DOI?: string;
		arXiv?: string;
		CNKI?: string; 
	};
	authors: string[];
	type: "journalArticle" | "preprint" | string;
	text?: string;
	year?: string;
	title?: string;
	url?: string;
	_item?: _ZoteroItem;
}

type ItemInfo = ItemBaseInfo &  {
	publishDate?: string | number;
	abstract?: string | undefined;
	primaryVenue?: string
	source?: string;
	tags?: string[] | { text: string, color: string, tip?: string }[];
	references?: ItemBaseInfo[]
}

type PDFLine = {
	x: number,
	_x?: number,
	y: number,
	text: string,
	height: number,
	_height: number[],
	width: number,
	url?: string,
}

type PDFItem = {
	chars: {
		baseline: number;
		c: string;
		fontName: string;
		fontSize: number;
		rect: number[];
		rotation: number;
	}[];
	dir: string;
	fontName: string;
	height: number;
	str: string;
	transform: number[];
	width: number;
}

type PDFAnnotation = {
	rect: number[];
	url?: string;
	unsafeUrl?: string;
}

export { ItemBaseInfo, ItemInfo, Reference, PDFItem, PDFAnnotation, PDFLine}