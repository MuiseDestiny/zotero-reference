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
    this._window.document
      .querySelector(`#zotero-prefpane-${this.Addon.addonRef}-enable`)
      ?.addEventListener("command", (e) => {
        this.Addon.toolkit.Tool.log(e);
        window.alert(
          `Successfully changed to ${(e.target as XUL.Checkbox).checked}!`
        );
      });
    
    this._window.document
      .querySelector(`#zotero-prefpane-${this.Addon.addonRef}-input`)
      ?.addEventListener("change", (e) => {
        this.Addon.toolkit.Tool.log(e);
        window.alert(
          `Successfully changed to ${(e.target as HTMLInputElement).value}!`
        );
      });
  }
}

export default AddonPrefs;