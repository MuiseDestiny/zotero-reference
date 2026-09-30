import { config } from "../../package.json";


export function registerPrefs() {
  Zotero.PreferencePanes.register({
    pluginID: config.addonID,
    src: rootURI + "chrome/content/preferences.xhtml",
    label: "Reference",
    image: `chrome://${config.addonRef}/content/icons/favicon.png`,
  });
}

export function registerPrefsScripts(_window: Window) {
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
    } as any;
  } else {
    addon.data.prefs.window = _window;
  }
  const doc = addon.data.prefs!.window.document
}
