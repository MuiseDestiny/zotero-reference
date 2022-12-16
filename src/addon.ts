import AddonEvents from "./events";
import AddonPrefs from "./prefs";
import AddonViews from "./views";
import Utils from "./utils";

const { addonName } = require("../package.json");

class Addon {
  public events: AddonEvents;
  public views: AddonViews;
  public prefs: AddonPrefs;
  public utils: Utils;
  public DOIData = {};
  public DOIRefData = {};
  public DOIRegex = /10\.\d{4,9}\/[-\._;\(\)\/:A-z0-9]+/;
  public absoluteDOIRegex = /^10\.\d{4,9}\/[-\._;\(\)\/:A-z0-9]+$/;


  constructor() {
    this.utils = new Utils(this);
    this.views = new AddonViews(this);
    this.prefs = new AddonPrefs(this);
    this.events = new AddonEvents(this);
  }
}

export { addonName, Addon };
