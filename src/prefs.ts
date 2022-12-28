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

  private updatePrefsUI() {
    this.Addon.toolkit.Tool.log(`${this.Addon.addonName}: init preferences UI`);
  }

  private bindPrefEvents() {
    
  }
}

export default AddonPrefs;