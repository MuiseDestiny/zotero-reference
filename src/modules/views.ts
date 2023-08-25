import { config } from "../../package.json";
import { initLocale, getString } from "../utils/locale";
import TipUI from "./tip";
import Utils from "./utils";
import LocalStorge from "./localStorage";
const localStorage = new LocalStorge(config.addonRef);

export default class Views {
  public utils!: Utils;
  constructor() {
    initLocale();
    this.utils = new Utils()
    this.addStyle()
  }

  private addStyle() {
    const styles = ztoolkit.UI.createElement(document, "style", {
      id: "reference-style",
      properties: {
        innerHTML: `
          .reference-search-box .icon {
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0.8;
          }
          .reference-search-box .icon:hover {
            opacity: 1
          }
        `
      },
    });
    document.documentElement.appendChild(styles);
  }
  /**
   * 注册阅读侧边栏
   */
  public async onInit() {
    ztoolkit.ReaderTabPanel.register(
      getString("tabpanel-reader-tab-label"),
      (
        panel: XUL.TabPanel | undefined,
        deck: XUL.Deck,
        win: Window,
        reader: _ZoteroTypes.ReaderInstance
      ) => {
        if (!panel) {
          ztoolkit.log(
            "This reader do not have right-side bar. Adding reader tab skipped."
          );
          return;
        }
        let timer: number | undefined
        const id = `${config.addonRef}-${reader._instanceID}-extra-reader-tab-div`
        window.setTimeout(async () => {          
          const relatedbox = ztoolkit.UI.createElement(
            document,
            "related-box",
            {
              id,
              classList: ["zotero-editpane-related"],
              namespace: "xul",
              ignoreIfExists: true,
              attributes: {
                flex: "1",
              },
              styles: {
                alignItems: "center"
              },
              children: [
                {
                  tag: "box",
                  namespace: "xul",
                  classList: ["reference"],
                  attributes: {
                    flex: "1",
                  },
                  styles: {
                    display: "flex",
                    // paddingLeft: "0px",
                    // paddingRight: "0px"
                  },
                  children: [
                    {
                      tag: "div",
                      namespace: "html",
                      styles: {
                        flexGrow: "1",
                      },
                      children: [
                        {
                          tag: "div",
                          classList: ["header"],
                          namespace: "html",
                          children: [
                            {
                              tag: "label",
                              id: "reference-num",
                              properties: {
                                innerText: `0 ${getString("relatedbox-number-label")}`
                              },
                              listeners: [
                                {
                                  type: "dblclick",
                                  listener: () => {
                                    ztoolkit.log("dblclick: Copy all references")
                                    let textArray: string[] = []
                                    let labels = relatedbox.querySelectorAll("#related-grid .box #reference-label")
                                    ztoolkit.log(labels)
                                    labels.forEach((e: any) => {
                                      textArray.push(e.textContent)
                                    });
                                    ztoolkit.log(textArray);
                                    (new ztoolkit.ProgressWindow("Reference"))
                                      .createLine({text: "Copy all references", type: "success"})
                                      .show();
                                    (new ztoolkit.Clipboard())
                                      .addText(textArray.join("\n"), "text/unicode")
                                      .copy();
                                  }
                                }
                              ]
                            },
                            {
                              tag: "button",
                              id: "refresh-button",
                              properties: {
                                innerText: getString("relatedbox-refresh-label")
                              },
                              listeners: [
                                {
                                  type: "mousedown",
                                  listener: (event: any) => {
                                    timer = window.setTimeout(async () => {
                                      timer = undefined
                                      // 不从本地储存读取
                                      await this.refreshReferences(panel, false, event.ctrlKey || event.metaKey)
                                    }, 1000)
                                  }
                                },
                                {
                                  type: "mouseup",
                                  listener: async (event: any) => {
                                    if (timer) {
                                      window.clearTimeout(timer) 
                                      timer = undefined
                                      // 本地储存读取
                                      await this.refreshReferences(panel, true, event.ctrlKey || event.metaKey)
                                    }
                                  }
                                }
                              ]
                            }
                          ]
                        },
                        {
                          tag: "div",
                          namespace: "html",
                          id: "related-grid",
                          classList: ["grid"],
                          styles: {
                            overflowY: "auto",
                            alignItems: "center",
                            display: "grid"
                          }
                        }
                      ]
                    },
                  ]
                }
              ],
            }
          );
  
          panel.append(relatedbox);
          relatedbox.querySelector("box:not(.reference)")?.remove()
          // 修改链接
          // window.setTimeout(async () => {
          //   await this.pdfLinks(reader, panel)
          // })
          // 自动刷新
          window.setTimeout(async () => {
            if (Zotero.Prefs.get(`${config.addonRef}.autoRefresh`)) {
              let excludeItemTypes = (Zotero.Prefs.get(`${config.addonRef}.notAutoRefreshItemTypes`) as string).split(/,\s*/)
              if (panel.getAttribute("isAutoRefresh") != "true") {
                const item = Zotero.Items.get(reader._itemID).parentItem
                // @ts-ignore
                const id = item.getType()
                const itemType = Zotero.ItemTypes.getTypes().find(i => i.id == id)?.name as string
                if (excludeItemTypes.indexOf(itemType) == -1) {
                  await this.refreshReferences(panel)
                  panel.setAttribute("isAutoRefresh", "true")
                }
              }
            }
          })
          // 推荐关联
          window.setTimeout(async () => {
            await this.loadingRelated();
          })
          // 分割按钮
          // window.setTimeout(async () => {
          //   await this.registerSplitButtons(reader);
          // })
        })
      },
      {
        // targetIndex: 3,
        tabId: "zotero-reference",
        selectPanel: false,
      }
    )
  }

  private async registerSplitButtons(reader: _ZoteroTypes.ReaderInstance) {
    let _window: any
    // @ts-ignore
    while (!(_window = reader?._iframeWindow?.wrappedJSObject)) {
      ztoolkit.log("wait...")
      await Zotero.Promise.delay(10)
    }
    const parent = _window.document.querySelector("#toolbarViewerLeft")!
    const ref = parent.querySelector("#pageNumber") as HTMLDivElement
    const styles = {
      backgroundSize: "16px 16px",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      width: "16px"
    }
    
    ztoolkit.UI.insertElementBefore({
      tag: "div",
      classList: ["splitToolbarButton"],
      children: [
        {
          tag: "button",
          namespace: "html",
          id: "split-horizontally",
          classList: ["toolbarButton"],
          styles: {
            backgroundImage: `url(chrome://${config.addonRef}/content/icons/horizontally.png)`,
            // backgroundImage: await Zotero.File.generateDataURI(
            //   `chrome://${config.addonRef}/content/icons/horizontally.png`, 'image/png'
            // ),
            marginRight: "1px",
            ...styles
          },
          attributes: {
            title: "Split Horizontally",
            tabindex: "-1",
          },
          listeners: [
            {
              type: "click",
              listener: () => {
                reader.menuCmd("splitHorizontally")
              }
            }
          ]
        },
        {
          tag: "button",
          namespace: "html",
          id: "split-vertically",
          classList: ["toolbarButton"],
          styles: {
            backgroundImage: `url(chrome://${config.addonRef}/content/icons/split.png)`,
            // backgroundImage: await Zotero.File.generateDataURI(
            //   `chrome://${config.addonRef}/content/icons/vertically.png`, 'image/png'
            // ),
            marginLeft: "0",
            ...styles
          },
          attributes: {
            title: "Split Vertically",
            tabindex: "-1",
          },
          listeners: [
            {
              type: "click",
              listener: () => {
                reader.menuCmd("splitVertically")
              }
            }
          ]
        }
      ]
    }, ref)

    // ztoolkit.UI.appendElement({
    //   tag: "style",
    //   id: "reference-style",
    //   properties: {
    //     innerHTML: `
    //       #split-horizontally.toolbarButton::before {
    //         background-image: url("chrome://${config.addonRef}/content/icons/horizontally.png");
    //       }
    //       #split-vertically.toolbarButton::before {
    //         background-image: url("chrome://${config.addonRef}/content/icons/vertically.png");
    //       }
    //     `
    //   },
    // }, ((_window.document as Document).documentElement));
  }

  /**
   * 刷新推荐相关
   * @param array 
   * @param node 
   * @returns 
   */
  public refreshRelated(array: ItemBaseInfo[], node: HTMLDivElement) {
    let totalNum = 0
    // @ts-ignore
    array.forEach((info: ItemBaseInfo, i: number) => {
      let {box, label} = this.addRow(node, array, i, false, false) as any
      if (!box) { return }
      box.classList.add("only-title")
      totalNum += 1;
      // let box = row.querySelector("box") as XUL.Box
    })
    return totalNum
  }

  /**
 * Only item with DOI is supported
 * @returns 
 */
  async loadingRelated() {
    if (!Zotero.Prefs.get(`${config.addonRef}.loadingRelated`)) { return }
    ztoolkit.log("loadingRelated");
    let item = this.utils.getItem() as Zotero.Item
    if (!item) { return }
    let itemDOI = item.getField("DOI") as string
    if (!itemDOI || !this.utils.isDOI(itemDOI)) {
      ztoolkit.log("Not DOI", itemDOI);
      return
    }
    let relatedbox = document
      .querySelector(`#${Zotero_Tabs.selectedID}-context`)!
      .querySelector("tabpanel:nth-child(3) related-box")! as any
    do {
      await Zotero.Promise.delay(50);
    }
    while (!relatedbox.querySelector('#related-grid'));
    
    let node = relatedbox.querySelector('#related-grid').parentNode! as HTMLDivElement
    // 已经刷新过
    if (node.querySelector(".zotero-clicky-plus")) { return }
    ztoolkit.log("getDOIRelatedArray")
    let _relatedArray = (await this.utils.API.getDOIRelatedArray(itemDOI)) as ItemBaseInfo[] || []
    let func = relatedbox.refresh
    relatedbox.refresh = () => {
      func.call(relatedbox)
      // #42，为Zotero相关条目添加悬浮提示
      // 把Zotero条目转化为Reference可识别形式
      node.querySelectorAll(".box").forEach((e: any) => { e.nextElementSibling?.remove(); e.remove();  })
      ztoolkit.log(_relatedArray)
      let relatedArray = (item.relatedItems.map((key: string) => {
        try {
          return Zotero.Items.getByLibraryAndKey(1, key) as Zotero.Item
        } catch { }
      })
        .filter(i => i) as Zotero.Item[])
        .map((item: Zotero.Item) => {
          return {
            identifiers: { DOI: item.getField("DOI") },
            authors: [],
            title: item.getField("title"),
            text: item.getField("title"),
            url: item.getField("url"),
            type: item.itemType,
            year: item.getField("year"),
            _item: item
          } as ItemBaseInfo
        }).concat(_relatedArray)
      ztoolkit.log(relatedArray)
      this.refreshRelated(relatedArray, node)

    }
    relatedbox.refresh()
  }

  public async pdfLinks(reader: _ZoteroTypes.ReaderInstance, panel: XUL.TabPanel) {
    let _pdfDocument: any, _window: any
    // @ts-ignore
    while (!((_window = reader?._iframeWindow?.wrappedJSObject) && (_pdfDocument = _window.PDFViewerApplication?.pdfDocument))) {
      await Zotero.Promise.delay(10)
    }
    // let refKeys: any = []
    const dests = await _pdfDocument._transport.getDestinations()
    // window.setTimeout(async () => {
    //   dests = await _pdfDocument._transport.getDestinations()
    //   // 分析href与参考文献对应
    //   // 统计与参考文献数量一致的引文
    //   const statistics: any = {}
    //   Object.keys(dests).forEach(key => {
    //     let _key = key.replace(/\d/g, "")
    //     statistics[_key] ??= 0
    //     statistics[_key] += 1
    //   })
    //   // const totalNum = 36
    //   // let refKey = Object.keys(statistics).find(k => statistics[k] == totalNum)
    //   // 用最大值概率最大，但是有一定风险
    //   let refKey = Object.keys(statistics).sort((k1, k2) => statistics[k2]- statistics[k1])[0]
    //   Object.keys(dests).forEach(key => {
    //     if (key.replace(/\d/g, "") == refKey) {
    //       refKeys.push(key)
    //     }
    //   })
    //   // 根据匹配数字排序
    //   refKeys = refKeys.sort((k1: string, k2: string) => {
    //     let n1 = Number(k1.match(/\d+/)![0])
    //     let n2 = Number(k2.match(/\d+/)![0])
    //     return n1 - n2
    //   })
    // })
    let id = window.setInterval(async () => {
      try {
        _window.document
      } catch (e) {
        ztoolkit.log(e)
        window.clearInterval(id)
        return await this.pdfLinks(reader, panel)
      }
      
      _window.document
        .querySelectorAll(`section.linkAnnotation a[href^='#']:not([${config.addonRef}])`).forEach(async (a: any) => {
          const isClickLink = Zotero.Prefs.get(`${config.addonRef}.clickLink`) as boolean
          const isHoverLink = Zotero.Prefs.get(`${config.addonRef}.hoverLink`) as boolean
          let _a: any, href = a.getAttribute("href")
          if (href.indexOf("fig") >=0) {return }
          if (isClickLink) {
            _a = ztoolkit.UI.appendElement({
              tag: "a",
              namespace: "html"
            }, a.parentNode) as HTMLDivElement
            _a.setAttribute(config.addonRef, href);
            _a.setAttribute("style", "cursor: pointer;")
            a.remove()
            _a.addEventListener("click", async (event: MouseEvent) => {
              event.stopPropagation();
              event.preventDefault();
              if (_window.secondViewIframeWindow == null) {
                await reader.menuCmd(
                  Zotero.Prefs.get(`${config.addonRef}.clickLink.cmd`) as any
                )
                while (
                  !(
                    _window?.secondViewIframeWindow?.PDFViewerApplication?.pdfDocument
                  )
                ) {
                  await Zotero.Promise.delay(100)
                }
                await Zotero.Promise.delay(1000)
              }
              // let dest = unescape()
              // 有报错，#39 
              _window.secondViewIframeWindow.eval(`PDFViewerApplication
                .pdfViewer.linkService.goToDestination("${href.slice(1) }")`)

            })
          }
          
          let timer: undefined | number
          _a = _a || a
          if (isHoverLink) {
            let tipUI: TipUI
            _a.addEventListener("mouseenter", async (event: MouseEvent) => {
              // @ts-ignore
              const references = panel.references
              if (!references) { return }
              const [x, y] = dests[href.slice(1)].slice(2, 4)
              // 确定 refIndex
              const distances = references.map((ref: { x: number; y: number }) => (x - ref.x) ** 2 + (y - ref.y) ** 2)
              const minDistance = [...distances].sort((a: number, b: number) => a-b)[0]
              const refIndex = distances.indexOf(minDistance)
              let reference = references[refIndex]
              if (reference) {
                timer = window.setTimeout(() => {
                  timer = undefined
                  let rect = _a.getBoundingClientRect()
                  rect.y = rect.y + 40;
                  tipUI = this.showTipUI(
                    rect,
                    reference,
                    "top center"
                  )
                }, 233)
              }
            })
            _a.addEventListener("mouseleave", async () => {
              window.clearTimeout(timer)
              if (tipUI) {
                const timeout = tipUI.removeTipAfterMillisecond
                tipUI.tipTimer = window.setTimeout(async () => {
                  tipUI && tipUI.container.remove()
                }, timeout)
              }
            })
          }
        })
    }, 100)
  }

  /**
   * 刷新按钮触发
   * @param local 是否允许从本地读取
   * @param fromCurrentPage 从当前页向前查询参考文献
   * @returns 
   */
  public async refreshReferences(panel: XUL.TabPanel, local: boolean = true, fromCurrentPage: boolean = false) {
    Zotero.ProgressWindowSet.closeAll();
    let label = panel.querySelector("label#reference-num") as XUL.Label;
    label.innerText = `${0} ${getString("relatedbox-number-label")}`;
    let source = panel.getAttribute("source")
    if (source) {
      if (local) {
        if (source == "PDF") {
          panel.setAttribute("source", "API")
        }
        if (source == "API") {
          panel.setAttribute("source", "PDF")
        }
      }
    } else {
      panel.setAttribute("source", Zotero.Prefs.get(`${config.addonRef}.prioritySource`))
    }

    // clear 
    panel.querySelectorAll("#related-grid *").forEach(e => e.remove());
    panel.querySelectorAll("#zotero-reference-search").forEach(e => e.remove());

    let references: ItemBaseInfo[]
    let item = this.utils.getItem() as Zotero.Item
    let reader = this.utils.getReader();
    if (panel.getAttribute("source") == "PDF") {
      // 优先本地读取
      const key = "References-PDF"
      // references = local && addonItem.get(item, key)
      references = local && localStorage.get(item, key)
      if (references) {
        (new ztoolkit.ProgressWindow("[Local] PDF"))
          .createLine({ text: `${references.length} references`, type: "success"})
          .show()
      } else {
        references = await this.utils.PDF.getReferences(reader, fromCurrentPage)
        if (Zotero.Prefs.get(`${config.addonRef}.savePDFReferences`)) {
          window.setTimeout(async () => {
            await localStorage.set(item, key, references)
          })
        }
      }
    } else {
      const key = "References-API"
      references = local && localStorage.get(item, key)
      if (references) {
        (new ztoolkit.ProgressWindow("[Local] API"))
          .createLine({ text: `${references.length} references`, type: "success" })
          .show()
      } else {
        
        let DOI = item.getField("DOI") as string
        let url = item.getField("url") as string
        let title = item.getField("title") as string

        let fileName = this.utils.parseCNKIURL(url)?.fileName
        let popupWin
        if (this.utils.isDOI(DOI)) {
          popupWin = new ztoolkit.ProgressWindow("[Pending] API", { closeTime: -1 })
          popupWin
            .createLine({ text: "Request DOI references...", type: "default" })
            .show()
          references = (await this.utils.API.getDOIInfoByCrossref(DOI))?.references!
        }
        else {
          if (!fileName) {
            try {
              let url = await this.utils.API.getCNKIURL(title) as string
              if (url) {
                fileName = this.utils.parseCNKIURL(url)?.fileName
                item.setField("url", url)
                await item.saveTx()
              }
            } catch {
              (new ztoolkit.ProgressWindow("[Fail] API"))
                .createLine({ text: `Error, Get CNKI URL`, type: "fail" })
                .show()
              return
            }
            if (!fileName) {
              (new ztoolkit.ProgressWindow("[Fail] API"))
                .createLine({ text: `Fail, Get CNKI URL`, type: "fail" })
                .show()
              return 
            }
          }
          popupWin = new ztoolkit.ProgressWindow("[Pending] API", { closeTime: -1, closeOtherProgressWindows: true})
          popupWin
            .createLine({ text: "Request CNKI references...", type: "default" })
            .show()
          references = (await this.utils.API.getCNKIFileInfo(fileName))?.references!
          if (!references) {
            popupWin.changeHeadline("[Fail] API")
            popupWin.changeLine({ text: `Not Supported, ${fileName}`, type: "fail" })
            popupWin.startCloseTimer(3000)
            return
          }
        }
        if (Zotero.Prefs.get(`${config.addonRef}.saveAPIReferences`)) {
          window.setTimeout(async () => {
            references && await localStorage.set(item, key, references)
          })
        }
        popupWin.changeHeadline("[Done] API")
        popupWin.changeLine({ text: `${references.length} references`, type: "success" })
        popupWin.startCloseTimer(3000)
      }
    }

    const referenceNum = references.length
    // @ts-ignore
    panel.references = references
    references.forEach(async (reference: ItemBaseInfo, refIndex: number) => {
      let { box } = this.addRow(panel, references, refIndex)!;
      // @ts-ignore
      box.reference = reference
      label.innerText = `${refIndex + 1}/${referenceNum} ${getString("relatedbox-number-label")}`;
    })

    label.innerText = `${referenceNum} ${getString("relatedbox-number-label")}`;
  }

  public showTipUI(refRect: Rect, reference: ItemInfo, position: string, idText?: string) {
    let toTimeInfo = (t: string) => {
      if (!t) { return undefined }
      let info = (new Date(t)).toString().split(" ")
      return `${info[1]} ${info[3]}`
    }
    let tipUI = new TipUI()
    tipUI.onInit(refRect, position)
    const refText = reference.text!;
    let getDefalutInfoByReference = async () => {
      const localItem = reference._item
      let info: ItemInfo
      if (localItem) {
        info = {
          identifiers: {},
          authors: localItem.getCreators().map((i: any) => i.firstName + " " + i.lastName),
          tags: localItem.getTags().map((i: any) => {
            let ctag: any = localItem.getColoredTags().find((ci: any) => ci.tag == i.tag)
            if (ctag) {
              return {text: i.tag, color: ctag.color}
            } else {
              return i.tag
            }
          }),
          abstract: localItem.getField("abstractNote") as string,
          title: localItem.getField("title") as string,
          year: localItem.getField("year") as string,
          primaryVenue: localItem.getField("publicationTitle") as string,
          type: "",
          source: reference.source || undefined
        }
      } else {
        info = {
          identifiers: reference.identifiers || {},
          authors: reference.authors || [],
          type: "",
          year: reference.year || undefined,
          title: reference.title || idText || "Reference",
          tags: reference.tags || [],
          text: reference.text || refText,
          abstract: reference.abstract || refText,
          primaryVenue: reference.primaryVenue || undefined
          
        }
        let url = this.utils.identifiers2URL(info.identifiers)
        if (url) {
          info.url = url
        }
      }
      return info
    }
    let coroutines: Promise<ItemInfo | undefined>[], prefIndex: number, according: string
    if (reference?.identifiers.arXiv) {
      according = "arXiv"
      coroutines = [
        getDefalutInfoByReference(),
        this.utils.API.getArXivInfo(reference.identifiers.arXiv)
      ]
      prefIndex = parseInt(Zotero.Prefs.get(`${config.addonRef}.${according}InfoIndex`) as string)
    } else if (reference?.identifiers.DOI) {
      according = "DOI"
      coroutines = [
        getDefalutInfoByReference(),
        this.utils.API.getDOIInfoBySemanticscholar(reference.identifiers.DOI),
        this.utils.API.getTitleInfoByReadpaper(refText, {}, reference.identifiers.DOI),
        this.utils.API.getTitleInfoByConnectedpapers(reference.identifiers.DOI),
        this.utils.API.getDOIInfoByCrossref(reference.identifiers.DOI)
      ]
      prefIndex = parseInt(Zotero.Prefs.get(`${config.addonRef}.${according}InfoIndex`) as string)
    } else {
      according = "Title"
      coroutines = [
        getDefalutInfoByReference(),
        this.utils.API.getTitleInfoByReadpaper(reference.title),
        this.utils.API.getTitleInfoByCrossref(reference.title),
        this.utils.API.getTitleInfoByConnectedpapers(reference.title),
        this.utils.API.getTitleInfoByCNKI(reference.title)
      ]
      prefIndex = parseInt(Zotero.Prefs.get(`${config.addonRef}.${according}InfoIndex`) as string)
    }
    const sourceConfig = {
      arXiv: { color: "#b31b1b", tip: "arXiv is a free distribution service and an open-access archive for 2,186,475 scholarly articles in the fields of physics, mathematics, computer science, quantitative biology, quantitative finance, statistics, electrical engineering and systems science, and economics. Materials on this site are not peer-reviewed by arXiv." },
      readpaper: { color: "#1f71e0", tip: "论文阅读平台ReadPaper共收录近2亿篇论文、2.7亿位作者、近3万所高校及研究机构，几乎涵盖了全人类所有学科。科研工作离不开论文的帮助，如何读懂论文，读好论文，这本身就是一个很大的命题，我们的使命是：“让天下没有难读的论文”" },
      semanticscholar: { color: "#1857b6", tip: "Semantic Scholar is an artificial intelligence–powered research tool for scientific literature developed at the Allen Institute for AI and publicly released in November 2015. It uses advances in natural language processing to provide summaries for scholarly papers. The Semantic Scholar team is actively researching the use of artificial-intelligence in natural language processing, machine learning, Human-Computer interaction, and information retrieval." },
      crossref: { color: "#89bf04", tip: "Crossref is a nonprofit association of approximately 2,000 voting member publishers who represent 4,300 societies and publishers, including both commercial and nonprofit organizations. Crossref includes publishers with varied business models, including those with both open access and subscription policies." },
      connectedpapers: { color: "#35999a", tip: "Connected Papers is a visual tool to help researchers and applied scientists find academic papers relevant to their field of work."},
      DOI: { color: "#fcb426" },
      Zotero: { color: "#d63b3b", tip: "Zotero is a free, easy-to-use tool to help you collect, organize, cite, and share your research sources." },
      CNKI: { color: "#1b66e6", tip: "中国知网知识发现网络平台—面向海内外读者提供中国学术文献、外文文献、学位论文、报纸、会议、年鉴、工具书等各类资源统一检索、统一导航、在线阅读和下载服务。" }
    }
    for (let i = 0; i < coroutines.length; i++) {
      // 不阻塞
      window.setTimeout(async () => {
        let info = await coroutines[i]
        if (!info) { return }
        const tagDefaultColor = "#59C1BD"
        let tags = info.tags!.map((tag: object | string) => {
          if (typeof tag == "object") {
            return { color: tagDefaultColor, ...(tag as object) }
          } else {
            return { color: tagDefaultColor, text: tag }
          }
        }) as any || []
        // 展示当前数据源tag
        if (info.source) { tags.push({ text: info.source, ...sourceConfig[info.source as keyof typeof sourceConfig], source: info.source }) }
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
          this.utils.Html2Text(info.title!)!,
          tags,
          [
            info.authors?.slice(0, 3).join(" / "),
            [info?.primaryVenue, toTimeInfo(info.publishDate as string) || info.year]
              .filter(e => e).join(" \u00b7 "),
            reference.description
          ].filter(s => s && s != ""),
          this.utils.Html2Text(info.abstract!)!,
          according,
          i,
          prefIndex
        )
      })
    }
    return tipUI
  }

  public addRow(node: HTMLDivElement, references: ItemBaseInfo[], refIndex: number, addPrefix: boolean = true, addSearch: boolean = true) {
    let notInLibarayOpacity: string|number = Zotero.Prefs.get(`${config.addonRef}.notInLibarayOpacity`) as string
    if (/[\d\.]+/.test(notInLibarayOpacity)) {
      notInLibarayOpacity = Number(notInLibarayOpacity);
    } else {
      notInLibarayOpacity = 1
    }
    let reference = references[refIndex]
    // 非阻塞搜索
    let refText: string
    if (addPrefix) {
      refText = `[${reference?.number || (refIndex + 1)}] ${reference.text}`
    } else {
      refText = reference.text!
    }
    // 避免重复添加
    let toText = (s: string) => s.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "") 
    if (
      [...node.querySelectorAll(".box label")].find((e: any) => toText(e.innerText) == toText(refText))
    ) {
      return
    }
    // id描述
    let idText = (
      reference.identifiers
      && Object.values(reference.identifiers).length > 0
      && Object.keys(reference.identifiers)[0] + ": " + Object.values(reference.identifiers)[0]
    ) || "Reference"
    // 当前item
    let item = this.utils.getItem()!
    let editTimer: number | undefined
    const box = ztoolkit.UI.createElement(
      document,
      "div",
      {
        namespace: "html",
        classList: ["box", "zotero-clicky"],
        listeners: [
          {
            type: "click",
            listener: (event: any) => {
              event.preventDefault()
              event.stopPropagation()
            }
          },
          {
            type: "mouseup",
            listener: async (event: any) => {
              event.preventDefault()
              event.stopPropagation()
              // ctrl点击跳转本地item/url
              if (event.ctrlKey || event.metaKey) {
                window.clearTimeout(editTimer)
                if (reference._item) {
                  return this.utils.selectItemInLibrary(reference._item)
                } else {
                  let item = await this.utils.searchLibraryItem(reference)
                  if (item) {
                    return this.utils.selectItemInLibrary(item)
                  }
                }
                let URL = reference.url
                if (!URL) {
                  const refText = reference.text!
                  let info: ItemBaseInfo = this.utils.refText2Info(refText);
                  const popupWin = (new ztoolkit.ProgressWindow("Searching URL", { closeTime: -1 }))
                    .createLine({ text: `Title: ${reference.title}`, type: "default" })
                    .show()
                  if (this.utils.isChinese(refText)) {
                    URL = await this.utils.API.getCNKIURL(info.title)
                  } else {
                    let DOI = (await this.utils.API.getTitleInfoByConnectedpapers(reference.title as string))?.identifiers.DOI
                    URL = this.utils.identifiers2URL({ DOI })
                  }
                  popupWin.close()
                }
                if (URL) {
                  (new ztoolkit.ProgressWindow("Launching URL", { closeOtherProgressWindows: true }))
                    .createLine({ text: URL, type: "default" })
                    .show()
                  Zotero.launchURL(URL);
                }
              } else {
                if (rows.querySelector("#reference-edit")) { return }
                if (editTimer) {
                  window.clearTimeout(editTimer)
                  Zotero.ProgressWindowSet.closeAll()
                  this.utils.copyText((idText ? idText + "\n" : "") + refText, false);
                  (new ztoolkit.ProgressWindow("Reference"))
                    .createLine({ text: refText, type: "success" })
                    .show()
                }
              }
            }
          },
        ],
        styles: {
          alignItems: "center",
          opacity: String(notInLibarayOpacity),
          paddingTop: "1px",
          paddingBottom: "1px"
        },
        children: [
          {
            tag: "img",
            attributes: {
              src: Zotero.ItemTypes.getImageSrc(reference.type as any) as string
            }
          },
          {
            tag: "label",
            id: "reference-label",
            properties: {
              innerText: refText
            },
            styles: {
              width: "100%"
            },
            listeners: [
              {
                type: "mousedown",
                listener: () => {
                  editTimer = window.setTimeout(() => {
                    editTimer = undefined
                    enterEdit()
                  }, 500);
                }
              }
            ]
          }
        ]
      }
    ) as XUL.Element
    const label = ztoolkit.UI.createElement(
      document, 
      "label",
      {
        id: "add-remove",
        namespace: "xul",
        attributes: {
          value: "+"
        },
        classList: [
          "zotero-clicky",
          "zotero-clicky-plus"
        ]
      }
    )

    let enterEdit = () => {
      let label = box.querySelector("#reference-label")! as XUL.Label
      label.style.display = "none"
      let textarea = ztoolkit.UI.createElement(
        document,
        "textarea",
        {
          id: "reference-edit",
          namespace: "html",
          attributes: {
            flex: "1",
            multiline: "true",
            rows: "4"
          },
          properties: {
            value: addPrefix ? label.innerText.replace(/^\[\d+\]\s+/, "") : label.innerText,
          },
          styles: {
            width: "100%"
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
      ) as HTMLTextAreaElement
      textarea.focus()
      label.parentNode!.insertBefore(textarea, label)
      let exitEdit = async () => {
        // 界面恢复
        let inputText = textarea.value
        if (!inputText) { return }
        label.style.display = ""
        // textbox.style.display = "none"
        textarea.remove()
        // 保存结果
        if (inputText == reference.text) { return }
        label.innerText = `[${refIndex + 1}] ${inputText}`;
        references[refIndex] = {
          ...reference,
          ...{ identifiers: this.utils.getIdentifiers(inputText) },
          ...this.utils.refText2Info(inputText),
          ...{ text: inputText }
        }
        reference = references[refIndex]
        let i = this.utils.searchLibraryItem(reference)
        const key = `References-${node.getAttribute("source")}`
        window.setTimeout(async () => {
          await localStorage.set(item, key, references)
        })
      }

      let id = window.setInterval(async () => {
        let active = rows.querySelector(".active")
        if (active && active != box) {
          await exitEdit()
          window.clearInterval(id)
        }
      }, 100)
    }

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
      ztoolkit.log("removeRelatedItem");
      const popunWin = new ztoolkit.ProgressWindow("Removing Item", {closeTime: -1})
        .createLine({ text: refText, type: "default" })
        .show()
      setState()

      let relatedItem = this.utils.searchRelatedItem(item, reference._item) as Zotero.Item
      if (!relatedItem) {
        popunWin.changeHeadline("Removed");
        (node.querySelector("#refresh-button") as XUL.Button).click()
        popunWin.startCloseTimer(3000)
        return
      }
      relatedItem.removeRelatedItem(item)
      item.removeRelatedItem(relatedItem)
      await item.saveTx()
      await relatedItem.saveTx()
      setState("+")
      popunWin.changeLine({ type: "success" })
      popunWin.startCloseTimer(3000)
    }

    let add = async (collections: undefined | number[] = undefined) => {
      let collapseText = (text: string) => {
        let n
        if (this.utils.isChinese(text)) {
          n = 15
        } else {
          n = 35
        }
        return text.length > n ? (text.slice(0, n) + "...") : text
      }
      let popupWin = (new ztoolkit.ProgressWindow("Searching Item",
        { closeTime: -1, closeOtherProgressWindows: true}))
        .createLine({ text: collapseText(reference.text!), type: "default" })
        .show()
      // 检查本地
      let refItem = reference._item || await this.utils.searchLibraryItem(reference)
      // 禁用按钮
      setState()
      if (refItem) {
        popupWin.changeHeadline("Existing Item")
        popupWin.changeLine({ text: collapseText(refItem.getField("title"))})
      } else {
        let info: ItemBaseInfo = this.utils.refText2Info(reference.text!);
        // 知网
        if (this.utils.isChinese(reference.text!) && Zotero.Jasminum) {
          popupWin.changeHeadline("Creating Item")
          popupWin.changeLine({ text: collapseText(`CNKI: ${info.title}`) })
          try {
            refItem = await this.utils.createItemByJasminum(info.title!)
          } catch (e) { 
            ztoolkit.log(e)
          }
          if (!refItem) {
            popupWin.changeLine({ type: "fail" })
            popupWin.startCloseTimer(3000)
            setState("+")
            return
          }
        }
        // DOI or arXiv
        else {
          // DOI信息补全
          if (Object.keys(reference.identifiers).length == 0) {
            popupWin.changeHeadline("Searching DOI")
            popupWin.changeLine({ text: collapseText(`Title: ${info.title!}`) })
            let DOI = (await this.utils.API.getTitleInfoByConnectedpapers(info.title))?.identifiers.DOI as string
            if (!this.utils.isDOI(DOI)) {
              setState("+");
              popupWin.changeLine({ type: "fail" })
              popupWin.startCloseTimer(3000)
              return
            }
            reference.identifiers = { DOI }
          }
          popupWin.changeHeadline("Creating Item")
          popupWin.changeLine({ text: collapseText(`${Object.keys(reference.identifiers)}: ${Object.values(reference.identifiers)[0]}`) })
          // done
          if (await this.utils.searchRelatedItem(item, refItem)) {
            popupWin.changeHeadline("Added Item")
            popupWin.changeLine({ type: "success" });
            popupWin.startCloseTimer(3000);
            (node.querySelector("#refresh-button") as XUL.Button).click();
            return
          }
          // search DOI in local
          try {
            refItem = await this.utils.createItemByZotero(reference.identifiers, (collections || item.getCollections()))
          } catch (e: any) {
            popupWin.changeLine({ type: "fail" })
            popupWin.startCloseTimer(3000)
            setState("+")
            ztoolkit.log(e)
            return
          }
        }
        for (let collectionID of (collections || item.getCollections())) {
          refItem.addToCollection(collectionID)
          await refItem.saveTx()
        }
      }
      popupWin.changeHeadline("Adding Item")
      popupWin.changeLine({ text: collapseText(refItem.getField("title")) })
      // addRelatedItem
      reference._item = refItem
      item.addRelatedItem(refItem)
      refItem.addRelatedItem(item)
      await item.saveTx()
      await refItem.saveTx()
      // button
      setState("-")
      popupWin.changeLine({ type: "success" })
      popupWin.startCloseTimer(3000)
      updateRowByItem(refItem)
    }

    let updateRowByItem = (refItem: Zotero.Item) => {
      box.style.opacity = "1";
      box.querySelector("img")?.setAttribute("src", refItem.getImageSrc())
      let alreadyRelated = this.utils.searchRelatedItem(item, refItem)
      if (alreadyRelated) {
        setState("-")
      }
    }

    let timer: undefined | number, tipUI: TipUI;
    if (notInLibarayOpacity < 1) {
      window.setTimeout(async () => {
        const refItem = reference._item || await this.utils.searchLibraryItem(reference) as Zotero.Item
        if (refItem) {
          updateRowByItem(refItem)
        }
      }, refIndex * 0)
    }
    // 鼠标进入浮窗展示
    box.addEventListener("mouseenter", () => {
      if (!Zotero.Prefs.get(`${config.addonRef}.isShowTip`)) { return }
      box.classList.add("active")
      let timeout = parseInt(Zotero.Prefs.get(`${config.addonRef}.showTipAfterMillisecond`) as string)
      const position = Zotero.Prefs.get("extensions.zotero.layout", true) == "stacked" ? "top center" : "left"
      timer = window.setTimeout(async () => {
        const winRect: Rect = document.documentElement.getBoundingClientRect()
        const rect = box.getBoundingClientRect()
        rect.x -= 5
        tipUI = this.showTipUI(rect, reference, position, idText)
        if (!box.classList.contains("active")) {
          tipUI.container.style.display = "none"
        }
      }, timeout);
    })

    box.addEventListener("mouseleave", () => {
      box.classList.remove("active")
      window.clearTimeout(timer);
      if (!tipUI) { return }
      const timeout = tipUI.removeTipAfterMillisecond
      tipUI.tipTimer = window.setTimeout(async () => {
        // 监测是否连续一段时间内无active
        for (let i = 0; i < timeout / 2; i++) {
          if (rows.querySelector(".active")) { return }
          await Zotero.Promise.delay(1 / 1000)
        }
        tipUI && tipUI.clear()
      }, timeout / 2)
    })

    label.addEventListener("click", async (event) => {
      event.preventDefault()
      event.stopPropagation()
      const value = label.getAttribute("value")
      if (value == "+") {
        if (event.ctrlKey || event.metaKey) {
          let rect = box.getBoundingClientRect()
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
                  await add([collection.id])
                  event.stopPropagation();
                }
              }
            );
            menuPopup.append(menuItem);
          }
          // @ts-ignore
          menuPopup.openPopupAtScreen(rect.left, rect.top + rect.height, true);
        } else {
          await add()
        }
      } else if (value == "-") {
        await remove()
      }
    })

    const rows = node.querySelector("#related-grid")!

    rows.append(box, label);
    let referenceNum = rows.childNodes.length
    if (addSearch && referenceNum && !node.querySelector("#zotero-reference-search")) { this.addSearch(node) }
    // 高度
    const relatedGrid = node.querySelector("#related-grid") as HTMLDivElement
      relatedGrid.style.maxHeight = `${document.documentElement.getBoundingClientRect().height - relatedGrid.getBoundingClientRect().top
    }px`
    return {box, label}
  }

  public addSearch(node: HTMLDivElement) {
    const searchBoxHeight = 10
    const searchBox = ztoolkit.UI.insertElementBefore({
      tag: "div",
      id: "zotero-reference-search",
      classList: ["reference-search-box"],
      styles: {
        // width: "calc(100% - 35px)",
        height: `${searchBoxHeight}px`,
        padding: "5px",
        borderRadius: "5px",
        border: "1px solid #e0e0e0",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        margin: ".5em 1em",
        opacity: "0.8"
      },
      children: [
        {
          tag: "div",
          styles: {
            width: `${searchBoxHeight}px`,
            height: `${searchBoxHeight}px`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
          properties: {
            innerHTML: `<svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="${searchBoxHeight}" height="${searchBoxHeight}"><path d="M1005.312 914.752l-198.528-198.464A448 448 0 1 0 0 448a448 448 0 0 0 716.288 358.784l198.4 198.4a64 64 0 1 0 90.624-90.432zM448 767.936A320 320 0 1 1 448 128a320 320 0 0 1 0 640z" fill="#5a5a5a"></path></svg>`
          }
        },
        {
          tag: "input",
          styles: {
            outline: "none",
            border: "none",
            width: "100%",
            margin: "0 5px"
          },
          listeners: [
            {
              type: "focus",
              listener: () => {
                searchBox.style.opacity = "1"
                searchBox.style.boxShadow = `0 0 0 1px rgba(0,0,0,0.5)`
              }
            },
            {
              type: "blur",
              listener: () => {
                searchBox.style.opacity = "0.8"
                searchBox.style.boxShadow = ``
              }
            },
            {
              type: "keyup",
              listener: async () => {
                const keyword = inputNode.value as string
                if (keyword.length > 0) {
                  clearNode.style.display = ""
                } else {
                  clearNode.style.display = "none"
                }
                //   let text = (event.target as any).value
                let keywords = keyword.split(/[ ,，]/).filter((e: any) => e)
                ztoolkit.log(keywords)
                node.querySelectorAll("#related-grid *").forEach((e: any) => e.style.display = "")
                if (keywords.length == 0) {
                  return
                }
                node.querySelectorAll("#related-grid .box").forEach((box: any) => {
                  let content = (box.querySelector("#reference-label") as any).textContent
                  let isAllMatched = true;
                  for (let i = 0; i < keywords.length; i++) {
                    isAllMatched = isAllMatched && content.toLowerCase().indexOf(keywords[i].toLowerCase()) >= 0
                  }
                  if (isAllMatched) {
                    ztoolkit.log(content)
                    box.style.display = ""
                    box.nextElementSibling.style.display = ""
                  } else {
                    box.style.display = "none"
                    box.nextElementSibling.style.display = "none"
                  }
                })
              }
            }
          ]
        },
        {
          tag: "div",
          classList: ["icon", "clear"],
          styles: {
            width: `${searchBoxHeight}px`,
            height: `${searchBoxHeight}px`,
            display: "none"
          },
          properties: {
            innerHTML: `<svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="${searchBoxHeight}" height="${searchBoxHeight}"><path d="M512.288 1009.984c-274.912 0-497.76-222.848-497.76-497.76s222.848-497.76 497.76-497.76c274.912 0 497.76 222.848 497.76 497.76s-222.848 497.76-497.76 497.76zM700.288 368.768c12.16-12.16 12.16-31.872 0-44s-31.872-12.16-44.032 0l-154.08 154.08-154.08-154.08c-12.16-12.16-31.872-12.16-44.032 0s-12.16 31.84 0 44l154.08 154.08-154.08 154.08c-12.16 12.16-12.16 31.84 0 44s31.872 12.16 44.032 0l154.08-154.08 154.08 154.08c12.16 12.16 31.872 12.16 44.032 0s12.16-31.872 0-44l-154.08-154.08 154.08-154.08z" fill="#5a5a5a" p-id="5698"></path></svg>`
          },
          listeners: [
            {
              type: "click",
              listener: async () => {
                inputNode.value = ""
                clearNode.style.display = "none"
                node.querySelectorAll("#related-grid *").forEach((e: any) => e.style.display = "")
              }
            }
          ]
        },
      ]
    }, node.querySelector(".grid")!) as HTMLDivElement;
    const inputNode = searchBox.querySelector("input") as HTMLInputElement
    const clearNode = searchBox.querySelector(".clear") as HTMLInputElement
  }
}