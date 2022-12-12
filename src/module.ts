class AddonModule {
  protected Addon: any;
  public Zotero: any;
  public window: any;
  public document: any;
  public isDebug = true;

  constructor(parent: any) {
    this.Zotero = Components.classes["@zotero.org/Zotero;1"].getService(
      Components.interfaces.nsISupports
    ).wrappedJSObject;
    this.window = this.Zotero.getMainWindow()
    this.document  = this.window.document
    this.Addon = parent;
  }

  public debug(...msg) {
    if (this.isDebug) {
      this.Zotero.debug("[zotero-reference]: ", ...msg)
      console.log("[zotero-reference]: ", ...msg)
    }

  }
}

export default AddonModule;
