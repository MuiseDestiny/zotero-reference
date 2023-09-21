import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { ConnectedPapersClient } from 'connectedpapers-js';

const GraphResponseStatuses = {
  BAD_ID: "BAD_ID",
  ERROR: "ERROR",
  NOT_IN_DB: "NOT_IN_DB",
  OLD_GRAPH: "OLD_GRAPH",
  FRESH_GRAPH: "FRESH_GRAPH",
  IN_PROGRESS: "IN_PROGRESS",
  QUEUED: "QUEUED",
  BAD_TOKEN: "BAD_TOKEN",
  BAD_REQUEST: "BAD_REQUEST",
  OUT_OF_REQUESTS: "OUT_OF_REQUESTS"
}

async function askUserAccessToken(update = false) {
  const dialogData: { [key: string | number]: any } = {
    inputValue: "",
    loadCallback: () => {
    },
    unloadCallback: () => {
    },
  };
  const dialogHelper = new ztoolkit.Dialog(10, 2)
    .addCell(0, 0, {
      tag: "input",
      namespace: "html",
      id: "dialog-input",
      styles: {
        width: "300px",
      },
      attributes: {
        "data-bind": "inputValue",
        "data-prop": "value",
        type: "text",
      },
    }, true)
    .addButton(update ? "Update" : "Set", update ? "Update" : "Set")
    .setDialogData(dialogData)
    .open("Connected Papers API Key", {
      width: 300,
      centerscreen: true,
      alwaysRaised: true
    });
  addon.data.dialog = dialogHelper;
  await dialogData.unloadLock.promise;
  ztoolkit.log(dialogData)
  if (dialogData.inputValue) {
    Zotero.Prefs.set("ConnectedPapers.accessToken", dialogData.inputValue)
  }
  return dialogData.inputValue 
}

export default async function buildGraphData(id: string, popupWin: ProgressWindowHelper): Promise<Graph |undefined> {
  // 读取密钥
  let accessToken = Zotero.Prefs.get("ConnectedPapers.accessToken") as string
  if (!accessToken) {
    accessToken = await askUserAccessToken() as string
    if (accessToken) { return }
  }
  const client = new ConnectedPapersClient({ access_token: accessToken });
  ztoolkit.log("id", id)
  if (id) {
    popupWin.changeLine({ text: "Building", type: "connectedpapers"})
  } else {
    popupWin.changeLine({ text: "Paper ID not Found", type: "fail" })
    popupWin.startCloseTimer(3000)
  }
  const iterator = client.getGraphAsyncIterator({
    paper_id: id,
    fresh_only: true,
    loop_until_fresh: true
  }) as AsyncGenerator<GraphResponse>
  let temp
  while (true) {
    temp = (await iterator.next()).value as GraphResponse
    ztoolkit.log(temp, temp.status)
    let isDone = false
    switch (temp.status) {
      case GraphResponseStatuses.QUEUED:
        popupWin.changeLine({ progress: 0, text: "0% Building" })
        break;
      case GraphResponseStatuses.IN_PROGRESS:
        popupWin.changeLine({ progress: temp.progress, text: `${temp.progress}% Building` })
        break;
      case GraphResponseStatuses.FRESH_GRAPH:
        popupWin.changeLine({ progress: 100, text: `100% Building` })
        isDone = true;
        break;
      case GraphResponseStatuses.OLD_GRAPH:
        popupWin.changeLine({ type: "connectedpapers", text: `Read Old Graph` })
        isDone = true;
        break;
      default:
        isDone = true;
        popupWin.changeLine({ text: temp.status, type: "fail" })
        const accessToken = await askUserAccessToken(true) as string
        if (accessToken) {
          return await buildGraphData(id, popupWin)
        }
        break
    }
    if (isDone) { break }
    await Zotero.Promise.delay(100)
  }
  if (temp.graph_json) {
    popupWin.changeLine({ progress: 100, text: "100% Building" })
    const graphData = temp.graph_json
    return graphData
  }
}