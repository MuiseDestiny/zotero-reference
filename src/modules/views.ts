import { config } from "../../package.json";
import { getString, initLocale } from "../modules/locale";
import TipUI from "./tip";
import Utils from "./utils";
import LocalStorge from "E:/Github/zotero-style/src/modules/localStorage";
const localStorage = new LocalStorge(config.addonRef);

export default class Views {
  public utils!: Utils;
  private iconStyles = {
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
  };
  constructor() {
    initLocale();
    this.utils = new Utils()
  }

  /**
   * 注册阅读侧边栏
   */
  public async onInit() {
    ztoolkit.ReaderTabPanel.register(
      getString("tabpanel.reader.tab.label"),
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
        const relatedbox = ztoolkit.UI.createElement(
          document,
          "relatedbox",
          {
            id,
            classList: ["zotero-editpane-related"],
            namespace: "xul",
            ignoreIfExists: true,
            attributes: {
              flex: "1",
            },
            children: [
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
                children: [
                  {
                    tag: "hbox",
                    namespace: "xul",
                    attributes: {
                      align: "center"
                    },
                    children: [
                      {
                        tag: "label",
                        namespace: "xul",
                        id: "referenceNum",
                        attributes: {
                          value: `0 ${getString("relatedbox.number.label")}`
                        },
                        listeners: [
                          {
                            type: "dblclick",
                            listener: () => {
                              ztoolkit.log("dblclick: Copy all references")
                              let textArray: string[] = []
                              let labels = relatedbox.querySelectorAll("rows row box label")
                              labels.forEach((e: any) => {
                                textArray.push(e.value)
                              });
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
                        namespace: "xul",
                        id: "refresh-button",
                        attributes: {
                          label: getString("relatedbox.refresh.label")
                        },
                        listeners: [
                          {
                            type: "mousedown",
                            listener: (event: any) => {
                              timer = window.setTimeout(async () => {
                                timer = undefined
                                // 不从本地储存读取
                                await this.refreshReferences(panel, false, event.ctrlKey)
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
                                await this.refreshReferences(panel, true, event.ctrlKey)
                              }
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
                    children: [
                      {
                        tag: "columns",
                        namespace: "xul",
                        children: [
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
        );
        panel.append(relatedbox);
        // 修改链接
        window.setTimeout(async () => {
          await this.pdfLinks(reader, panel)
        })
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
        // 推荐关联
        window.setTimeout(async () => {
          await this.registerSplitButtons(reader);
        })
      },
      {
        targetIndex: (Zotero.ZoteroPDFTranslate || Zotero.PDFTranslate) ? 3 : undefined,
        tabId: "zotero-reference",
      }
    )
  }

  private async registerSplitButtons(reader: _ZoteroTypes.ReaderInstance) {
    let _window: any
    // @ts-ignore
    while (!(_window = reader?._iframeWindow?.wrappedJSObject)) {
      console.log("wait...")
      await Zotero.Promise.delay(10)
    }
    const parent = _window.document.querySelector("#toolbarViewerLeft")!
    const ref = parent.querySelector("#pageNumber") as HTMLDivElement
    const styles = {
      backgroundSize: "16px 16px",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      width: "32px"
    }
    ztoolkit.UI.insertElementBefore({
      tag: "div",
      classList: ["splitToolbarButton"],
      children: [
        {
          tag: "button",
          id: "split-horizontally",
          classList: ["toolbarButton"],
          styles: {
            backgroundImage: `url(chrome://${config.addonRef}/content/icons/horizontally.png)`,
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
          id: "split-vertically",
          classList: ["toolbarButton"],
          styles: {
            backgroundImage: `url(chrome://${config.addonRef}/content/icons/vertically.png)`,
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
  }
  /**
   * 刷新推荐相关
   * @param array 
   * @param node 
   * @returns 
   */
  public refreshRelated(array: ItemBaseInfo[], node: XUL.Element) {
    let totalNum = 0
    ztoolkit.log("refreshRelated", array)
    array.forEach((info: ItemBaseInfo, i: number) => {
      let row = this.addRow(node, array, i, false, false) as XUL.Element
      if (!row) { return }
      row.classList.add("only-title")
      totalNum += 1;
      let box = row.querySelector("box") as XUL.Box
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
      .querySelector("tabpanel:nth-child(3) relatedbox")! as any
    do {
      await Zotero.Promise.delay(50);
    }
    while (!relatedbox.querySelector('#relatedRows'));
    
    let node = relatedbox.querySelector('#relatedRows')!.parentNode as XUL.Element
    // 已经刷新过
    if (node.querySelector(".zotero-clicky-plus")) { return }
    console.log("getDOIRelatedArray")
    let _relatedArray = (await this.utils.API.getDOIRelatedArray(itemDOI)) as ItemBaseInfo[] || []
    let func = relatedbox.refresh
    relatedbox.refresh = () => {
      func.call(relatedbox)
      // #42，为Zotero相关条目添加悬浮提示
      // 把Zotero条目转化为Reference可识别形式
      node.querySelectorAll("rows row").forEach(e => e.remove())
      console.log(_relatedArray)
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
      console.log(relatedArray)
      this.refreshRelated(relatedArray, node)
      node.querySelectorAll("box image.zotero-box-icon")
        .forEach((e: any) => {
          let label = ztoolkit.UI.createElement(
            document,
            "label",
            {
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

  public async pdfLinks(reader: _ZoteroTypes.ReaderInstance, panel: XUL.TabPanel) {
    let _pdfDocument: any, _window: any
    // @ts-ignore
    while (!((_window = reader?._iframeWindow?.wrappedJSObject) && (_pdfDocument = _window.PDFViewerApplication?.pdfDocument))) {
      await Zotero.Promise.delay(10)
    }
    let refKeys: any = []
    let dests: any
    window.setTimeout(async () => {
      dests = await _pdfDocument._transport.getDestinations()
      // 分析href与参考文献对应
      // 统计与参考文献数量一致的引文
      const statistics: any = {}
      Object.keys(dests).forEach(key => {
        let _key = key.replace(/\d/g, "")
        statistics[_key] ??= 0
        statistics[_key] += 1
      })
      // const totalNum = 36
      // let refKey = Object.keys(statistics).find(k => statistics[k] == totalNum)
      // 用最大值概率最大，但是有一定风险
      let refKey = Object.keys(statistics).sort((k1, k2) => statistics[k2]- statistics[k1])[0]
      Object.keys(dests).forEach(key => {
        if (key.replace(/\d/g, "") == refKey) {
          refKeys.push(key)
        }
      })
      // 根据匹配数字排序
      refKeys = refKeys.sort((k1: string, k2: string) => {
        let n1 = Number(k1.match(/\d+/)![0])
        let n2 = Number(k2.match(/\d+/)![0])
        return n1 - n2
      })
    })
    let id = window.setInterval(async () => {
      try {
        _window.document
      } catch {
        window.clearInterval(id)
        return await this.pdfLinks(reader, panel)
      }
      _window.document
        .querySelectorAll(`.annotationLayer a[href^='#']:not([${config.addonRef}])`).forEach(async (a: any) => {
          const isClickLink = Zotero.Prefs.get(`${config.addonRef}.clickLink`) as boolean
          let _a: any = a
          if (isClickLink) {
            _a = a.cloneNode(true)
            _a.setAttribute(config.addonRef, "")
            a.parentNode.appendChild(_a)
            a.remove()
            _a.addEventListener("click", async (event: MouseEvent) => {
              event.preventDefault()
              let href = _a.getAttribute("href")
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
              let dest = unescape(href.slice(1))
              try {
                dest = JSON.parse(dest)
              } catch { }
              // 有报错，#39 
              _window.secondViewIframeWindow.eval(`PDFViewerApplication
                .pdfViewer.linkService.goToDestination(${JSON.stringify(dest)})`)

            })
          }
          
          let timer: undefined | number
          const isHoverLink = Zotero.Prefs.get(`${config.addonRef}.hoverLink`)
          if (isHoverLink) {
            _a.addEventListener("mouseenter", async (event: MouseEvent) => {
              console.log(
                refKeys,
                dests
              )
              let refKey = (unescape(_a.href as string)).split("#").slice(-1)[0]
              let refIndex
              if ((refIndex = refKeys.indexOf(refKey))) {
                let row = panel.querySelector(`#referenceRows row:nth-child(${refIndex+1})`)
                // @ts-ignore
                let reference = row?.reference
                if (reference) {
                  timer = window.setTimeout(() => {
                    timer = undefined
                    let rect = _a.getBoundingClientRect()
                    rect.y = rect.y + 20;
                    const tipUI = this.showTipUI(
                      rect,
                      reference,
                      "top center"
                    )
                  }, 1000)
                }
              }
            })
            _a.addEventListener("mouseleave", async () => {
              if (timer) {
                window.clearTimeout(timer)
                timer = undefined
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
    let label = panel.querySelector("label#referenceNum") as XUL.Label;
    label.value = `${0} ${getString("relatedbox.number.label")}`;
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
    panel.querySelectorAll("#referenceRows row").forEach(e => e.remove());
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

    references.forEach((reference: ItemBaseInfo, refIndex: number) => {
      let row = this.addRow(panel, references, refIndex)!;
      // @ts-ignore
      row.reference = reference
      label.value = `${refIndex + 1}/${referenceNum} ${getString("relatedbox.number.label")}`;
    })

    label.value = `${referenceNum} ${getString("relatedbox.number.label")}`;
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
    ztoolkit.log("prefIndex", prefIndex)
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
            info.authors.slice(0, 3).join(" / "),
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

  public addRow(node: XUL.Element, references: ItemBaseInfo[], refIndex: number, addPrefix: boolean = true, addSearch: boolean = true) {
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
      [...node.querySelectorAll("row label")].find((e: any) => toText(e.value) == toText(refText))
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
    const row = ztoolkit.UI.createElement(
      document,
      "row",
      {
        namespace: "xul",
        children: [
          {
            tag: "box",
            id: "reference-box",
            namespace: "xul",
            styles: {
              opacity: String(notInLibarayOpacity)
            },
            classList: ["zotero-clicky"],
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
                  if (event.ctrlKey) {
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
                      const popupWin = (new ztoolkit.ProgressWindow("Searching URL", {closeTime: -1}))
                        .createLine({ text: `Title: ${reference.title}`, type: "default"})
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
                      (new ztoolkit.ProgressWindow("Launching URL", {closeOtherProgressWindows: true}))
                        .createLine({ text: URL, type: "default"})
                        .show()
                      Zotero.launchURL(URL);
                    }
                  } else {
                    if (rows.querySelector("#reference-edit")) {return}
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
            children: [
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
                        editTimer = undefined
                        enterEdit()
                      }, 500);
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
              value: "+"
            },
            classList: [
              "zotero-clicky",
              "zotero-clicky-plus"
            ]
          }
        ]
      }
    ) as XUL.Element

    let enterEdit = () => {
      let box = row.querySelector("#reference-box")! as XUL.Label
      let label = row.querySelector("#reference-label")! as XUL.Label
      label.style.display = "none"
      let textbox = ztoolkit.UI.createElement(
        document,
        "textbox",
        {
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
      label.parentNode!.insertBefore(textbox, label)

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
        references[refIndex] = {
          ...reference,
          ...{ identifiers: this.utils.getIdentifiers(inputText) },
          ...this.utils.refText2Info(inputText),
          ...{ text: inputText }
        }
        reference = references[refIndex]
        window.alert("搜索修改")
        let i = this.utils.searchLibraryItem(reference)
        window.alert(i.key)
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

    const label = row.querySelector("label#add-remove")! as XUL.Label
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
            console.log(e)
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
      }
      popupWin.changeHeadline("Adding Item")
      popupWin.changeLine({ text: collapseText(refItem.getField("title")) })

      for (let collectionID of (collections || item.getCollections())) {
        refItem.addToCollection(collectionID)
        await refItem.saveTx()
      }
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
      return row
    }

    let getCollectionPath = async (id: number) => {
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

    let updateRowByItem = (refItem: Zotero.Item) => {
      box.style.opacity = "1";
      (row.querySelector("#item-type-icon") as XUL.Label).style.backgroundImage =
        `url(chrome://zotero/skin/treeitem-${refItem.itemType}@2x.png)`
      let alreadyRelated = this.utils.searchRelatedItem(item, refItem)
      if (alreadyRelated) {
        setState("-")
      }
    }
    let timer: undefined | number, tipUI: TipUI;
    const box = row.querySelector("#reference-box") as XUL.Box
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
        rect.x -= winRect.width * .014
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
      if (label.value == "+") {
        if (event.ctrlKey) {
          let rect = box.getBoundingClientRect()
          // 构建分类选择
          let menuPopup = document.createElement('menupopup') as XUL.MenuPopup;
          menuPopup.setAttribute('id', 'zotero-item-addTo-menu');
          document.documentElement.appendChild(menuPopup);
          let collections = Zotero.Collections.getByLibrary(1);
          console.log(collections)
          for (let col of collections) {
            let menuItem = Zotero.Utilities.Internal.createMenuForTarget(
              col,
              menuPopup,
              null,
              async (event: any, collection: any) => {
                if (event.target.tagName == 'menuitem') {
                  // @ts-ignore
                  menuPopup.openPopup(null, null, event.clientX, event.clientY);
                  ztoolkit.log(collection)
                  await add([collection.id])
                  menuPopup.remove()
                  event.stopPropagation();
                }
              }
            );
            menuPopup.append(menuItem);
          }
          // @ts-ignore
          menuPopup.openPopup(null, null, rect.left, rect.top + rect.height);
          // // @ts-ignore
          // menuPopup.openPopup(null, null, event.clientX, event.clientY);
          // let collection = ZoteroPane.getSelectedCollection();
          // ztoolkit.log(collection)
          // if (collection) {
          //   await add([collection.id])
          // } else {
          //   (new ztoolkit.ProgressWindow("Error"))
          //     .createLine({ text: "Please select your coolection and retry", type: "fail" })
          //     .show()
          // }
        } else {
          await add()
        }
      } else if (label.value == "-") {
        await remove()
      }
    })

    row.append(box, label);
    const rows = node.querySelector("rows[id$=Rows]")!

    rows.appendChild(row);
    let referenceNum = rows.childNodes.length
    if (addSearch && referenceNum && !node.querySelector("#zotero-reference-search")) { this.addSearch(node) }
    return row
  }

  public addSearch(node: XUL.Element) {
    ztoolkit.log("addSearch")
    let textbox = ztoolkit.UI.createElement(document, "textbox", {
      namespace: "xul",
      id: "zotero-reference-search",
      attributes: {
        type: "search",
        placeholder: getString("relatedbox.search.placeholder")
      },
      styles: {
        marginBottom: ".5em",
      }
    })

    textbox.addEventListener("input", (event: any) => {
      let text = (event.target as any).value
      ztoolkit.log(
        `ZoteroReference: source text modified to ${text}`
      );

      let keywords = text.split(/[ ,，]/).filter((e: any) => e)
      if (keywords.length == 0) {
        node.querySelectorAll("row").forEach((row: any) => row.style.display = "")
        return
      }
      node.querySelectorAll("row").forEach((row: any) => {
        let content = (row.querySelector("#reference-label") as any).value
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
    // @ts-ignore
    textbox._clearSearch = () => {
      textbox.value = "";
      node.querySelectorAll("row").forEach((row: any) => row.style.display = "")
    }
    node.querySelector("vbox")!.insertBefore(
      textbox,
      node.querySelector("vbox grid")
    )
  }
}