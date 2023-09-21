import Requests from "./requests";
import { config } from "../../package.json";

import Views from "./views";
import TipUI from "./tip";
import buildGraphData from "./GraphData-vip";
const d3 = require("./d3")

export default class ConnectedPapers {
  private requests!: Requests;
  private frame!: HTMLIFrameElement;
  private views!: Views
  private graphContainer?: HTMLDivElement;
  private relatedContainer?: HTMLDivElement
  // private splitterAfter!: HTMLElement;
  private boxAfter!: XUL.Box;
  private itemIDs: number[] = []
  private zoteroColor: boolean = true
  constructor(views: Views) {
    this.requests = new Requests()
    this.views = views
  }

  public async init() {
    this.addStyle()
    this.registerButton()
    this.initOnSelect()
    document.querySelectorAll("#graph").forEach(e => e.remove());
    // document.querySelectorAll(".resizer").forEach(e => e.remove())
    while (!document.querySelector("#item-tree-main-default")) {
      await Zotero.Promise.delay(100)
    }
    this.initItemsPane()
    this.initEditPane()
  }

  private addStyle() {
    const id = `${config.addonRef}-related-container`
    ztoolkit.UI.appendElement({
      tag: "style",
      id: `${config.addonRef}-style`,
      namespace: "html",
      properties: {
        innerHTML: `
          #${id} * {
            transition: background-color .1s linear;
          }
          #${id} .button, #${id} .item, #${id} .filter-button {
            height: 2em;
            line-height: 2em;
            cursor: pointer;
          }
          #${id} .button:hover, #${id} .item.hover {
            background-color: #f5f5f5;
          }
          #${id} .item.selected {
            background-color: #ebebeb;
          }
          #${id} .filter-button {
            display: inline-block;
            width: 50%;
            border: 1px solid rgb(238, 238, 238);
            text-align: center;
            color: #005028;
          }
          #${id} .filter-button:hover {
            background-color: #d9e5ec;
          }
          #${id} .filter-button.activate {
            color: #fff;
            background-color: #045384;
          }
          #${id} .item.highlight {
            background-color: #d9f5f9;
          }
          #${id} .item.highlight.hover {
            background-color: #d0ecf0;
          }
          #zotero-item-pane-content {
            width: 100%;
          }
        `// 这里添加后会让Mac的图标变形，所以遇Mac不添
        + (Zotero.isMac ? "" : `
        #zotero-reference-show-hide-graph-view .toolbarbutton-icon {
          width: 16px;
          height: 16px;
        }
        `) 
      },
      // #output-container div.streaming span:after,  
    }, document.documentElement);
  }

  private initOnSelect() {
    ZoteroPane.itemsView.onSelect.addListener(() => {
      this.updateAddOrRemove()
    })
  }

  private updateAddOrRemove() {
    const removeNode = this.relatedContainer?.querySelector("#remove-origin") as HTMLDivElement
    const addNode = this.relatedContainer?.querySelector("#add-origin") as HTMLDivElement
    if (this.itemIDs.indexOf(ZoteroPane.getSelectedItems()[0]?.id as number) >= 0) {
      if (removeNode) {
        removeNode.style.display = "flex"
      }
      if (addNode) {
        addNode.style.display = "none"
      }
    } else {
      if (removeNode) {
        removeNode.style.display = "none"
      }
      if (addNode) {
        addNode.style.display = "flex"
      }
    }
  }

  private registerButton() {
    const node = document.querySelector("#zotero-tb-advanced-search")
    let newNode = node?.cloneNode(true) as XUL.ToolBarButton
    newNode.setAttribute("id", "zotero-reference-show-hide-graph-view")
    newNode.setAttribute("tooltiptext", "show/hide")
    newNode.setAttribute("command", "")
    newNode.setAttribute("oncommand", "")
    newNode.addEventListener("click", async () => {
      let node = this.graphContainer;
      if (!node) {return }
      if (node.style.display == "none") {
        // this.splitterAfter.style.display = ""
        node.style.display = ""
        this.boxAfter.style.display = "block"
        Zotero.Prefs.set(`${config.addonRef}.graphView.enable`, true)
      } else {
        // this.splitterAfter.style.display = "none"
        node.style.display = "none"
        this.boxAfter.style.display = "none"
        Zotero.Prefs.set(`${config.addonRef}.graphView.enable`, false)
      }
    })
    newNode.style.listStyleImage = `url(chrome://${config.addonRef}/content/icons/connectedpapers.png)`
    document.querySelector("#zotero-items-toolbar")?.insertBefore(newNode, node?.nextElementSibling!)
  }

  /**
   * 注册右侧面板
   */
  private initEditPane() {
    // let relatedbox = (document.querySelector("#zotero-editpane-related") as Element);
    let beforeBox = (document.querySelector("#zotero-item-pane-content") as Element);
    beforeBox.parentElement?.setAttribute("orient", "vertical");
    const boxAfter = this.boxAfter = document.createElement("box") as XUL.Box;
    boxAfter.id = "connected-papers-relatedsplit-after";
    boxAfter.style.overflow = "hidden"
    boxAfter.style.backgroundColor = "#fff"
    beforeBox.after(boxAfter);
    boxAfter.style.display = "none";
    boxAfter.style.height = Zotero.Prefs.get(`${config.addonRef}.graphView.height`) as string
    // @ts-ignore
    boxAfter.style["padding-top"] = "0"
    this.buildRelatedPanel(boxAfter)
  }

  public buildRelatedPanel(box: XUL.Box) {
    document.querySelector("#zotero-items-splitter")
      ?.addEventListener("mousemove", () => {
        relatedContainer.style.width = document.querySelector("relatedbox")?.getBoundingClientRect().width + "px"
      })
    const relatedContainer = ztoolkit.UI.appendElement({
      // namespace: "xul",
      id: `${config.addonRef}-related-container`,
      tag: "div",
      styles: {
        margin: "0",
        padding: "0",
        width: document.querySelector("relatedbox")?.getBoundingClientRect().width + "px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%"
      },
      children: [
        // origin container
        {
          tag: "div", 
          id: "origin-items-container",
          styles: {
            display: "flex",
            flexDirection: "column"
          },
          children: [
            {
              tag: "div",
              styles: {
                maxHeight: "8em",
                overflow: "auto",
                borderTop: "1px solid #cecece",
                // borderBottom: "1px solid #cecece",
              },
              classList: ["origin-items"]
            },  
            // add origin
            {
              tag: "div",
              id: "add-origin",
              classList: ["button"],
              styles: {
                display: "flex",
                justifyContent: "center",
                alignContent: "center",
                cursor: "pointer",
                height: "2em",
              },
              children: [
                {
                  tag: "div",
                  classList: ["icon"],
                  properties: {
                    innerHTML: `<svg style="margin-right: .5em;" width="24" height="24"  viewBox="2 0 24 24" fill="#7a306c" xmlns="http://www.w3.org/2000/svg" class="graph-action-icon mr-[6px]" data-v-f4c185ee=""><path d="M11 19V13H5V11H11V5H13V11H19V13H13V19H11Z"></path></svg>`
                  }
                },
                {
                  tag: "span",
                  styles: {
                    lineHeight: "2em"
                  },
                  properties: {
                    innerText: "Add Origin",
                  }
                }
              ],
              listeners: [
                {
                  type: "click",
                  listener: async () => {
                    const item = ZoteroPane.getSelectedItems()[0]
                    const popupWin = new ztoolkit.ProgressWindow("Add Origin", {closeTime: -1})
                      .createLine({ text: item.getField("title") as string, type: "connectedpapers" })
                      .show()
                    let info: ItemInfo = {
                      identifiers: { DOI: item.getField("DOI") as string, paperID: await this.getPaperID(item) },
                      authors: item.getCreators().map((i: any) => i.firstName + " " + i.lastName),
                      tags: item.getTags().map((i: any) => {
                        // @ts-ignore
                        let ctag: any = item.getColoredTags().find((ci: any) => ci.tag == i.tag)
                        if (ctag) {
                          return { text: i.tag, color: ctag.color }
                        } else {
                          return i.tag
                        }
                      }),
                      abstract: item.getField("abstractNote") as string,
                      title: item.getField("title") as string,
                      year: item.getField("year") as string,
                      primaryVenue: item.getField("publicationTitle") as string,
                      type: "",
                      source: "Zotero",
                      _itemID: item.id
                    }
                    
                    this.addItem(
                      relatedContainer.querySelector("#origin-items-container .origin-items")!,
                      info,
                    )
                    this.itemIDs.push(item.id)
                    this.updateAddOrRemove()
                    popupWin.changeLine({ text: item.getField("title") as string, type: "success" })
                      .startCloseTimer(1000)
                  }
                }
              ]
            },
            // remove origin
            {
              tag: "div",
              id: "remove-origin",
              classList: ["button"],
              styles: {
                display: "none",
                justifyContent: "center",
                alignContent: "center",
                cursor: "pointer",
                height: "2em",
                backgroundColor: "#fff !important",
              },
              children: [
                {
                  tag: "div",
                  classList: ["icon"],
                  properties: {
                    innerHTML: `<svg style="margin-right: .5em;"  width="24" height="24" viewBox="0 0 24 24" fill="#7a306c" xmlns="http://www.w3.org/2000/svg" class="graph-action-icon mr-[6px]" data-v-f4c185ee=""><path d="M19 13H5V11H19V13Z"></path></svg>`
                  }
                },
                {
                  tag: "span",
                  styles: {
                    lineHeight: "2em"
                  },
                  properties: {
                    innerText: "Remove Origin",
                  }
                }
              ],
              listeners: [
                {
                  type: "click",
                  listener: () => {
                    const itemID = ZoteroPane.getSelectedItems()[0].id
                    this.itemIDs = this.itemIDs.filter(i => i != itemID)
                    relatedContainer.querySelectorAll(".normal-items .item")?.forEach(e => e.remove())
                    relatedContainer.querySelectorAll("#origin-items-container .origin-items .item")
                      .forEach(e => {
                        if (Number(e.getAttribute("zotero-item-id")) == itemID) {
                          e.remove()
                        }
                      })
                    this.updateAddOrRemove()
                  }
                }
              ]
            }
          ]
        },
        // build graph
        {
          tag: "div",
          id: "build-graph",
          classList: ["button"],
          styles: {
            width: "100%",
            borderTop: "1px solid #eee",
            borderBottom: "1px solid #eee",
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignContent: "center",
            cursor: "pointer",
            height: "2em"
          },
          children: [
            {
              tag: "div",
              styles: {
                display: "flex",
                justifyContent: "center",
                alignContent: "center",
              },
              properties: {
                innerHTML: `<svg style="margin: auto 0; margin-right: .5em;" width="20" height="20" viewBox="-8 -5.5 35 35" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M16.1757 14.0888L13.9333 7.08338L14.5478 6.93021L16.7901 13.9356L16.1757 14.0888Z" fill="url(#paint0_linear_icon)"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M6.33333 15.1579L11.4 6.31579L11.9499 6.62914L6.88322 15.4712L6.33333 15.1579Z" fill="url(#paint1_linear_icon)"></path><path d="M19 13.8947C19 15.29 17.8658 16.4211 16.4667 16.4211C15.0675 16.4211 13.9333 15.29 13.9333 13.8947C13.9333 12.4995 15.0675 11.3684 16.4667 11.3684C17.8658 11.3684 19 12.4995 19 13.8947Z" fill="url(#paint2_linear_icon)"></path><path d="M10.1333 18.9474C10.1333 21.7379 7.86491 24 5.06667 24C2.26842 24 0 21.7379 0 18.9474C0 16.1569 2.26842 13.8947 5.06667 13.8947C7.86491 13.8947 10.1333 16.1569 10.1333 18.9474Z" fill="url(#paint3_linear_icon)"></path><path d="M16.9731 3.78947C16.9731 5.88234 15.2718 7.57895 13.1731 7.57895C11.0744 7.57895 9.37312 5.88234 9.37312 3.78947C9.37312 1.69661 11.0744 0 13.1731 0C15.2718 0 16.9731 1.69661 16.9731 3.78947Z" fill="url(#paint4_linear_icon)"></path><defs><linearGradient id="paint0_linear_icon" x1="1.9" y1="24" x2="26.4917" y2="-24.0554" gradientUnits="userSpaceOnUse"><stop stop-color="#239092"></stop><stop offset="0.624978" stop-color="#97C8C9"></stop></linearGradient><linearGradient id="paint1_linear_icon" x1="1.9" y1="24" x2="26.4917" y2="-24.0554" gradientUnits="userSpaceOnUse"><stop stop-color="#239092"></stop><stop offset="0.624978" stop-color="#97C8C9"></stop></linearGradient><linearGradient id="paint2_linear_icon" x1="1.9" y1="24" x2="26.4917" y2="-24.0554" gradientUnits="userSpaceOnUse"><stop stop-color="#239092"></stop><stop offset="0.624978" stop-color="#97C8C9"></stop></linearGradient><linearGradient id="paint3_linear_icon" x1="1.9" y1="24" x2="26.4917" y2="-24.0554" gradientUnits="userSpaceOnUse"><stop stop-color="#239092"></stop><stop offset="0.624978" stop-color="#97C8C9"></stop></linearGradient><linearGradient id="paint4_linear_icon" x1="1.9" y1="24" x2="26.4917" y2="-24.0554" gradientUnits="userSpaceOnUse"><stop stop-color="#239092"></stop><stop offset="0.624978" stop-color="#97C8C9"></stop></linearGradient></defs></svg>`
              }
            },
            {
              tag: "span",
              styles: {
                lineHeight: "2em",
              },
              properties: {
                innerText: "Build Graph"
              }
            }
          ],
          listeners: [
            {
              type: "click",
              listener: async () => {
                if (this.itemIDs.length == 0) {
                  new ztoolkit.ProgressWindow("Connected Papers")
                    .createLine({ text: "Please select a Zotero Item and click Add Origin first, then click Build Graph.", type: "connectedpapers"})
                    .show()
                  return
                }
                // 构建图谱
                const items = this.itemIDs.map((id: number) => Zotero.Items.get(id)) as Zotero.Item[]
                relatedContainer.querySelectorAll(".normal-items .item")?.forEach(e => e.remove())
                relatedContainer.querySelectorAll(".prior-items .item")?.forEach(e => e.remove())
                relatedContainer.querySelectorAll(".deriv-items .item")?.forEach(e => e.remove())
                const graphdata = await this.refresh(items)
                ztoolkit.log("graphdata", graphdata)
                // @ts-ignore
                const app = this.frame.contentWindow.app
                // app.graphdata = graphdata
                // items
                Object.values(graphdata.nodes).sort((a: any, b: any) => b.year - a.year).forEach((paper: any) => {
                  this.addItem(
                    relatedContainer.querySelector(".normal-items") as HTMLDivElement,
                    this.paper2Info(paper),
                    app.paper_to_color(paper),
                  )
                })
                // prior
                graphdata.common_references.sort((a: any, b: any) => b.year - a.year).forEach((paper: any) => {
                  const itemNode = this.addItem(
                    relatedContainer.querySelector(".prior-items") as HTMLDivElement,
                    this.paper2Info(paper),
                    app.paper_to_color(paper)
                  )
                  itemNode.setAttribute("local", paper.local_citations.join("+"))
                })
                // deriv
                graphdata.common_citations.sort((a: any, b: any) => b.year - a.year).forEach((paper: any) => {
                  const itemNode = this.addItem(
                    relatedContainer.querySelector(".deriv-items") as HTMLDivElement,
                    this.paper2Info(paper),
                    app.paper_to_color(paper)
                  )
                  itemNode.setAttribute("local", paper.local_references.join("+"))
                })
                
              }
            }
          ]
        },
        // node container
        {
          tag: "div",
          styles: {
            flexGrow: "1",
            overflowY: "auto",
            display: "flex",
            flexDirection: "row",
          },
          classList: ["items-container"],
          children: [
            {
              tag: "div",
              classList: ["prior-items"],
              styles: {
                display: "none",
                overflowY: "auto",
              }
            },
            {
              tag: "div",
              classList: ["normal-items"],
              styles: {
                overflowY: "auto"
              }
            },
            {
              tag: "div",
              classList: ["deriv-items"],
              styles: {
                display: "none",
                overflowY: "auto",
              }
            }
          ]
        },
        {
          tag: "div",
          styles: {
            display: "flex"
          },
          children: [
            {
              tag: "div",
              id: "prior-works",
              classList: ["filter-button"],
              properties: {
                innerText: "Prior Works"
              },
              listeners: [
                {
                  type: "click",
                  listener: () => {
                    const w1 = this.relatedContainer?.querySelector("#prior-works")!
                    const w2 = this.relatedContainer?.querySelector("#deriv-works")!
                    const i1 = this.relatedContainer!.querySelector(".prior-items") as HTMLDivElement
                    const i2 = this.relatedContainer!.querySelector(".deriv-items") as HTMLDivElement
                    const i0 = this.relatedContainer!.querySelector(".normal-items") as HTMLDivElement
                    w2.classList.remove("activate")
                    i2.style.display = "none"
                    i0.style.borderLeft = i0.style.borderRight = i1.style.borderLeft = i1.style.borderRight = "none"
                    if (w1?.classList.contains("activate")) {
                      w1.classList.remove("activate")
                      i1.style.display = "none"
                      i1.style.borderLeft = "none"
                      i0.style.borderRight = "none"
                      i0.style.width = "100%"
                    } else {
                      w1.classList.add("activate")
                      i1.style.display = ""
                      i0.style.width = i1.style.width = "50%"
                      i0.style.borderLeft = ".5px solid #cecece"
                      i1.style.borderRight = ".5px solid #cecece"
                    }
                  }
                }
              ]
            },
            {
              tag: "div",
              id: "deriv-works",
              classList: ["filter-button"],
              attributes: {
                activate: "false"
              },
              properties: {
                innerText: "Derivative Works"
              },
              listeners: [
                {
                  type: "click",
                  listener: () => {
                    const w2 = this.relatedContainer?.querySelector("#prior-works")!
                    const w1 = this.relatedContainer?.querySelector("#deriv-works")!
                    const i2 = this.relatedContainer!.querySelector(".prior-items") as HTMLDivElement
                    const i1 = this.relatedContainer!.querySelector(".deriv-items") as HTMLDivElement
                    const i0 = this.relatedContainer!.querySelector(".normal-items") as HTMLDivElement
                    w2.classList.remove("activate")
                    i2.style.display = "none"
                    i0.style.borderLeft = i0.style.borderRight = i1.style.borderLeft = i1.style.borderRight = "none"
                    if (w1?.classList.contains("activate")) {
                      w1.classList.remove("activate")
                      i1.style.display = "none"
                      i0.style.width = "100%"
                    } else {
                      w1.classList.add("activate")
                      i1.style.display = ""
                      i0.style.width = i1.style.width = "50%"
                      i0.style.borderRight = ".5px solid #cecece"
                      i1.style.borderLeft = ".5px solid #cecece"
                    }
                  }
                }
              ]
            }
          ]
        }
      ]
    }, box) as HTMLDivElement
    this.relatedContainer = relatedContainer

  }

  /**
   * 图谱节点和列表节点同时触发状态
   * @param arg 
   */
  private setNodeState(arg: {
    state: "selected" | "hover",
    paperID: string,
  }) {
    if (arg.state == "selected") {
      let selectedItemNode: HTMLDivElement
      Array.prototype.forEach.call(
        this.relatedContainer?.querySelectorAll(".items-container .item"),
        (itemNode) => {
          if (itemNode._ref.identifiers.paperID == arg.paperID) {
            itemNode.classList.add("selected")
            selectedItemNode = itemNode
            
          } else {
            itemNode.classList.remove("selected")
          }
        },
      );
      let src = "Nodes"
      this.zoteroColor = true
      const parent = selectedItemNode!.parentElement!
      if (parent.classList.contains("prior-items")) {
        src = "Prior"
        this.zoteroColor = false
      } else if (parent.classList.contains("deriv-items")) {
        this.zoteroColor = false
        src = "Deriv"
      }
      // @ts-ignore
      this.frame.contentWindow.GLOBAL_SELECTED_PAPER.value = {
        paper_id: arg.paperID,
        src: src
      };
      // 选择普通item，设置prior/deriv works背景色
      [
        ...this.relatedContainer?.querySelectorAll(".prior-items .item") as any, 
        ...this.relatedContainer?.querySelectorAll(".deriv-items .item") as any
      ].forEach(itemNode => {
        if (itemNode.getAttribute("local").indexOf(arg.paperID) >= 0) {
          itemNode.classList.add("highlight")
        } else {
          itemNode.classList.remove("highlight")
        }
      })
      // 选择prior/deriv works，普通item背景色
      Array.prototype.forEach.call(
        this.relatedContainer?.querySelectorAll(".normal-items .item"),
        (itemNode) => {
          const local = selectedItemNode.getAttribute("local")
          if (local && local.indexOf(itemNode._ref.identifiers.paperID) >= 0) {
            itemNode.classList.add("highlight")
          } else {
            itemNode.classList.remove("highlight")
          }
        },
      );

    } else if (arg.state == "hover") {
      // @ts-ignore
      this.frame.contentWindow.GLOBAL_HOVER_PAPER.value = {
        paper_id: arg.paperID,
        src: "Nodes"
      }
      Array.prototype.forEach.call(
        this.relatedContainer?.querySelectorAll(".item"),
        (itemNode) => {
          // 跳过选择
          // @ts-ignore
          if (this.frame.contentWindow.GLOBAL_SELECTED_PAPER.value?.paper_id == itemNode._ref.identifiers.paperID) {
            return
          }
          if (itemNode._ref.identifiers.paperID == arg.paperID) {
            itemNode.classList.add("hover")
          } else {
            itemNode.classList.remove("hover")

          }
        }
      )
    }
  }

  public addItem(parent: HTMLDivElement, info: ItemInfo, color?: string) {
    let tipUI: TipUI, timer: number | undefined
    const itemNode = ztoolkit.UI.appendElement({
      tag: "div",
      classList: ["item"],
      attributes: {
        "zotero-item-id": info?._itemID
      },
      properties: {
        _ref: info
      },
      styles: {
        display: "flex",
        flexDirection: "row",
        height: "2em",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 .25em",
      },
      children: [
        {
          tag: "div",
          styles: {
            width: "2em",
            height: "2em",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
          children: [
            color
              ?
              {
                tag: "div",
                classList: ["color-circle"],
                styles: {
                  width: "1.2em",
                  height: "1.2em",
                  borderRadius: "50%",
                  backgroundColor: color
                },
                listeners: [
                  {
                    type: "mouseenter",
                    listener: () => {
                      this.setNodeState({ state: "hover", paperID: info.identifiers.paperID as string })
                    }
                  },
                  {
                    type: "mouseleave",
                    listener: () => {
                      this.setNodeState({ state: "hover", paperID: "" })
                    }
                  },
                  {
                    type: "click",
                    listener: () => {
                      this.setNodeState({ state: "selected", paperID: info.identifiers.paperID as string });
                      new ztoolkit.Clipboard().addText(info.identifiers!.DOI!, "text/unicode").copy()
                    }
                  }
                ]
              }
              :
              {
                tag: "div",
                styles: {
                  width: "2em",
                  height: "2em",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center"
                },
                classList: ["icon"],
                properties: {
                  innerHTML: `<svg width="24" height="24" viewBox="0 0 24 24" fill="#7a306c" xmlns="http://www.w3.org/2000/svg" class="graph-action-icon mr-[6px]" data-v-f4c185ee=""><path d="M19 13H5V11H19V13Z"></path></svg>`
                },
                listeners: [
                  {
                    type: "click",
                    listener: () => {
                      this.itemIDs = this.itemIDs.filter(i => i != info._itemID);
                      itemNode.remove();
                      this.updateAddOrRemove()
                    }
                  }
                ]
              },
          ]
        },
        {
          tag: "div",
          classList: ["title-box"],
          styles: {
            width: "100%",
            height: "2em",
            flex: "1",
            boxSizing: "border-box",
          },
          children: [
            {
              tag: "div",
              namespace: "xul",
              classList: ["title"],
              styles: {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: "2em"
              },
              properties: {
                textContent: info.title
              }
            }
          ],
          listeners: [
            {
              type: "mouseenter",
              listener: () => {
                // 图谱hover效果
                this.setNodeState({ state: "hover", paperID: info.identifiers.paperID as string })
              }
            },
            // 浮窗
            {
              type: "mouseup",
              listener: (event: any) => {
                if (event.button != 2 ){return }
                // 浮窗
                itemNode.classList.add("active")
                let timeout = parseInt(Zotero.Prefs.get(`${config.addonRef}.showTipAfterMillisecond`) as string)
                const position = Zotero.Prefs.get("extensions.zotero.layout", true) == "stacked" ? "top center" : "left"
                timer = window.setTimeout(async () => {
                  const rect = itemNode.getBoundingClientRect() as any
                  tipUI = this.views.showTipUI(rect, info, position, info.identifiers.DOI)
                  if (!itemNode.classList.contains("active")) {
                    tipUI.container.style.display = "none"
                  }
                }, timeout);

              }
            },
            {
              type: "mouseleave",
              listener: () => {
                itemNode.classList.remove("active")
                window.clearTimeout(timer);
                if (!tipUI) { return }
                const timeout = tipUI.removeTipAfterMillisecond
                tipUI.tipTimer = window.setTimeout(async () => {
                  for (let i = 0; i < timeout / 2; i++) {
                    if (this.relatedContainer!.querySelector(".active")) { return }
                    await Zotero.Promise.delay(1 / 1000)
                  }
                  tipUI && tipUI.clear()
                }, timeout / 2)
              }
            },
            // 从列表定位到节点
            {
              type: "click",
              listener: () => {
                // 清除浮窗，定位
                tipUI && tipUI.clear()
                this.setNodeState({ state: "selected", paperID: info.identifiers.paperID as string })
                new ztoolkit.Clipboard().addText(info.identifiers!.DOI!, "text/unicode").copy()
              }
            }
          ]
        },
        
      ],
    }, parent)

    ztoolkit.UI.appendElement({
      tag: "div",
      styles: {
        width: "2em",
        height: "2em",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "pointer"
      },
      properties: {
        innerHTML: info?._itemID ?
          `<svg viewBox="0 0 743 743" width="1.2em" height="1.2em"  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" overflow="hidden"><defs><clipPath id="clip0"><rect x="769" y="697" width="743" height="743"/></clipPath></defs><g transform="translate(-769 -697)"><path d="M769 1068.5C769 863.326 935.326 697 1140.5 697 1345.67 697 1512 863.326 1512 1068.5 1512 1273.67 1345.67 1440 1140.5 1440 935.326 1440 769 1273.67 769 1068.5Z" fill="#ca6363" fill-rule="evenodd"/><path d="M1162.25 901C1173.47 901 1181.89 904.166 1190.66 912.612L1316.22 1032.96C1327.09 1042.81 1332 1054.07 1332 1068.5 1332 1082.58 1326.74 1094.19 1316.22 1104.04L1190.66 1224.39C1181.89 1232.48 1173.47 1236 1162.25 1236 1141.2 1236 1126.12 1220.52 1126.12 1198.35 1126.12 1187.79 1130.68 1177.24 1138.75 1170.55L1178.73 1133.95 1215.56 1107.56 1143.66 1112.13 989.685 1112.13C965.838 1112.13 949 1093.13 949 1068.5 949 1043.52 965.838 1024.87 989.685 1024.87L1143.66 1024.87 1215.21 1029.09 1179.78 1003.05 1138.75 966.451C1130.68 959.766 1126.12 949.209 1126.12 938.3 1126.12 916.483 1141.2 901 1162.25 901Z" fill="#FFFFFF" fill-rule="evenodd"/></g></svg>`
          :
          `<svg viewBox="0 0 743 743" width="1.2em" height="1.2em" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" overflow="hidden"><defs><clipPath id="clip0"><rect x="944" y="711" width="743" height="743"/></clipPath></defs><g transform="translate(-944 -711)"><path d="M944 1082.5C944 877.326 1110.33 711 1315.5 711 1520.67 711 1687 877.326 1687 1082.5 1687 1287.67 1520.67 1454 1315.5 1454 1110.33 1454 944 1287.67 944 1082.5Z" fill="#9cb8b8" fill-rule="evenodd"/><path d="M1159.5 1083.5 1472.1 1083.5" stroke="#FFFFFF" stroke-width="87.0833" stroke-linecap="round" stroke-miterlimit="8" fill="none" fill-rule="evenodd"/><path d="M1316.5 927.5 1316.5 1240.1" stroke="#FFFFFF" stroke-width="87.0833" stroke-linecap="round" stroke-miterlimit="8" fill="none" fill-rule="evenodd"/></g></svg>`
      },
      listeners: [
        {
          type: "click",
          listener: async (event: any) => {
            if (info._itemID) {
              ZoteroPane.selectItem(info._itemID as number)
            } else {
              const DOI = info.identifiers.DOI
              const originItems = this.itemIDs.map(id => Zotero.Items.get(id))
              
              let add = async (collections: number[]) => {
                let popupWin = new ztoolkit.ProgressWindow("[Pending] Adding", { closeTime: -1 })
                  .createLine({ text: DOI, type: "default" })
                  .show()
                const newItem = await this.views.utils.createItemByZotero({ DOI }, collections) as Zotero.Item
                originItems.forEach(async (item) => {
                  newItem.addRelatedItem(item)
                  item.addRelatedItem(newItem)
                  await item.saveTx({ skipSelect: true, skipNotifier: true })
                  await newItem.saveTx({ skipSelect: true, skipNotifier: true });
                  // ZoteroPane.selectItem(item.id);
                  // (document.querySelector("#zotero-editpane-related-tab") as HTMLDivElement).click()
                })
                popupWin.changeHeadline("[Done] Adding")
                popupWin.changeLine({ type: "success" })
                popupWin.startCloseTimer(3000);
                (document.querySelector("#build-graph") as HTMLDivElement).click()
              }
              // 获取分类
              const collection = ZoteroPane.getSelectedCollection()
              let collections: number[] = []
              if (collection) {
                collections = [collection.id]
              }
              if (event.ctrlKey || event.metaKey) {
                let rect = itemNode.getBoundingClientRect()
                // 构建分类选择
                let menuPopup = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", 'menupopup') as XUL.MenuPopup;
                document.querySelector("#browser")!.append(menuPopup);
                let collections = Zotero.Collections.getByLibrary(1);
                for (let col of collections) {
                  let menuItem = Zotero.Utilities.Internal.createMenuForTarget(
                    col,
                    menuPopup,
                    null as any,
                    async (event: any, collection: any) => {
                      if (event.target.tagName == 'menuitem') {
                        ztoolkit.log(collection)
                        menuPopup.remove()
                        add([collection.id])
                        event.stopPropagation();
                      }
                    }
                  );
                  menuPopup.append(menuItem);
                }
                // @ts-ignore
                menuPopup.openPopupAtScreen(rect.left, rect.top + rect.height, true);
              } else {
                add(collections)
              }

            }
          }
        }
      ]
    }, itemNode)
    return itemNode
  }


  private async getPaperID(item: Zotero.Item) {
    const DOI = item.getField("DOI") as string
    const title = item.getField("title") as string
    if (DOI) {
      // 根据DOI精确确定id
      let res = await this.requests.get(
        `https://rest.connectedpapers.com/id_translator/doi/${DOI}`
      )
      return res.paperId
    } else {
      // 通过标题粗确定标题
      // const api = 'https://rest.connectedpapers.com/autocomplete/${title}`
      const api = `https://rest.connectedpapers.com/search/${escape(title)}/1`
      let response = await this.requests.post(api)
      if (response) {
        if (response?.results?.length) {
          let item = response.results[0]
          return item.id
        }
      }
    }
  }

  private async buildGraphData(items: Zotero.Item[]) {
    const popupWin = new ztoolkit.ProgressWindow("Connected Papers", { closeOtherProgressWindows: true, closeTime: -1 })
      .createLine({ text: "Initializing", type: "connectedpapers" })
      .show()
    let id = (await Promise.all(items.map(async (item) => await this.getPaperID(item)))).join("+")
    const graphData = await buildGraphData(id, popupWin)
    if (!graphData) { return }
    const totalNum = Object.keys(graphData.nodes).length
    popupWin.changeLine({ text: `[1/${totalNum}] Indexing`, progress: 1, type: "default" })
    let search: any = {}
    for (let paperID in graphData.nodes) {
      search[paperID] = this.views.utils.searchItem(this.paper2Info(graphData.nodes[paperID]))
    }
    let i = 0
    for (let paperID in graphData.nodes) {
      i += 1
      let localItem
      try {
        localItem = await search[paperID]
      } catch { }
      popupWin.changeLine({ text: `[${i}/${totalNum}] Indexing`, progress: 100 * i / totalNum })
      graphData.nodes[paperID]._itemID = localItem?.id
    }
    ztoolkit.log(graphData)
    popupWin.changeLine({ text: `[${totalNum}/${totalNum}] Indexing`, type: "success" })
    popupWin.startCloseTimer(3000)
    return graphData
  }

  private initItemsPane() {
    const mainNode = document.querySelector("#item-tree-main-default")!
    // 图形容器
    const minHeight = 200
    const graphContainer = ztoolkit.UI.createElement(document, "div", {
      id: "graph-view",
      styles: {
        width: "100%",
        minHeight: `${minHeight}px`,
        height: Zotero.Prefs.get(`${config.addonRef}.graphView.height`) as string,
        display: "none",
      }
    })
    this.graphContainer = graphContainer
    const frame = this.frame = ztoolkit.UI.createElement(document, "iframe", {namespace: "html"}) as HTMLIFrameElement
    frame.setAttribute("src", `chrome://${config.addonRef}/content/dist/index.html`)
    frame.style.border = "none"
    frame.style.outline = "none"
    frame.style.width = "100%"
    frame.style.height = graphContainer.style.height;
    frame.style.overflow = "hidden"
    frame.style.backgroundColor = "#ffffff"
    graphContainer.append(frame)
    mainNode.append(graphContainer)
    const resizer = ztoolkit.UI.createElement(document, "div", {
      styles: {
        height: `1px`,
        width: "100%",
        backgroundColor: "#cecece",
        cursor: "ns-resize",
      },
    })
    graphContainer.insertBefore(resizer, frame)
    let y = 0, x = 0;
    let h = 0, w = 0;
    const mouseDownHandler = function (e: MouseEvent) {
      frame.style.display = "none"
      y = e.clientY;
      x = e.clientX;
      const rect = graphContainer.getBoundingClientRect()
      h = rect.height;
      w = rect.width;
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    };
    const mouseMoveHandler = (e: MouseEvent) => {
      const dy = e.clientY - y;
      let hh = h - dy
      const height = `${hh <= minHeight ? minHeight : hh}px`
      graphContainer.style.height = height;
      frame.style.height = height;
      this.boxAfter.style.height = height;
      Zotero.Prefs.set(`${config.addonRef}.graphView.height`, height)
    };
    const mouseUpHandler = () => {
      frame.style.display = ""
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
    resizer.addEventListener('mousedown', mouseDownHandler);
  }

  private paper2Info(paper: any) {
    return {
      identifiers: { DOI: paper.doi, paperID: paper.paperId },
      title: paper.title,
      year: paper.year,
      authors: paper.authors?.map((i: any) => i.name) || [],
      abstract: paper.abstract,
      primaryVenue: paper.venue,
      source: "connected papers",
      tags: paper.fieldsOfStudy,
      type: "",
      _itemID: paper._itemID
    }
  }

  private async refresh(items: Zotero.Item[]) {
    ztoolkit.log("refresh", items)
    const graphData = await this.buildGraphData(items) as  Graph
    ztoolkit.log(graphData)
    const app = (this.frame.contentWindow! as any).app as any
    app.graphdata = graphData;
    app.$route.params.origin_id = graphData.start_id || graphData.start_ids.join("+");
    app._paper_to_color = app._paper_to_color || app.paper_to_color
    app.paper_to_color = (paper: any) => {
      let res_color = app._paper_to_color(paper)
      if (this.zoteroColor && paper._itemID) {
        const c = "#c22727"
        let res_hsl = d3.hsl(res_color);
        res_hsl.h = d3.hsl(c).h;
        res_hsl.s = (res_hsl.s + 2 * d3.hsl(c).s) / 3;
        return res_hsl + "";
      }
      return res_color
    }
    app.refresh_graph()
    // scrollToSelected
    let scrollToNode = (className: "selected" | "hover") => {
      const parent = document.querySelector(".normal-items") as HTMLDivElement
      const target = parent.querySelector(`.${className}`) as HTMLDivElement
      const firstChild = parent.firstChild as HTMLDivElement
      parent.scrollTo(0, target!.offsetTop - firstChild.offsetTop)
    }
    // 下面绑定是覆盖
    app.graphdata.sim_node_circles
      // 从图谱节点反向定位到列表
      .on("click", (event: any, it: any) => {
        const paperID = it.paperId
        this.setNodeState({ state: "selected", paperID })
        scrollToNode("selected")
      })
      .on("mouseover", (event: any, it: any) => {
        const paperID = it.paperId
        this.setNodeState({ state: "hover", paperID })
        scrollToNode("hover")
      })
      .on("mouseout", (event: any, it: any) => {
        this.setNodeState({ state: "hover", paperID: "" })
      })
    return graphData
  }
}