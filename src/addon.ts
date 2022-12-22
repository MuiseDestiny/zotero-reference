import AddonEvents from "./events";
import AddonPrefs from "./prefs";
import AddonViews from "./views";
import Utils from "./utils";
import ZoteroToolkit from "zotero-plugin-toolkit";

import { addonName, addonID, addonRef } from "../package.json";

class Addon {
  public events: AddonEvents;
  public views: AddonViews;
  public prefs: AddonPrefs;
  public utils: Utils;
  public toolkit: ZoteroToolkit;
  public rootURI: string;
  public addonName: string;
  public addonID: string;
  public addonRef: addonRef;
  public DOIData = {};
  public DOIRefData = {};
  public DOIRegex = /10\.\d{4,9}\/[-\._;\(\)\/:A-z0-9><]+[^\.\]]/;


  constructor() {
    this.addonName = addonName;
    this.addonID = addonID;
    this.addonRef = addonRef;
    
    this.toolkit = new ZoteroToolkit();
    this.utils = new Utils(this);
    this.views = new AddonViews(this);
    this.prefs = new AddonPrefs(this);
    this.events = new AddonEvents(this);
  }
}

export default Addon;