import { config } from "../package.json";
import { registerPrefsScripts, registerPrefs } from "./modules/prefs";
import Views from "./modules/views";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  registerPrefs();
  const show = ztoolkit.ProgressWindow.prototype.show;
  ztoolkit.ProgressWindow.prototype.show = function () {
    Zotero.ProgressWindowSet.closeAll();
    return show.call(this, ...arguments);
  };
  // The item pane section is registered once; Zotero adds it to every main window.
  const views = new Views();
  await views.onInit();
  addon.views = views;
  const win = Zotero.getMainWindow();
  if (win) { await onMainWindowLoad(win); }
}

async function onMainWindowLoad(win: Window): Promise<void> {
  // Fluent strings of the section header / sidenav
  (win as any).MozXULElement.insertFTLIfNeeded(`${config.addonRef}-addon.ftl`);
}

async function onMainWindowUnload(win: Window): Promise<void> {
  win.document.querySelector(`[href="${config.addonRef}-addon.ftl"]`)?.remove();
  addon.data.dialog?.window?.close();
}


function onShutdown(): void {
  addon.views?.unregister();
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  addon.data.dialog?.window?.close();
  delete Zotero[config.addonInstance];
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
  onPrefsEvent,
  onMainWindowLoad,
  onMainWindowUnload
};
