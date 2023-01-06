import Addon from "./addon";
import AddonModule from "./module";

class AddonPrefs extends AddonModule {
  public _window: Window;
  constructor(parent: Addon) {
    super(parent);
  }
  public initPreferences(_window: Window) {
    this.Addon.toolkit.Tool.log(`${this.Addon.addonName}: init preferences`);
    this._window = _window;
    this.updatePrefsUI();
    this.bindPrefEvents();
  }

  public get(key) {
    return Zotero.Prefs.get(`${this.Addon.addonRef}.${key}`)
  }

  public set(key, value) {
    return Zotero.Prefs.set(`${this.Addon.addonRef}.${key}`, value)
  }

  private updatePrefsUI() {
    this.Addon.toolkit.Tool.log(`${this.Addon.addonName}: init preferences UI`);
  }

  private bindPrefEvents() {
    
  }
}

export default AddonPrefs;