import Requests from "./requests";
import { config } from "../../package.json";

import Views from "./views";
const d3 = require("./d3")

export default class ConnectedPapers {
  private popupWin: any;
  private requests!: Requests;
  private frame!: HTMLIFrameElement;
  private views!: Views
  private container?: HTMLDivElement;
  constructor(views: Views) {
    this.requests = new Requests()
    this.views = views
  }

  public async init() {
    await this.createContainer()
    // await this.createFrame()
    this.registerButton()
  }

  private registerButton() {
    ztoolkit.log("registerButton is called")
    const node = document.querySelector("#zotero-tb-advanced-search")
    ztoolkit.log(node)
    let newNode = node?.cloneNode(true) as XUL.ToolBarButton
    newNode.setAttribute("id", "zotero-reference-show-hide-graph-view")
    newNode.setAttribute("tooltiptext", "show/hide")
    newNode.setAttribute("command", "")
    newNode.setAttribute("oncommand", "")
    newNode.addEventListener("click", () => {
      let node = this.container;
      if (!node) {return }
      if (node.style.display == "none") {
        node.style.display = ""
        Zotero.Prefs.set(`${config.addonRef}.graphView.enable`, true)
      } else {
        node.style.display = "none"
        Zotero.Prefs.set(`${config.addonRef}.graphView.enable`, false)
      }
    })
    newNode.setAttribute("class", "")
    newNode.style.listStyleImage = `url(chrome://${config.addonRef}/content/icons/connectedpapers.png)`
    document.querySelector("#zotero-items-toolbar")?.insertBefore(newNode, node?.nextElementSibling!)
    ztoolkit.log(document.querySelector("#zotero-items-toolbar"))
  }

  public async getGraphData(id: string): Promise<any> {
    this.popupWin ??= new ztoolkit.ProgressWindow("[Pending] Connected Papers", { closeOtherProgressWindows: true, closeTime: -1 })
      .createLine({ text: "Initializing", type: "default" })
      .show()
    const Q: any = {
      "1": "OK",
      "2": "LONG_PAPER",
      "3": "IN_PROGRESS",
      "4": "NOT_RUN",
      "5": "ADDED_TO_QUEUE",
      "6": "ERROR",
      "7": "OVERLOADED",
      "8": "IN_QUEUE",
      "9": "NOT_IN_API"
    }
    let parse = async (t: ArrayBuffer) => {
      let a = t;
      const J = 16
      const s = a.slice(0, J)
      const l = new Uint32Array(s.slice(4, 8))
        , c = l[0];
      const pako = require('pako');
      var F = new window.TextDecoder("utf-8");
      a = a.slice(8);
      const p = new window.Uint32Array(a.slice(0, 4))
        , d = p[0]
        , u = a.slice(4, 4 + d);
      if (c == 1) {
        const e = new window.Uint8Array(u),
          t = pako.inflate(e),
          i = F.decode(t),
          r = JSON.parse(i)
        return r
      } else {
        const e = new window.Uint32Array(u)[0];
        this.popupWin.changeLine({ progress: e, text: `[${e || 1}/100] Building` })
        await Zotero.Promise.delay(100);
        return 
      }
    }
    let e = await window.fetch(
      `https://rest.connectedpapers.com/graph_no_build/${id}`,
      {
        credentials: "same-origin",
        headers: {
          accept: "application/json, text/plain, */*",
          referer: "https://www.connectedpapers.com/",
          origin: "https://www.connectedpapers.com",
          "sec-fetch-site": "same-site"
        }
      }
    )
    let a = await e.arrayBuffer() as ArrayBuffer
    const data: any = await parse(a)
    if (data) {
      return data
    } else {
      return await this.getGraphData(id)
    }
  }

  private async getPaperID(item: Zotero.Item) {
    const api = `https://rest.connectedpapers.com/search/${item.getField("title")}/1`
    let response = await this.requests.post(api)
    try {
      return response.results[0].id
    }catch{}
  }

  public async buildGraphData(item: Zotero.Item) {
    this.popupWin = new ztoolkit.ProgressWindow("[Pending] Connected Papers", { closeOtherProgressWindows: true, closeTime: -1 })
      .createLine({ text: "Initializing", type: "default" })
      .show()
    // 获取id
    let id = await this.getPaperID(item);
    if (id) {
      this.popupWin.changeLine({ progress: 1, text: "[1/100] Building" })
    } else{
      this.popupWin.changeHeadline("[Fail] Connected Papers")
      this.popupWin.changeLine({ type: "fail" })
      this.popupWin.startCloseTimer(3000)
    }
    this.requests.post(
      `https://rest.connectedpapers.com/graph/${id}`,
    )
    let graphData = await this.getGraphData(id);
    ztoolkit.log(graphData)
    const totalNum = Object.keys(graphData.nodes).length  
    this.popupWin.changeLine({ text: `[1/${totalNum}] Indexing`, progress: 1, type: "default"})
    let search: any = {}
    for (let paperID in graphData.nodes) {
      search[paperID] = this.views.utils.searchItem(this.toItemInfo(graphData.nodes[paperID]))
    }
    let i = 0
    for (let paperID in graphData.nodes) {
      i += 1
      let localItem
      try {
        localItem = await search[paperID]
      } catch { }
      this.popupWin.changeLine({ text: `[${i}/${totalNum}] Indexing`, progress: 100 * i / totalNum })
      graphData.nodes[paperID]._itemID = localItem?.id
    }
    ztoolkit.log(graphData)
    this.popupWin.changeHeadline("[Done] Connected Papers")
    this.popupWin.changeLine({ text: `[${totalNum}/${totalNum}] Indexing`, type: "success" })
    this.popupWin.startCloseTimer(3000)
    this.popupWin = undefined
    return graphData
  }

  private async _createContainer() {
    document.querySelectorAll("#graph").forEach(e => e.remove());
    document.querySelectorAll(".resizer").forEach(e => e.remove())
    while (!document.querySelector("#item-tree-main-default")) {
      await Zotero.Promise.delay(100)
    }
    const mainNode = document.querySelector("#item-tree-main-default")!
    const resizer = ztoolkit.UI.createElement(document, "div", {
      classList: ["resizer"],
      styles: {
        width: "100%",
        height: "1px",
        backgroundColor: "#cccccc",
        cursor: "ns-resize"
      }
    })
    // 图形容器
    const container = ztoolkit.UI.createElement(document, "div", {
      namespace: "html",
      id: "graph",
      styles: {
        width: "100%",
        height: "350px",
        display: Zotero.Prefs.get(`${config.addonRef}.graphView.enable`) ? "" : "none"
      },
      children: [
        {
          namespace: "svg",
          tag: "svg",
          id: "graph-svg",
          styles: {
            width: "100%",
            height: "100%"
          }
        }
      ]
    }) as HTMLDivElement
    mainNode.append(resizer, container)
    // 可调
    let y = 0;
    let bottomHeight = 0;
    const mouseDownHandler = function (e: any) {
      y = e.clientY;
      bottomHeight = container.getBoundingClientRect().height;

      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    };
    const mouseMoveHandler = function (e: any) {
      const dy = e.clientY - y;
      container.style.height = `${bottomHeight - dy}px`;
    };
    const mouseUpHandler = function () {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
    // Attach the handler
    resizer.addEventListener('mousedown', mouseDownHandler);
    this.container = container

    this.requests = new Requests()
    let isFocus = true
    mainNode.addEventListener("blur", () => {
      isFocus = false
    })
    mainNode.addEventListener("focus", () => {
      isFocus = true
    })
    let isClick = false
    document.addEventListener("mousedown", (event: any) => {
      isClick = true
    })
    document.addEventListener("mouseup", (event: any) => {
      isClick = false
    })
    document.addEventListener("keyup", async (event: any) => {
      ztoolkit.log(event)
      if (!(Zotero_Tabs.selectedIndex == 0 && event.key == "Control" && isFocus && !isClick)) { return }
      let items = ZoteroPane.getSelectedItems()
      if (items.length != 1) { return }
      await this.refresh(items[0])
    })
  }

  private async createContainer() {
    document.querySelectorAll("#graph").forEach(e => e.remove());
    document.querySelectorAll(".resizer").forEach(e => e.remove())
    while (!document.querySelector("#item-tree-main-default")) {
      await Zotero.Promise.delay(100)
    }
    const mainNode = document.querySelector("#item-tree-main-default")!
    // 图形容器
    const minHeight = 200
    const container = ztoolkit.UI.createElement(document, "div", {
      id: "graph-view",
      styles: {
        width: "100%",
        minHeight: `${minHeight}px`,
        height: Zotero.Prefs.get(`${config.addonRef}.graphView.height`) as string,
        display: Zotero.Prefs.get(`${config.addonRef}.graphView.enable`) ? "" : "none",
      }
    })
    this.container = container
    const frame = this.frame = ztoolkit.UI.createElement(document, "iframe", {namespace: "html"}) as HTMLIFrameElement
    frame.setAttribute("src", `chrome://${config.addonRef}/content/dist/index.html`)
    frame.style.border = "none"
    frame.style.outline = "none"
    frame.style.width = "100%"
    frame.style.height = container.style.height;
    frame.style.overflow = "hidden"
    frame.style.backgroundColor = "#ffffff"
    container.append(frame)
    mainNode.append(container)
    let isFocus = true
    mainNode.addEventListener("blur", () => {
      isFocus = false
    })
    mainNode.addEventListener("focus", () => {
      isFocus = true
    })
    let isClick = false
    document.addEventListener("mousedown", (event: any) => {
      isClick = true
    })
    document.addEventListener("mouseup", (event: any) => {
      isClick = false
    })
    document.addEventListener("keyup", async (event: any) => {
      ztoolkit.log(event)
      if (!(Zotero_Tabs.selectedIndex == 0 && event.key == "Control" && isFocus && !isClick)) { return }
      let items = ZoteroPane.getSelectedItems()
      const item = items[0]
      if (items.length != 1) { return }
      await this.refresh(item)
    })


    const resizer = ztoolkit.UI.createElement(document, "div", {
      styles: {
        height: `1px`,
        width: "100%",
        backgroundColor: "#cecece",
        cursor: "ns-resize",
      },
    })
    container.insertBefore(resizer, frame)
    let y = 0, x = 0;
    let h = 0, w = 0;
    const mouseDownHandler = function (e: MouseEvent) {
      frame.style.display = "none"
      y = e.clientY;
      x = e.clientX;
      const rect = container.getBoundingClientRect()
      h = rect.height;
      w = rect.width;
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    };
    const mouseMoveHandler = (e: MouseEvent) => {
      const dy = e.clientY - y;
      let hh = h - dy
      const height = `${hh <= minHeight ? minHeight : hh}px`
      container.style.height = height;
      frame.style.height = height;
      Zotero.Prefs.set(`${config.addonRef}.graphView.height`, height)
    };
    const mouseUpHandler = () => {
      frame.style.display = ""

      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
    resizer.addEventListener('mousedown', mouseDownHandler);
    
  }

  private toItemInfo(item: any) {
    return {
      identifiers: { DOI: item.doi },
      title: item.title,
      year: item.year,
      authors: item.authors?.map((i: any) => i.name) || [],
      abstract: item.abstract,
      primaryVenue: item.venue,
      source: "connected papers",
      tags: item.fieldsOfStudy,
      type: "",
    }
  }

  private async refresh(item: Zotero.Item) {
    const graphData = await this.buildGraphData(item)
    const app = this.frame.contentWindow!.app as any
    ztoolkit.log(app)
    app.graphdata = graphData;
    app.$route.params.origin_id = graphData.start_id;
    app._paper_to_color = app._paper_to_color || app.paper_to_color
    app.paper_to_color = (paper: any) => {
      const ZOTERO_COLOR = "#c22727"
      let res_color = app._paper_to_color(paper)
      if (paper._itemID) {
        let res_hsl = d3.hsl(res_color);
        res_hsl.h = d3.hsl(ZOTERO_COLOR).h;
        res_hsl.s = (res_hsl.s + 2 * d3.hsl(ZOTERO_COLOR).s) / 3;
        return res_hsl + "";
      }
      return res_color
    }
    app.refresh_graph()
    app.graphdata.sim_node_circles
      .on("click", (event: any, it: any) => {
        const paperID = it.paperId
        const rect = this.frame.getBoundingClientRect()
        const winRect = document.documentElement.getBoundingClientRect()
        rect.y = winRect.height - rect.y - 10;
        const tipUI = this.views.showTipUI(
          rect,
          this.toItemInfo(graphData.nodes[paperID]),
          "top center"
        )
        // tipUI.container.style.backgroundColor = "#f0f0f0"
      })
      .on("contextmenu", async (event: any, it: any) => {
        ztoolkit.log(it)
        if (it._itemID) {
          if (!(await ZoteroPane.itemsView.selectItem(it._itemID))) {
            ZoteroPane.selectItem(it._itemID)
          }
        } else {
          // 添加文献
          const DOI = it.doi
          let popupWin = new ztoolkit.ProgressWindow("[Pending] Adding", { closeTime: -1 })
            .createLine({ text: DOI, type: "default" })
            .show()
          const collection = ZoteroPane.getSelectedCollection()
          let collections: number[] = []
          if (collection) {
            collections = [collection.id]
          }
          const newItem = await this.views.utils.createItemByZotero({ DOI }, collections) as Zotero.Item
          newItem.addRelatedItem(item)
          item.addRelatedItem(newItem)
          await newItem.saveTx();
          await item.saveTx()
          popupWin.changeHeadline("[Done] Adding")
          popupWin.changeLine({ type: "success" })
          popupWin.startCloseTimer(3000)
          return await this.refresh(item)
        }
      })
  }
}