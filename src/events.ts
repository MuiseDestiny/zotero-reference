import { Addon, addonName } from "./addon";
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
          this.Zotero.debug("ZoteroReference: open attachment event detected.");
          let reader = this.Zotero.Reader.getByTabID(ids[0]);
          let delayCount = 0;
          while (!reader && delayCount < 10) {
            await this.Zotero.Promise.delay(100);
            reader = this.Zotero.Reader.getByTabID(ids[0]);
            delayCount++;
          }
          await reader._initPromise;
          await this.onReaderSelect(reader);
        }
      },
    };
  }

  public async onInit() {
    // This function is the setup code of the addon
    this.debug(`${addonName}: init called`);
    // alert(112233);

    // Reset prefs
    this.resetState();
    this.Addon.views.initViews();

    // Register the callback in Zotero as an item observer
    let notifierID = this.Zotero.Notifier.registerObserver(this.notifierCallback, [
      "tab",
      "item",
      "file",
    ]);

    // Unregister callback when the window closes (important to avoid a memory leak)
    this.Zotero.getMainWindow().addEventListener(
      "unload",
      (e) => {
        this.Zotero.Notifier.unregisterObserver(notifierID);
      },
      false
    );

    
  }

  private resetState(): void {
    /* 
      For prefs that could be simply set to a static default value,
      Please use addon/defaults/preferences/defaults.js
      Reset other preferrences here.
      Uncomment to use the example code.
    */
    // let testPref = Zotero.Prefs.get("addonTemplate.testPref");
    // if (typeof testPref === "undefined") {
    //   Zotero.Prefs.set("addonTemplate.testPref", true);
    // }
  }

  public async onReaderSelect(reader): Promise<void> {
    this.debug(this.Addon)
    await this.Addon.views.updateReferencePanel(reader);
  }

  public onUnInit(): void {
    this.debug(`${addonName}: uninit called`);
    //  Remove elements and do clean up
    this.Addon.views.unInitViews();
    // Remove addon object
    this.Zotero.AddonTemplate = undefined;
  }
}

export default AddonEvents;
