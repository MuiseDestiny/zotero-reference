import AddonEvents from "./events";
import AddonPrefs from "./prefs";
import AddonViews from "./views";
import Utils from "./utils";
import ZoteroToolkit from "E:/Github/zotero-plugin-toolkit"

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
  public addonName: string;
  public addonID: string;
  public addonRef: addonRef;
  /**
   * record api response
   */
  public cache = {}
  /**
   * regex
   */
  public idRegex = {
    DOI: /10\.\d{4,9}\/[-\._;\(\)\/:A-z0-9><]+[^\.\]]/,
    arXiv: /arXiv:(\d+\.\d+)/
  }

  public refRegex: RegExp[][] = [
    [/^[A-Z]\w.+?\(\d+[a-z]?\)/], // Polygon (2023a)
    [/^\[\d{0,3}\].+?[\,\.\uff0c\uff0e]?/],  // [10] Polygon
    [/^\uff3b\d{0,3}\uff3d.+?[\,\.\uff0c\uff0e]?/],  // ［1］
    [/^\[.+?\].+?[\,\.\uff0c\uff0e]?/], // [RCK + 20] 
    [/^\d+[^\d]+?[\,\.\uff0c\uff0e]?/],
    [/^[A-Z][A-Za-z]+[\,\.\uff0c\uff0e]?/, /^.+?,.+.,/, /^[\u4e00-\u9fa5]{1,4}[\,\.\uff0c\uff0e]?/],
  ]


  constructor() {
    this.addonName = addonName;
    this.addonID = addonID;
    this.addonRef = addonRef;
    
    this.toolkit = new ZoteroToolkit();
    console.log(this.toolkit)
    this.utils = new Utils(this);
    this.views = new AddonViews(this);
    this.prefs = new AddonPrefs(this);
    this.events = new AddonEvents(this);
  }
}

export default Addon;