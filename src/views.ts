import Addon from "./addon";
import Locale from "./locale";
import AddonModule from "./module";
import { log } from "../../zotero-plugin-toolkit/dist/utils";
import {ItemBaseInfo, ItemInfo} from "./types"
import TipUI from "./tip";
import AddonItem from "./item";
const lang = Services.locale.getRequestedLocale().split("-")[0];
Zotero._AddonItemGlobal = Zotero._AddonItemGlobal || new AddonItem()
const addonItem: AddonItem = Zotero._AddonItemGlobal

class AddonViews extends AddonModule {
  private progressWindowIcon: object;
  private progressWindow: any;
  public tabpanel: XUL.Element;
  public reader: _ZoteroReaderInstance;
  public tipTimer: number | null;
  public iconStyles: object;
  constructor(parent: Addon) {
    console.log("AddonViews constructor")
    super(parent);
    this.progressWindowIcon = {
      success: "chrome://zotero/skin/tick.png",
      fail: "chrome://zotero/skin/cross.png",
      default: `chrome://${this.Addon.addonRef}/skin/favicon.png`,
    };
    this.iconStyles = {
      bacogroundColor: "none",
      backgroundSize: "16px 16px",
      backgroundRepeat: "no-repeat",
      backgroundPositionX: "center",
      backgroundPositionY: "center",
      backgroundClip: "border-box",
      backgroundOrigin: "padding-box",
      width: "16px",
      "margin-inline-start": "0px",
      "margin-inline-end": "0px",
      marginTop: "0px",
      marginBottom: "0px",
    }
  } 

  public initViews() {
    let reader = this.Addon.utils.getReader()
    if (!reader) { return }
    this.buildTabPanel(this.getTabContainer())
  }

  public async updateReferenceUI(reader: _ZoteroReaderInstance) {
    if (!addonItem.item) { await addonItem.init() }
    log("updateReferenceUI is called")
    await Zotero.uiReadyPromise;
    // addon is disabled
    if (!Zotero.ZoteroReference) {
      return this.removeUI()
    }
    
    if (!reader) { return false }
    this.reader = reader

    const item = this.Addon.utils.getItem()
    log("reading -> ", item.getField("title"));
    await reader._waitForReader();
    let tabContainer = this.getTabContainer()
    if (!(tabContainer && tabContainer.querySelector("#zotero-reference-tab"))) {
      // build
      const tabpanel = await this.buildTabPanel(tabContainer);
      // then
      if (this.Addon.prefs.get("autoRefresh") === true) {
        this.autoRefresh(tabpanel)
      }
    }
    if (this.Addon.prefs.get("modifyLinks")) {
      this.modifyLinks(reader)
    }
    if (this.Addon.prefs.get("loadingRelated")) {
      await this.loadingRelated(tabContainer);
    }
  }

  // using tookit
  // public initViews() {
  //   this.Addon.toolkit.Tool.log("Initializing UI");
  //   const readerTabId = "zotero-reference"
  //   this.Addon.toolkit.UI.registerReaderTabPanel(
  //     Locale[lang].tabLabel,
  //     async (panel: any, deck: XUL.Deck, window: Window, reader: _ZoteroReaderInstance) => {
  //       if (!panel) {
  //         this.Addon.toolkit.Tool.log(
  //           "This reader do not have right-side bar. Adding reader tab skipped."
  //         );
  //         return;
  //       }
  //       const relatedbox = this.Addon.toolkit.UI.creatElementsFromJSON(
  //         window.document,
  //         {
  //           tag: "relatedbox",
  //           id: `${this.Addon.addonRef}-${reader._instanceID}-extra-reader-tab-div`,
  //           classList: ["zotero-editpane-related"],
  //           namespace: "xul",
  //           removeIfExists: true,
  //           ignoreIfExists: true,
  //           attributes: {
  //             flex: "1",
  //           },
  //           subElementOptions: [
  //             {
  //               tag: "vbox",
  //               namespace: "xul",
  //               classList: ["zotero-box"],
  //               attributes: {
  //                 flex: "1",
  //               },
  //               styles: {
  //                 paddingLeft: "0px",
  //                 paddingRight: "0px"
  //               },
  //               subElementOptions: [
  //                 {
  //                   tag: "hbox",
  //                   namespace: "xul",
  //                   attributes: {
  //                     align: "center"
  //                   },
  //                   subElementOptions: [
  //                     {
  //                       tag: "label",
  //                       namespace: "xul",
  //                       id: "referenceNum",
  //                       attributes: {
  //                         value: `0 ${Locale[lang].referenceNumLabel}`
  //                       },
  //                       listeners: [
  //                         {
  //                           type: "dblclick",
  //                           listener: () => {
  //                             console.log("Copy all references")
  //                             let textArray = []
  //                             let labels = relatedbox.querySelectorAll("rows row box label")
  //                             labels.forEach((e: XUL.Label) => {
  //                               textArray.push(e.value)
  //                             })
  //                             this.showProgressWindow("Reference", "Copy all references", "success")
  //                             this.Addon.toolkit.Tool.createCopyHelper()
  //                               .addText(textArray.join("\n"), "text/unicode")
  //                               .copy();
  //                           }
  //                         }
  //                       ]
  //                     },
  //                     {
  //                       tag: "button",
  //                       namespace: "xul",
  //                       id: "refreshButton",
  //                       attributes: {
  //                         label: Locale[lang].refreshButtonLabel
  //                       },
  //                       listeners: [
  //                         {
  //                           type: "click",
  //                           listener: async () => {
  //                             await this.refreshReferences(panel)
  //                           }
  //                         }
  //                       ]
  //                     }
  //                   ]
  //                 },
  //                 {
  //                   tag: "grid",
  //                   namespace: "xul",
  //                   attributes: {
  //                     flex: "1"
  //                   },
  //                   subElementOptions: [
  //                     {
  //                       tag: "columns",
  //                       namespace: "xul",
  //                       subElementOptions: [
  //                         {
  //                           tag: "column",
  //                           namespace: "xul",
  //                           attributes: {
  //                             flex: "1"
  //                           }
  //                         },
  //                         {
  //                           tag: "column",
  //                           namespace: "xul",
  //                         },
  //                       ]
  //                     },
  //                     {
  //                       tag: "rows",
  //                       namespace: "xul",
  //                       id: "referenceRows"
  //                     }
  //                   ]
  //                 }
  //               ]
  //             }
  //           ]
  //         }
  //       );
  //       panel.append(relatedbox);
  //       // after build UI
  //       if (Zotero.Prefs.get(`${this.Addon.addonRef}.autoRefresh`) === true) {
  //         let _notAutoRefreshItemTypes = Zotero.Prefs.get(`${this.Addon.addonRef}.notAutoRefreshItemTypes`) as string
  //         let notAutoRefreshItemTypes = _notAutoRefreshItemTypes.split(/,\s*/g)
  //         console.log(_notAutoRefreshItemTypes, notAutoRefreshItemTypes)
  //         const isExclude = notAutoRefreshItemTypes
  //           .indexOf(
  //             Zotero.ItemTypes.getName(
  //               this.Addon.utils.getItem().getField("itemTypeID")
  //             )
  //           ) != -1
  //         if (!isExclude) {
  //           this.refreshReferences(panel)
  //         }
  //       }
  //     },
  //     {
  //       targetIndex: 3,
  //       tabId: readerTabId,
  //     }
  //   )
  // }

  // public async updateReferencePanel(reader: _ZoteroReaderInstance) {
  //   console.log("updateReferencePanel")
  //   await Zotero.uiReadyPromise;
  //   if (!Zotero.ZoteroReference) {
  //     return this.removeTabPanel()
  //   }
  //   if (!reader) { return false }
  //   this.reader = reader
  //   if (Zotero.Prefs.get(`${this.Addon.addonRef}.openRelatedRecommaend`)) {
  //     await this.loadingRelated();
  //   }
  //   if (Zotero.Prefs.get(`${this.Addon.addonRef}.modifyLinks`)) {
  //     this.modifyLinks(reader)
  //   }
  // }

  public autoRefresh(tabpanel) {
    let _notAutoRefreshItemTypes = this.Addon.prefs.get("notAutoRefreshItemTypes") as string
    let notAutoRefreshItemTypes = _notAutoRefreshItemTypes.split(/,\s*/g)
    log("notAutoRefreshItemTypes", notAutoRefreshItemTypes)
    const isNot = notAutoRefreshItemTypes
      .indexOf(
        this.Addon.utils.getItemType(this.Addon.utils.getItem())
      ) != -1
    if (!isNot) {
      this.refreshReferences(tabpanel)
    }
  }

  public modifyLinks(reader) {
    let id = window.setInterval(() => {
      try {
        String(reader._iframeWindow.wrappedJSObject.document)
      } catch {
        return window.clearInterval(id)
      }
      reader._iframeWindow.wrappedJSObject.document
        .querySelectorAll(".annotationLayer a[href^='#']:not([modify])").forEach(a => {
          let _a = a.cloneNode(true)
          _a.setAttribute("modify", "")
          a.parentNode.appendChild(_a)
          a.remove()
          _a.addEventListener("click", async (event) => {
            event.preventDefault()
            let href = _a.getAttribute("href")
            if (reader._iframeWindow.wrappedJSObject.secondViewIframeWindow == null) {
              await reader.menuCmd("splitHorizontally")
              while (
                !(
                  reader._iframeWindow.wrappedJSObject?.secondViewIframeWindow?.PDFViewerApplication?.pdfDocument
                )
              ) {
                await Zotero.Promise.delay(100)
              }
              await Zotero.Promise.delay(1000)
            }
            reader._iframeWindow.wrappedJSObject.secondViewIframeWindow.PDFViewerApplication
              .pdfViewer.linkService.goToDestination(unescape(href.slice(1)))
          })
        })
    }, 100)
  }

  public removeUI() {
    try {
      const tabContainer = document.querySelector(`#${Zotero_Tabs.selectedID}-context`);
      tabContainer.querySelector("#zotero-reference-tab").remove()
      tabContainer.querySelector("#zotero-reference-tabpanel").remove()
    } catch (e) { }
  }

  private getTabContainer() {
    let tabId = Zotero_Tabs.selectedID
    return document.querySelector(`#${tabId}-context`)
  }

  private buildTabPanel(tabContainer) {
    this.Addon.toolkit.Tool.log("buildTabPanel");
    let tabbox = tabContainer.querySelector("tabbox")
    const tabs = tabbox.querySelector("tabs") as HTMLElement;
    const tabpanels = tabbox.querySelector("tabpanels") as HTMLElement;
    // for tab
    const tab = this.Addon.toolkit.UI.creatElementsFromJSON(
      window.document,
      { 
        tag: "tab",
        namespace: "xul",
        id: "zotero-reference-tab",
        attributes: {
          label: Locale[lang].tabLabel
        }
      },
      
    )
    // for tabpanel
    const tabpanel = this.Addon.toolkit.UI.creatElementsFromJSON(
      window.document,
      {
        tag: "tabpanel",
        namespace: "xul",
        id: "zotero-reference-tabpanel",
        subElementOptions: [
          {
            tag: "relatedbox",
            classList: ["zotero-editpane-related"],
            namespace: "xul",
            removeIfExists: true,
            ignoreIfExists: true,
            attributes: {
              flex: "1",
            },
            subElementOptions: [
              {
                tag: "vbox",
                namespace: "xul",
                classList: ["zotero-box"],
                attributes: {
                  flex: "1",
                },
                styles: {
                  paddingLeft: "0px",
                  paddingRight: "0px"
                },
                subElementOptions: [
                  {
                    tag: "hbox",
                    namespace: "xul",
                    attributes: {
                      align: "center"
                    },
                    subElementOptions: [
                      {
                        tag: "label",
                        namespace: "xul",
                        id: "referenceNum",
                        attributes: {
                          value: `0 ${Locale[lang].referenceNumLabel}`
                        },
                        listeners: [
                          {
                            type: "dblclick",
                            listener: () => {
                              console.log("Copy all references")
                              let textArray = []
                              let labels = tabpanel.querySelectorAll("rows row box label")
                              labels.forEach((e: XUL.Label) => {
                                textArray.push(e.value)
                              })
                              this.showProgressWindow("Reference", "Copy all references", "success")
                              this.Addon.utils.copyText(textArray.join("\n"), false)
                            }
                          }
                        ]
                      },
                      {
                        tag: "button",
                        namespace: "xul",
                        id: "refreshButton",
                        attributes: {
                          label: Locale[lang].refreshButtonLabel
                        },
                        listeners: [
                          {
                            type: "click",
                            listener: async () => {
                              await this.refreshReferences(tabpanel)
                            }
                          }
                        ]
                      }
                    ]
                  },
                  {
                    tag: "grid",
                    namespace: "xul",
                    attributes: {
                      flex: "1"
                    },
                    subElementOptions: [
                      {
                        tag: "columns",
                        namespace: "xul",
                        subElementOptions: [
                          {
                            tag: "column",
                            namespace: "xul",
                            attributes: {
                              flex: "1"
                            }
                          },
                          {
                            tag: "column",
                            namespace: "xul",
                          },
                        ]
                      },
                      {
                        tag: "rows",
                        namespace: "xul",
                        id: "referenceRows"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    );
    
    // insert
    this.insertAfter(tab, tabs.childNodes[2]);
    this.insertAfter(tabpanel, tabpanels.childNodes[2]);

    return tabpanel
  }

  /**
   * Only item with DOI is supported
   * @returns 
   */
  async loadingRelated(tabContainer) {
    log("loadingRelated");
    let item = this.Addon.utils.getItem()
    if (!item) { return }
    let itemDOI = item.getField("DOI")
    if (!itemDOI || !this.Addon.utils.isDOI(itemDOI)) {
      log("Not DOI", itemDOI);
      return
    }
    let relatedbox = tabContainer.querySelector("tabpanel:nth-child(3) relatedbox")
    do {
      await Zotero.Promise.delay(50);
    }
    while (!relatedbox.querySelector('#relatedRows'));

    let node = relatedbox.querySelector('#relatedRows').parentNode
    // 已经刷新过
    if (node.querySelector(".zotero-clicky-plus")) { return }
    let relatedArray: ItemBaseInfo[] = await this.Addon.utils.API.getDOIRelatedArray(itemDOI)
    let func = relatedbox.refresh
    relatedbox.refresh = () => {
      func.call(relatedbox)
      this.refreshRelated(relatedArray, node)
      node.querySelectorAll("box image.zotero-box-icon")
        .forEach((e: XUL.Element) => {
          let label = this.Addon.toolkit.UI.creatElementsFromJSON(
            document,
            {
              tag: "label",
              namespace: "xul",
              styles: {
                backgroundImage: `url(${e.src})`,
                ...this.iconStyles
              }
            }
          )
          e.parentNode.replaceChild(label, e)
      })
    }
    relatedbox.refresh()
  }

  public refreshRelated(array: ItemBaseInfo[], node: XUL.Element) {
    let totalNum = 0
    log("refreshRelated", array)
    array.forEach((info: ItemBaseInfo, i: number) => {
      let row = this.addRow(node, array, i, false, false, true)
      if (!row) { return }
      row.classList.add("only-title")
      totalNum += 1
      window.setTimeout(async () => {
        let item = await this.Addon.utils.searchLibraryItem(info);
        if (!item) {
          (row.querySelector("box") as XUL.Element).style.opacity = ".5"
        } else {
          (row.querySelector("box") as XUL.Box).onclick = (event) => {
            if (event.button == 0) {
              this.Addon.utils.selectItemInLibrary(item)
            }
          }
        }
      }, 0)
    })
    return totalNum
  }

  public async refreshReferences(tabpanel) {
    let source = tabpanel.getAttribute("source")
    if (source) {
      if (source == "PDF") {
        tabpanel.setAttribute("source", "API")
      }
      if (source == "API") {
        tabpanel.setAttribute("source", "PDF")
      }
    } else {
      tabpanel.setAttribute("source", this.Addon.prefs.get("prioritySource"))
    }

    // clear 
    tabpanel.querySelectorAll("#referenceRows row").forEach(e => e.remove());
    tabpanel.querySelectorAll("#zotero-reference-search").forEach(e => e.remove());

    let references: ItemBaseInfo[]
    let item = this.Addon.utils.getItem()
    let reader = this.Addon.utils.getReader()
    if (tabpanel.getAttribute("source") == "PDF") {
      // 优先本地读取
      const key = "References-PDF"
      references = addonItem.get(item, key)
      if (references) {
        this.showProgressWindow("Reference", "From Local")
      } else {
        references = await this.Addon.utils.PDF.getReferences(reader)
        if (this.Addon.prefs.get("savePDFReferences")) {
          await addonItem.set(item, key, references)
        }
      }
    } else {
      // 不再适配知网，没有DOI直接退出
      let DOI = item.getField("DOI")
      if (!this.Addon.utils.isDOI(DOI)) {
        this.showProgressWindow("Reference", `${DOI} is not DOI`, "fail")
        return
      }
      const key = "References-API"
      // let rawText = this.Addon.toolkit.Tool.getExtraField(item, key)
      references = addonItem.get(item, key)

      if (references) {
        this.showProgressWindow("Reference", "From Local")
      } else {
        this.showProgressWindow("[Pending] Zotero Reference", "request references From API")
        references = (await this.Addon.utils.API.getDOIInfoByCrossref(DOI)).references
        if (this.Addon.prefs.get("saveAPIReferences")) {
          // this.Addon.toolkit.Tool.setExtraField(item, key, JSON.stringify(references))
          await addonItem.set(item, key, references)
        }
      }
    }
    this.showProgressWindow("[Done] Zotero Reference", `${references.length} references`, "success")

    const referenceNum = references.length
    let label = tabpanel.querySelector("label#referenceNum")
    references.forEach(async (reference: ItemBaseInfo, refIndex: number) => {
      let row = this.addRow(tabpanel, references, refIndex);
      window.setTimeout(async () => {
        let localItem = await this.Addon.utils.searchLibraryItem(reference)
        let itemType = this.Addon.utils.getItemType(localItem)
        if (itemType) {
          reference._item = localItem;
          (row.querySelector("#item-type-icon") as XUL.Label).style.backgroundImage = 
            `url(chrome://zotero/skin/treeitem-${itemType}@2x.png)`
        }
      }, 0)
      label.value = `${refIndex + 1}/${referenceNum} ${Locale[lang].referenceNumLabel}`;
    })

    label.value = `${referenceNum} ${Locale[lang].referenceNumLabel}`;
  }

  public addSearch(node) {
    this.Addon.toolkit.Tool.log("addSearch")
    let textbox = document.createElement("textbox");
    textbox.setAttribute("id", "zotero-reference-search");
    textbox.setAttribute("type", "search");
    textbox.setAttribute("placeholder", Locale[lang].searchBoxTip)
    textbox.style.marginBottom = ".5em";
    textbox.addEventListener("input", (event: XUL.XULEvent) => {
      let text = (event.target as any).value
      this.Addon.toolkit.Tool.log(
        `ZoteroReference: source text modified to ${text}`
      );

      let keywords = text.split(/[ ,，]/).filter(e => e)
      if (keywords.length == 0) {
        node.querySelectorAll("row").forEach((row: XUL.Element) => row.style.display = "")
        return
      }
      node.querySelectorAll("row").forEach((row: XUL.Element) => {
        let content = (row.querySelector("label") as any).value
        let isAllMatched = true;
        for (let i = 0; i < keywords.length; i++) {
          isAllMatched = isAllMatched && content.toLowerCase().includes(keywords[i].toLowerCase())
        }
        if (!isAllMatched) {
          row.style.display = "none"
        } else {
          row.style.display = ""
        }
      })

    });
    textbox._clearSearch = () => {
      textbox.value = "";
      node.querySelectorAll("row").forEach((row: XUL.Element) => row.style.display = "")
    }
    node.querySelector("vbox").insertBefore(
      textbox,
      node.querySelector("vbox grid")
    )
  }

  public addRow(node: XUL.Element, references: ItemBaseInfo[], refIndex: number, addPrefix: boolean = true, addSearch: boolean = true, ignoreRelated: boolean = false) {
    let reference = references[refIndex]
    let refText
    if (addPrefix) {
      refText = `[${refIndex + 1}] ${reference.text}`
    } else {
      refText = reference.text
    }
    // 避免重复添加
    if ([...node.querySelectorAll("row label")]
      .filter((e: XUL.Label) => e.value == refText)
      .length > 0) { return }
    // id描述
    let idText = (
      reference.identifiers
      && Object.values(reference.identifiers).length > 0
      && Object.keys(reference.identifiers)[0] + ": " + Object.values(reference.identifiers)[0]
    ) || "Reference"
    // 当前item
    let item = this.Addon.utils.getItem()
    let alreadyRelated = this.Addon.utils.searchRelatedItem(item, reference)
    if (alreadyRelated && ignoreRelated) { return }
    // TODO 可以设置
    let editTimer: number
    const row = this.Addon.toolkit.UI.creatElementsFromJSON(
      document,
      {
        tag: "row",
        namespace: "xul",
        subElementOptions: [
          {
            tag: "box",
            id: "reference-box",
            namespace: "xul",
            classList: ["zotero-clicky"],
            listeners: [
              {
                type: "click",
                listener: async (event: any) => {
                  event.preventDefault()
                  event.stopPropagation()
                  if (event.ctrlKey) {
                    console.log(reference)
                    let URL = reference.url
                    if (!URL) {
                      const refText = reference.text
                      let info: ItemBaseInfo = this.Addon.utils.refText2Info(refText)
                      this.showProgressWindow("[Pending] Request URL From API", refText)
                      if (this.Addon.utils.isChinese(refText)) {
                        URL = await this.Addon.utils.API.getCNKIURL(info.title, info.authors[0])
                      } else {
                        let DOI = await (await this.Addon.utils.API.getTitleInfoByCrossref(refText)).identifiers.DOI
                        URL = this.Addon.utils.identifiers2URL({ DOI })
                      }
                      this.showProgressWindow("[Done] Request URL From API", URL)
                    }
                    if (URL) {
                      this.showProgressWindow("Launching URL", URL)
                      Zotero.launchURL(URL);
                    }
                  } else {
                    window.setTimeout(() => {                      
                      if (editTimer || rows.querySelector("#reference-edit")) { return }
                      this.showProgressWindow(idText, reference.text, "default", 2500, -1)
                      this.Addon.utils.copyText((idText ? idText + "\n" : "") + refText, false)
                    }, 10);
                  }
                }
              },
            ],
            subElementOptions: [
              {
                tag: "label",
                id: "item-type-icon",
                namespace: "xul",
                classList: [],
                styles: {
                  backgroundImage: `url(chrome://zotero/skin/treeitem-${reference.type}@2x.png)`,
                  ...this.iconStyles
                }
              },
              {
                tag: "label",
                namespace: "xul",
                id: "reference-label",
                classList: ["zotero-box-label"],
                attributes: {
                  value: refText,
                  crop: "end",
                  flex: "1"
                },
                listeners: [
                  {
                    type: "mousedown",
                    listener: () => {
                      editTimer = window.setTimeout(() => {
                        enterEdit()
                      }, 500);
                    }
                  },
                  {
                    type: "mouseup",
                    listener: () => {
                      window.clearTimeout(editTimer)
                      editTimer = null
                    }
                  }
                ]
              },
            ]
          },
          {
            tag: "label",
            id: "add-remove",
            namespace: "xul",
            attributes: {
              value: alreadyRelated ? "-" : "+"
            },
            classList: [
              "zotero-clicky",
              alreadyRelated ? "zotero-clicky-minus" : "zotero-clicky-plus"
            ]
          }
        ]
      }
    ) as XUL.Element
      
  
    let enterEdit = () => {
      let box = row.querySelector("#reference-box") as XUL.Label
      let label = row.querySelector("#reference-label") as XUL.Label
      label.style.display = "none"
      let textbox = this.Addon.toolkit.UI.creatElementsFromJSON(
        document,
        {
          tag: "textbox",
          id: "reference-edit",
          namespace: "xul",
          attributes: {
            value: addPrefix ? label.value.replace(/^\[\d+\]\s+/, "") : label.value,
            flex: "1",
            multiline: "true",
            rows: "4"
          },
          listeners: [
            {
              type: "blur",
              listener: async () => {
                await exitEdit()
              }
            }
          ]
        }
      ) as XUL.Textbox
      textbox.focus()
      label.parentNode.insertBefore(textbox, label)
      
      let exitEdit = async () => {
        // 界面恢复
        let inputText = textbox.value
        if (!inputText) { return }
        label.style.display = ""
        // textbox.style.display = "none"
        textbox.remove()
        // 保存结果
        if (inputText == reference.text) { return }
        label.value = `[${refIndex + 1}] ${inputText}`;
        references[refIndex] = { ...reference, ...{ identifiers: this.Addon.utils.getIdentifiers(inputText) }, ...{ text: inputText } }
        reference = references[refIndex]
        const key = `References-${node.getAttribute("source")}`
        // this.Addon.toolkit.Tool.setExtraField(item, key, JSON.stringify(references))
        await addonItem.set(item, key, references)
      }

      let id = window.setInterval(async () => {
        let active = rows.querySelector(".active")
        if (active && active != box) {
          await exitEdit()
          window.clearInterval(id)
        }
      }, 100)
    }

    const label = row.querySelector("label#add-remove") as XUL.Label
    let setState = (state: string = "") => {
      switch (state) {
        case "+":
          label.setAttribute("class", "zotero-clicky zotero-clicky-plus");
          label.setAttribute("value", "+");
          label.style.opacity = "1";
          break;
        case "-":
          label.setAttribute("class", "zotero-clicky zotero-clicky-minus");
          label.setAttribute("value", "-");
          label.style.opacity = "1";
          break
        case "":
          label.setAttribute("value", "");
          label.style.opacity = ".23";
          break
      }
    }

    let remove = async () => {
      log("removeRelatedItem")
      this.showProgressWindow("Removing", idText)
      setState()

      let relatedItem = this.Addon.utils.searchRelatedItem(item, reference)
      if (!relatedItem) {
        this.showProgressWindow("Removed", idText)
        (node.querySelector("#refreshButton") as XUL.Button).click()
        return
      }
      relatedItem.removeRelatedItem(item)
      item.removeRelatedItem(relatedItem)
      await item.saveTx()
      await relatedItem.saveTx()

      setState("+")
      this.showProgressWindow("Removed", idText, "success")
    }

    let add = async (collections: undefined | number[] = undefined) => {
      // check DOI
      let refItem, source
      let info: ItemBaseInfo = this.Addon.utils.refText2Info(reference.text);
      setState()
      // 认为中文知网一定能解决
      if (this.Addon.utils.isChinese(info.title) && Zotero.Jasminum) {
        this.showProgressWindow("CNKI", info.title)
        // search DOI in local
        refItem = await this.Addon.utils.searchLibraryItem(info)

        if (refItem) {
          source = "Local Item"
        } else {
          refItem = await this.Addon.utils.createItemByJasminum(info.title, info.authors[0])
          source = "Created Item"
        }
        this.Addon.toolkit.Tool.log("addToCollection")
        for (let collectionID of (collections || item.getCollections())) {
          refItem.addToCollection(collectionID)
          await refItem.saveTx()
        }
      }
      // DOI or arXiv
      else {
        if (Object.keys(reference.identifiers).length == 0) {
          // 目前只能获取DOI
          this.showProgressWindow("[Pending] Request DOI From API", info.title)
          let DOI = await (await this.Addon.utils.API.getTitleInfoByCrossref(info.title)).identifiers.DOI
          if (!this.Addon.utils.isDOI(DOI)) {
            setState("+")
            this.showProgressWindow("[Fail] Request DOI From API", "Error DOI")
            return
          }
          this.showProgressWindow("[Done] Request DOI From API", DOI, "success")
          reference.identifiers = { DOI }
        }
        // done
        if (this.Addon.utils.searchRelatedItem(item, reference)) {
          this.showProgressWindow("Added", JSON.stringify(reference.identifiers), "success");
          (node.querySelector("#refreshButton") as XUL.Button).click()
          return
        }
        this.showProgressWindow("Adding", JSON.stringify(reference.identifiers))
        setState()
        // search DOI in local
        refItem = await this.Addon.utils.searchLibraryItem(reference)
        if (refItem) {
          source = "Local Item"
          for (let collectionID of (collections || item.getCollections())) {
            refItem.addToCollection(collectionID)
            await refItem.saveTx()
          }
        } else {
          source = "Created Item"
          try {
            refItem = await this.Addon.utils.createItemByZotero(reference.identifiers, (collections || item.getCollections()))
          } catch (e) {
            this.showProgressWindow(`Add ${source}`, JSON.stringify(reference.identifiers) + "\n" + e.toString(), "fail")
            setState("+")
            this.Addon.toolkit.Tool.log(e)
            return
          }
        }
      }
      // addRelatedItem
      log("addRelatedItem")
      item.addRelatedItem(refItem)
      refItem.addRelatedItem(item)
      await item.saveTx()
      await refItem.saveTx()
      // button
      setState("-")
      this.showProgressWindow(`Added with ${source}`, refItem.getField("title"), "success")
      return row
    }

    let getCollectionPath = async (id) => {
      let path = []
      while (true) {
        let collection = await Zotero.Collections.getAsync(id) as any
        path.push(collection._name)
        if (collection._parentID) {
          id = collection._parentID
        } else {
          break
        }
      }
      return path.reverse().join("/")
    }

    let timer = null, tipUI
    const box = row.querySelector("#reference-box") as XUL.Box
    // 鼠标进入浮窗展示
    box.addEventListener("mouseenter", () => {
      if (!this.Addon.prefs.get("isShowTip")) { return }
      box.classList.add("active")
      const refText = reference.text
      let timeout = parseInt(this.Addon.prefs.get("showTipAfterMillisecond") as string)
      timer = window.setTimeout(async () => {
        let toTimeInfo = (t) => {
          if (!t) { return undefined }
          let info = (new Date(t)).toString().split(" ")
          return `${info[1]} ${info[3]}`
        }
        tipUI = new TipUI(this.Addon)
        tipUI.onInit(box)
        let getDefalutInfoByReference = async () => {
          let info: ItemInfo = {
            identifiers: {},
            authors: [],
            type: "",
            title: idText || "Reference",
            tags: [],
            text: refText,
            abstract: refText
          }
          return info
        }
        let coroutines: Promise<ItemInfo>[], prefIndex: number, according: string
        if (reference?.identifiers.arXiv) {
          according = "arXiv"
          coroutines = [
            getDefalutInfoByReference(),
            this.Addon.utils.API.getArXivInfo(reference.identifiers.arXiv)
          ]
          prefIndex = parseInt(this.Addon.prefs.get(`${according}InfoIndex`) as string)
        } else if (reference?.identifiers.DOI) {
          according = "DOI"
          coroutines = [
            getDefalutInfoByReference(),
            this.Addon.utils.API.getDOIInfoBySemanticscholar(reference.identifiers.DOI),
            this.Addon.utils.API.getDOIInfoByCrossref(reference.identifiers.DOI)
          ]
          prefIndex = parseInt(this.Addon.prefs.get(`${according}InfoIndex`) as string)
        } else {
          according = "Title"
          coroutines = [
            getDefalutInfoByReference(),
            this.Addon.utils.API.getTitleInfoByReadpaper(refText),
            this.Addon.utils.API.getTitleInfoByCrossref(refText),
            this.Addon.utils.API.getTitleInfoByCNKI(refText)
          ]
          prefIndex = parseInt(this.Addon.prefs.get(`${according}InfoIndex`) as string)
        }
        log("prefIndex", prefIndex)
        const sourceConfig = {
          arXiv: { color: "#b31b1b", tip: "arXiv is a free distribution service and an open-access archive for 2,186,475 scholarly articles in the fields of physics, mathematics, computer science, quantitative biology, quantitative finance, statistics, electrical engineering and systems science, and economics. Materials on this site are not peer-reviewed by arXiv."},
          readpaper: { color: "#1f71e0", tip: "论文阅读平台ReadPaper共收录近2亿篇论文、2.7亿位作者、近3万所高校及研究机构，几乎涵盖了全人类所有学科。科研工作离不开论文的帮助，如何读懂论文，读好论文，这本身就是一个很大的命题，我们的使命是：“让天下没有难读的论文”" },
          semanticscholar: { color: "#1857b6", tip: "Semantic Scholar is an artificial intelligence–powered research tool for scientific literature developed at the Allen Institute for AI and publicly released in November 2015. It uses advances in natural language processing to provide summaries for scholarly papers. The Semantic Scholar team is actively researching the use of artificial-intelligence in natural language processing, machine learning, Human-Computer interaction, and information retrieval." },
          crossref: { color: "#89bf04", tip: "Crossref is a nonprofit association of approximately 2,000 voting member publishers who represent 4,300 societies and publishers, including both commercial and nonprofit organizations. Crossref includes publishers with varied business models, including those with both open access and subscription policies." },
          DOI: { color: "#fcb426" },
          Zotero: { color: "#d63b3b", tip: "Zotero is a free, easy-to-use tool to help you collect, organize, cite, and share your research sources." },
          CNKI: { color: "#1b66e6", tip: "中国知网知识发现网络平台—面向海内外读者提供中国学术文献、外文文献、学位论文、报纸、会议、年鉴、工具书等各类资源统一检索、统一导航、在线阅读和下载服务。"}
        }
        for (let i = 0; i < coroutines.length; i++) {
          // 不阻塞
          window.setTimeout(async () => {
            let info = await coroutines[i]
            if (!info) { return }
            const tagDefaultColor = "#59C1BD"
            let tags = info?.tags.map((tag: object | string) => {
              if (typeof tag == "object") {
                return { color: tagDefaultColor, ...(tag as object) }
              } else {
                return { color: tagDefaultColor, text: tag }
              }
            }) as any || []
            // 展示当前数据源tag
            if (info.source) { tags.push({ text: info.source, ...sourceConfig[info.source], source: info.source }) }
            // 展示可点击跳转链接tag
            if (info.identifiers.DOI) {
              let DOI = info.identifiers.DOI
              tags.push({ text: "DOI", color: sourceConfig.DOI.color, tip: DOI, url: info.url })
            }
            if (info.identifiers.arXiv) {
              let arXiv = info.identifiers.arXiv
              tags.push({ text: "arXiv", color: sourceConfig.arXiv.color, tip: arXiv, url: info.url })
            }
            if (info.identifiers.CNKI) {
              let url = info.identifiers.CNKI
              tags.push({ text: "URL", color: sourceConfig.CNKI.color, tip: url, url: info.url })
            }
            if (reference._item) {
              // 用本地Item更新数据
              tags.push({ text: "Zotero", color: sourceConfig.Zotero.color, tip: sourceConfig.Zotero.tip, item: reference._item })
            }
            // 添加
            tipUI.addTip(
              this.Addon.utils.Html2Text(info.title),
              tags,
              [
                info.authors.slice(0, 3).join(" / "),
                [info?.primaryVenue, toTimeInfo(info.publishDate) || info.year]
                  .filter(e => e).join(" \u00b7 ")
              ].filter(s => s != ""),
              this.Addon.utils.Html2Text(info.abstract),
              according,
              i,
              prefIndex
            )
          }, 0)
        }
      }, timeout);
    })

    box.addEventListener("mouseleave", () => {
      box.classList.remove("active")
      window.clearTimeout(timer);
      if (!tipUI) {return}
      const timeout = tipUI.removeTipAfterMillisecond
      tipUI.tipTimer = window.setTimeout(async () => {
        // 监测是否连续一段时间内无active
        for (let i = 0; i < timeout / 2; i++) {
          if (rows.querySelector(".active")) { return }
          await Zotero.Promise.delay(1/1000)
        }
        tipUI && tipUI.clear()
      }, timeout / 2)
    })

    label.addEventListener("click", async (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (label.value == "+") {
        if (event.ctrlKey) {
          let collection = ZoteroPane.getSelectedCollection();
          log(collection)
          if (collection) {
            this.showProgressWindow("Adding to collection", `${await getCollectionPath(collection.id)}`)
            await add([collection.id])
          } else {
            this.showProgressWindow("Tip", "Please select your coolection and retry")
          }
        } else {
          await add()
        }
      } else if (label.value == "-") {
        await remove()
      }
    })

    row.append(box, label);
    const rows = node.querySelector("[id$=Rows]")
    rows.appendChild(row);
    let referenceNum = rows.childNodes.length
    if (addSearch && referenceNum && !node.querySelector("#zotero-reference-search")) { this.addSearch(node) }
    return row
  }

  public insertAfter(node, _node) {
    this.Addon.toolkit.Tool.log("nextSibling", _node.nextSibling)
    if (_node.nextSibling) {
      this.Addon.toolkit.Tool.log("insert After")
      _node.parentNode.insertBefore(node, _node.nextSibling);
    } else {
      _node.parentNode.appendChild(node);
    }
  }
  
  public unInitViews() {
    this.removeUI()
  }

  public showProgressWindow(
    header: string,
    context: string,
    type: string = "default",
    t: number = 5000,
    maxLength: number = 100
  ) {
    if (this.progressWindow) {
      this.progressWindow.close();
    }
    let progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
    this.progressWindow = progressWindow
    progressWindow.changeHeadline(header);
    progressWindow.progress = new progressWindow.ItemProgress(
      this.progressWindowIcon[type],
      (maxLength > 0 && context.length > maxLength) ? context.slice(0, maxLength) + "..." : context
    );
    progressWindow.show();
    if (t > 0) {
      progressWindow.startCloseTimer(t);
    }
    return progressWindow
  }
}

export default AddonViews;
