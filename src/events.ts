import { log } from "../../zotero-plugin-toolkit/dist/utils";
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
    log("Zotero Reference AddonEvents onInit")
    // @ts-ignore
    this.Addon.rootURI = rootURI;
    // Reset prefs
    this.initPrefs();
    // View
    this.Addon.views.initViews();

    // Register the callback in Zotero as an item observer
    let notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, [
      "tab",
      "item",
      "file",
    ]);

    // Unregister callback when the window closes (important to avoid a memory leak)
    window.addEventListener(
      "unload",
      (e) => {
        Zotero.Notifier.unregisterObserver(notifierID);
      },
      false
    );

    await this.Addon.toolkit.Prompt.registerExample()
  }

  public initPrefs() {
    // before
    const defaultPrefs = {
      priorityPDF: true,
      prioritySource: "PDF",
      preLoadingPageNum: 4,
      autoRefresh: false,
      notAutoRefreshItemTypes: "book, letter, note",
      isShowTip: true,
      ctrlClickTranslate: true,
      showTipAfterMillisecond: "233",
      shadeMillisecond: 233,
      removeTipAfterMillisecond: "500",
      loadingRelated: true,
      modifyLinks: true,
      arXivInfoIndex: 0,
      DOIInfoIndex: 0,
      TitleInfoIndex: 0,
      savePDFReferences: false,
      saveAPIReferences: false
    }
    for (let key in defaultPrefs) {
      if (this.Addon.prefs.get(key) == undefined) {
        this.Addon.prefs.set(key, defaultPrefs[key])
      }
    }
    // init
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

  private unInitPrefs() {
    if (!this.Addon.toolkit.Compat.isZotero7()) {
      this.Addon.toolkit.Compat.unregisterPrefPane();
    }
  }

  public async onReaderSelect(reader) {
    log("onReaderSelect is called")
    await this.Addon.views.updateReferenceUI(reader);
  }

  public onUnInit(): void {
    //  Remove elements and do clean up
    this.Addon.views.unInitViews();
    // remove Prefs
    this.unInitPrefs()
    // Remove addon object
    Zotero.ZoteroReference = undefined;
  }
}

export default AddonEvents;
