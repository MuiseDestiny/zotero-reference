import Utils from "./utils";
import AddonPrefs from "./prefs";
import AddonViews from "./views";
import AddonEvents from "./events";
import ZoteroToolkit from "zotero-plugin-toolkit"
import { addonName, addonID, addonRef } from "../package.json";

class Addon {
  public events: AddonEvents;
  public views: AddonViews;
  public prefs: AddonPrefs;
  public utils: Utils;
  public toolkit: ZoteroToolkit;
  public rootURI: string;
  /**
   * addon config
   */
  public addonName = addonName;
  public addonID = addonID;
  public addonRef = addonRef;
  constructor() {
    this.toolkit = new ZoteroToolkit();
    this.utils = new Utils(this);
    this.views = new AddonViews(this);
    this.prefs = new AddonPrefs(this);
    this.events = new AddonEvents(this);
  }
}

export default Addon;