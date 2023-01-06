import Addon from "./addon";

if (!Zotero.ZoteroReference) {
  Zotero.ZoteroReference = new Addon();
  // @ts-ignore
  Zotero.ZoteroReference.events.onInit();
}