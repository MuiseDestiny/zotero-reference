import { config } from "../package.json";
import { getString, initLocale } from "./modules/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import Views from "./modules/views";
import ConnectedPapers from "./modules/connectedpapers";
import { Validation } from "../../validation/core";

async function onStartup() {
  new Validation(config.addonRef);
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();
  ztoolkit.UI.basicOptions.ui.enableElementRecord = false;
  ztoolkit.UI.basicOptions.ui.enableElementJSONLog = false;
  // 右下角提示
  ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/favicon.png`
  );
  const show = ztoolkit.ProgressWindow.prototype.show;
  ztoolkit.ProgressWindow.prototype.show = function () {
    Zotero.ProgressWindowSet.closeAll();
    return show.call(this, ...arguments);
  };
  // 首选项
  const prefOptions = {
    pluginID: config.addonID,
    src: rootURI + "chrome/content/preferences.xhtml",
    label: getString("prefs.label"),
    image: `chrome://${config.addonRef}/content/icons/favicon.png`,
    extraDTD: [`chrome://${config.addonRef}/locale/overlay.dtd`],
    defaultXUL: true,
  };
  ztoolkit.PreferencePane.register(prefOptions);

  // 界面
  const views = new Views();
  await views.onInit();
  Zotero[config.addonInstance].views = views;
  // connected papers
  await new ConnectedPapers(views).init();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string>,
  extraData: { [key: string]: any }
) {
  // You can add your code to the corresponding notify type
  ztoolkit.log("notify", event, type, ids, extraData);
  if (
    event == "select" &&
    type == "tab" &&
    extraData[ids[0]].type == "reader"
  ) {
    // BasicExampleFactory.exampleNotifierCallback();
  } else {
    return;
  }
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintian.

export default {
  onStartup,
  onShutdown,
  onNotify,
  onPrefsEvent,
};
