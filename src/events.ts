import Addon from "./addon";
import AddonModule from "./module";

class AddonEvents extends AddonModule {
  private notifierCallback: any;
  constructor(parent: Addon) {
    super(parent);
    this.notifierCallback = {
      notify: async (
        event: string,
        type: string,
        ids: Array<string>,
        extraData: object
      ) => {
        if (
          event == "select" &&
          type == "tab" &&
          extraData[ids[0]].type == "reader"
        ) {
          Zotero.debug("ZoteroReference: open attachment event detected.");
          let reader = Zotero.Reader.getByTabID(ids[0]);
          let delayCount = 0;
          while (!reader && delayCount < 10) {
            await Zotero.Promise.delay(100);
            reader = Zotero.Reader.getByTabID(ids[0]);
            delayCount++;
          }
          await reader?._initPromise;
          await this.onReaderSelect(reader);
        }
      },
    };
  }

  public async onInit() {
    this.Addon.toolkit.Tool.log("Zotero Reference AddonEvents onInit") 
    // @ts-ignore
    this.Addon.rootURI = rootURI;
    // Reset prefs
    this.Addon.views.initViews();
    this.initPrefs();

    // Register the callback in Zotero as an item observer
    let notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, [
      "tab",
      "item",
      "file",
    ]);

    // Unregister callback when the window closes (important to avoid a memory leak)
    Zotero.getMainWindow().addEventListener(
      "unload",
      (e) => {
        Zotero.Notifier.unregisterObserver(notifierID);
      },
      false
    );
  }

  public initPrefs() {
    const defaultPrefs = {
      priorityPDF: true,
      autoRefresh: false,
      notAutoRefreshItemTypes: "book, letter, note",
      ctrlClickTranslate: true
    }
    for (let key in defaultPrefs) {
      if (Zotero.Prefs.get(`${this.Addon.addonRef}.${key}`) == undefined) {
        Zotero.Prefs.set(`${this.Addon.addonRef}.${key}`, defaultPrefs[key])
      }
    }
    this.Addon.toolkit.Tool.log(this.Addon.rootURI);
    const prefOptions = {
      pluginID: this.Addon.addonID,
      src: this.Addon.rootURI + "chrome/content/preferences.xhtml",
      label: "Reference",
      image: `chrome://${this.Addon.addonRef}/skin/favicon.png`,
      extraDTD: [`chrome://${this.Addon.addonRef}/locale/overlay.dtd`],
      defaultXUL: true,
      onload: (_window: Window) => {
        this.Addon.prefs.initPreferences(_window);
      },
    };
    if (this.Addon.toolkit.Compat.isZotero7()) {
      Zotero.PreferencePanes.register(prefOptions);
    } else {
      this.Addon.toolkit.Compat.registerPrefPane(prefOptions);
    }
  }

  public async onReaderSelect(reader): Promise<void> {
    this.Addon.toolkit.Tool.log(this.Addon)
    await this.Addon.views.updateReferencePanel(reader);
  }

  public onUnInit(): void {
    //  Remove elements and do clean up
    this.Addon.views.unInitViews();
    // Remove addon object
    Zotero.ZoteroReference = undefined;
  }
}

export default AddonEvents;
