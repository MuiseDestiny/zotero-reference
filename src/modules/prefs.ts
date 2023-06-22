import { config } from "../../package.json";


export function registerPrefs() {
  const prefOptions = {
    pluginID: config.addonID,
    src: rootURI + "chrome/content/preferences.xhtml",
    label: "Reference",
    image: `chrome://${config.addonRef}/content/icons/favicon.png`,
    // extraDTD: [`chrome://${config.addonRef}/locale/overlay.dtd`],
    // defaultXUL: true,
  };
  ztoolkit.PreferencePane.register(prefOptions);
}

export function registerPrefsScripts(_window: Window) {
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
    };
  } else {
    addon.data.prefs.window = _window;
  }
  const doc = addon.data.prefs!.window.document
}
