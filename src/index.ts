import Addon from "./addon";

/**
 * Globals: bootstrap.js > ctx
 * const ctx = {
    Zotero,
    rootURI,
    window,
    document: window.document,
    ZoteroPane: Zotero.getActiveZoteroPane(),
  };
 */
if (!Zotero.ZoteroReference) {
  Zotero.ZoteroReference = new Addon();
  // @ts-ignore
  Zotero.ZoteroReference.events.onInit();
}