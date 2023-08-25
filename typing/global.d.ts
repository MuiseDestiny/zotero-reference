declare const _globalThis: {
  [key: string]: any;
  Zotero: _ZoteroTypes.Zotero;
  ZoteroPane: _ZoteroTypes.ZoteroPane;
  Zotero_Tabs: typeof Zotero_Tabs;
  window: Window;
  document: Document;
  ztoolkit: ZToolkit;
  addon: typeof addon;
};

declare type ZToolkit = ReturnType<
  typeof import("../src/utils/ztoolkit").createZToolkit
>;

declare const ztoolkit: ZToolkit;

declare const rootURI: string;

declare const addon: import("../src/addon").default;

declare const __env__: "production" | "development";

declare class Localization { }

declare type Box = {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
  
declare type ItemBaseInfo = {
  identifiers: {
    DOI?: string;
    arXiv?: string;
    CNKI?: string;
    paperID?: string;
  };
  title: string;
  authors: string[];
  type?: "journalArticle" | "preprint" | string;
  text?: string;
  year?: string;
  url?: string;
  _item?: _ZoteroItem;
  _itemID?: number;
  number?: number;
  [key: string]: any;
}

declare type ItemInfo = ItemBaseInfo & {
  publishDate?: string | number;
  abstract?: string | undefined;
  primaryVenue?: string
  source?: string;
  tags?: (string[] | { text: string, color: string, tip?: string })[];
  references?: ItemBaseInfo[];
}

declare type PDFLine = {
  x: number,
  _x?: number,
  y: number,
  text: string,
  height: number,
  _height: number[],
  width: number,
  url?: string,
}

declare type PDFItem = {
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
  url?: string;
}

declare type PDFAnnotation = {
  rect: number[];
  url?: string;
  unsafeUrl?: string;
}

interface Rect {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
  x: number;
  y: number;
}