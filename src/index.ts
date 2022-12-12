import { Addon } from "./addon";

var Zotero = Components.classes["@zotero.org/Zotero;1"].getService(
  Components.interfaces.nsISupports
).wrappedJSObject;
if (!Zotero.ZoteroReference) {
  Zotero.ZoteroReference = new Addon();
  Zotero.ZoteroReference.events.onInit();
}
