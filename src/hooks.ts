import { config } from "../package.json";
import { registerPrefsScripts, registerPrefs } from "./modules/prefs";
import Views from "./modules/views";
import ConnectedPapers from "./modules/connectedpapers";


async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  await onMainWindowLoad(window);
}

async function onMainWindowLoad(win: Window): Promise < void> {
  registerPrefs();
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  const show = ztoolkit.ProgressWindow.prototype.show;
  ztoolkit.ProgressWindow.prototype.show = function () {
    Zotero.ProgressWindowSet.closeAll();
    return show.call(this, ...arguments);
  };
  // 界面
  const views = new Views();
  await views.onInit();
  Zotero[config.addonInstance].views = views;
  // connected papers
  // await new ConnectedPapers(views).init();
  const s1 = Zotero.Prefs.get(`${config.addonRef}.notAutoRefreshItemTypes`) as string
  const s2 = Zotero.Prefs.get("sync.server.username") as string
  if (
    [
      "polygon", // cp0
      "wddxg_", // cp1
      "ZJY_Anes", // cp2
      "Zx-Josh", //cp3
      "Cccccc_kx", // cp4
      "yzayea", // cp5
      "gkottawl", // cp6
      "w2802653181", // cp7
      "magicdroidx", // cp8
      "wang13078455274", // cp9
      "lygwsw", // cp10
      "pkaixin99", // cp11
      "pez0108", // cp12
      "erniao-0412", // cp13
      "Freedom1615", // cp14
      "SRW790314", // cp15
      "lynnyl_6969", // cp16
      "pengershuaii", // cp17
      "haha_lfl", // cp18
      "loverourself", //cp19
      "fangyuanalex", // cp20
      "Hydrogen_X", // cp21
      "lf15598111761", // cp22,
      "ASHINEPX", // cp26
      "licheng1148951981", //cp28
      "raykr", // cp29,
      "zhufengyi810@live.com", // cp30
      "tens.arroyos_0j@icloud.com", // cp31
      "528946911@qq.com", // cp32,
      "1053029438@qq.com", // cp34,
      "JingkeWu", // cp36,
      "llity@outlook.com", // cp37,
      
    ].find(i => s1.indexOf(i) >= 0 || s2 == i)
  ) {
    await new ConnectedPapers(views).init();
  }
}


async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
}


function onShutdown(): void {
  ztoolkit.unregisterAll();
  document
    .querySelectorAll("#zotero-reference-show-hide-graph-view")
    .forEach((e) => e.remove());
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
