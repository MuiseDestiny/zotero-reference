import Addon from "./addon";
import AddonModule from "./module";
import Locale from "./locale";
const lang = Services.locale.getRequestedLocale().split("-")[0];

class AddonViews extends AddonModule {
  private progressWindowIcon: object;
  private progressWindow: any;
  public tabpanel: XUL.Element;
  public reader: _ZoteroReaderInstance;
  public tipTimer: number | null;
  constructor(parent: Addon) {
    console.log("AddonViews constructor")
    super(parent);
    this.progressWindowIcon = {
      success: "chrome://zotero/skin/tick.png",
      fail: "chrome://zotero/skin/cross.png",
      default: `chrome://${this.Addon.addonRef}/skin/favicon.png`,
    };
  } 

  public initViews() {
    let reader = this.Addon.utils.getReader()
    if (!reader) { return }
    this.buildTabPanel()
  }

  public async updateReferencePanel(reader: _ZoteroReaderInstance) {
    this.Addon.toolkit.Tool.log("updateReferencePanel is called")
    await Zotero.uiReadyPromise;
    if (!Zotero.ZoteroReference) {
      return this.removeTabPanel()
    }

    if (!reader) { return false }
    this.reader = reader

    const item = this.getItem()
    this.Addon.toolkit.Tool.log(item.getField("title"));
    await reader._waitForReader();

    const tabpanel = await this.buildTabPanel();

    // after building UI
    if (Zotero.Prefs.get(`${this.Addon.addonRef}.autoRefresh`) === true) {
      this.autoRefresh(tabpanel)
    }
    if (Zotero.Prefs.get(`${this.Addon.addonRef}.loadingRelated`)) {
      await this.loadingRelated();
    }
    if (Zotero.Prefs.get(`${this.Addon.addonRef}.modifyLinks`)) {
      this.modifyLinks(reader)
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
  //                             this.Addon.toolkit.Tool.getCopyHelper()
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
  //                             await this.refreshReference(panel)
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
  //               this.getItem().getField("itemTypeID")
  //             )
  //           ) != -1
  //         if (!isExclude) {
  //           this.refreshReference(panel)
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
    let _notAutoRefreshItemTypes = Zotero.Prefs.get(`${this.Addon.addonRef}.notAutoRefreshItemTypes`) as string
    let notAutoRefreshItemTypes = _notAutoRefreshItemTypes.split(/,\s*/g)
    console.log(_notAutoRefreshItemTypes, notAutoRefreshItemTypes)
    const isExclude = notAutoRefreshItemTypes
      .indexOf(
        Zotero.ItemTypes.getName(
          this.getItem().getField("itemTypeID")
        )
      ) != -1
    if (!isExclude) {
      this.refreshReference(tabpanel)
    }
  }

  public modifyLinks(reader) {
    let id = window.setInterval(() => {
      try {
        String(reader._iframeWindow.wrappedJSObject.document)
      } catch {
        window.clearInterval(id)
        return
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
              await Zotero.Promise.delay(500)
            }
            reader._iframeWindow.wrappedJSObject.secondViewIframeWindow.PDFViewerApplication
              .pdfViewer.linkService.goToDestination(unescape(href.slice(1)))
          })
        })
    }, 100)
  }

  public removeTabPanel() {
    try {
      const tabContainer = document.querySelector(`#${Zotero_Tabs.selectedID}-context`);
      tabContainer.querySelector("#zotero-reference-tab").remove()
      tabContainer.querySelector("#zotero-reference-tabpanel").remove()
    } catch (e) { }
  }

  public getTabContainer() {
    let tabId = Zotero_Tabs.selectedID
    return document.querySelector(`#${tabId}-context`)
  }

  public buildTabPanel() {
    this.Addon.toolkit.Tool.log("buildTabPanel");
    let tabContainer = this.getTabContainer()
    if (tabContainer && tabContainer.querySelector("#zotero-reference-tab")) {
      return
    }

    // for tab
    let tab = document.createElement("tab");
    tab.setAttribute("id", "zotero-reference-tab");
    tab.setAttribute("label", Locale[lang].tabLabel);

    let tabbox = tabContainer.querySelector("tabbox")

    const tabs = tabbox.querySelector("tabs") as HTMLElement;

    this.insertAfter(tab, tabs.childNodes[2]);

    // for panel
    let tabpanel = document.createElement("tabpanel");
    tabpanel.setAttribute("id", "zotero-reference-tabpanel");
    const relatedbox = this.Addon.toolkit.UI.creatElementsFromJSON(
      window.document,
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
                          let labels = relatedbox.querySelectorAll("rows row box label")
                          labels.forEach((e: XUL.Label) => {
                            textArray.push(e.value)
                          })
                          this.showProgressWindow("Reference", "Copy all references", "success")
                          this.Addon.toolkit.Tool.getCopyHelper()
                            .addText(textArray.join("\n"), "text/unicode")
                            .copy();
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
                          await this.refreshReference(tabpanel)
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
    );

    tabpanel.appendChild(relatedbox);

    const tabpanels = tabbox.querySelector("tabpanels") as HTMLElement;
    this.insertAfter(tabpanel, tabpanels.childNodes[2]);

    return tabpanel
  }

  async loadingRelated() {
    this.Addon.toolkit.Tool.log("loadingRelated");
    let item = this.getItem()
    let itemDOI = item.getField("DOI")
    if (!itemDOI || !this.Addon.utils.isDOI(itemDOI)) {
      this.Addon.toolkit.Tool.log("Not DOI", itemDOI);
      return
    }
    let tabContainer = this.getTabContainer()
    let relatedbox = tabContainer.querySelector("tabpanel:nth-child(3) relatedbox")
    do {
      await Zotero.Promise.delay(50);
    }
    while (!relatedbox.querySelector('#relatedRows'));

    let node = relatedbox.querySelector('#relatedRows').parentNode
    console.log("node", node)
    let data = await this.Addon.utils.getDOIRelated(itemDOI)
    let func = relatedbox.refresh
    relatedbox.refresh = () => {
      func.call(relatedbox)
      this.refreshRelated(data, node)
    }
    relatedbox.refresh()
  }

  public refreshRelated(data, node) {
    let totalNum = 0
    data.forEach(article => {
      console.log(article)
      let DOI = article.doi
      article.DOI = DOI
      article.URL = `http://doi.org/${DOI}`
      let title = this.Addon.utils.Html2Text(article.title)
      // TODO: 对于在文献库中的予以特殊显示
      let row = this.addRow(node, title, DOI, article, false, true)
      if (!row) { return }
      row.classList.add("only-title")
      totalNum += 1
      window.setTimeout(async () => {
        let item = await this.Addon.utils.searchItem("DOI", "is", DOI);
        if (!item) {
          row.querySelector("box").style.opacity = ".5"
        }
      }, 0)
    })
    return totalNum
  }

  public async refreshReference(tabpanel) {
    let source = tabpanel.getAttribute("source")
    if (source) {
      if (source == "PDF") {
        tabpanel.setAttribute("source", "URL")
      }
      if (source == "URL") {
        tabpanel.setAttribute("source", "PDF")
      }
    } else {
      tabpanel.setAttribute("source", Zotero.Prefs.get(`${this.Addon.addonRef}.prioritySource`))
    }

    // clear 
    tabpanel.querySelectorAll("#referenceRows row").forEach(e => e.remove());
    tabpanel.querySelectorAll("#zotero-reference-search").forEach(e => e.remove());

    let refData
    if (tabpanel.getAttribute("source") == "PDF") {
      refData = await this.Addon.utils.getRefDataFromPDF()
    } else {
      refData = await this.Addon.utils.getRefDataFromURL()
    }

    const referenceNum = refData.length
    tabpanel.querySelector("#referenceNum").setAttribute("value", `${referenceNum} ${Locale[lang].referenceNumLabel}`);
    this.Addon.toolkit.Tool.log(refData)
    const readerDocument = this.reader._iframeWindow.wrappedJSObject.document
    const aNodes = readerDocument.querySelectorAll("a[href*='doi.org']")
    let pdfDOIs = [...aNodes].map((e: HTMLElement) => e.getAttribute("href").match(this.Addon.DOIRegex)[0])
    pdfDOIs = [...(new Set(pdfDOIs))]
    this.Addon.toolkit.Tool.log(pdfDOIs)
    // find DOI in pdf
    let searchDOI = (i) => {
      const readerDocument = this.reader._iframeWindow.wrappedJSObject.document
      const aNodes = readerDocument.querySelectorAll("a[href^='https://doi.org/']")
      let pdfDOIs = [...aNodes].map((a: HTMLElement) => a.getAttribute("href").match(this.Addon.DOIRegex)[0])
      pdfDOIs = [...(new Set(pdfDOIs))]

      for (let j = 0; j < pdfDOIs.length; j++) {
        let isMatch = false
        // up
        for (let offset = 1; offset <= j && offset <= i; offset++) {
          if (refData[i - offset].DOI) {
            if (refData[i - offset].DOI == pdfDOIs[j - offset]) {
              isMatch = true
            } else {
              isMatch = false
            }
            break
          }
        }
        // down
        for (let offset = 1; j + offset < pdfDOIs.length && i + offset < refData.length; offset++) {
          if (refData[i + offset].DOI) {
            if (refData[i + offset].DOI == pdfDOIs[j + offset]) {
              isMatch = true
            } else {
              isMatch = false
            }
            break
          }
        }

        if (isMatch) {
          return pdfDOIs[j];
        }
      }
      return undefined

    }

    // add line
    let reference = {}
    refData.forEach(async (data: any, i: number) => {
      let title = data["article-title"]
      let year = data.year
      let author = data.author

      let DOI = data.DOI || searchDOI(i)
      let content
      if (author && year && title) {
        content = `[${i + 1}] ${author} et al., ${year}. ${title}`
      } else if (data.unstructured) {
        data.unstructured = data.unstructured.replace(/<\/?br>/g, "").replace(/\n/g, " ")
        content = `[${i + 1}] ${data.unstructured}`
      } else {
        if (DOI) {
          // update DOIInfo by unpaywall
          try {
            let _data = await this.Addon.utils.getDOIBaseInfo(DOI);
            author = _data.author
            year = _data.year
            title = _data.title
            content = `[${i + 1}] ${author} et al., ${year}. ${title}`
          } catch (e) {
            this.Addon.toolkit.Tool.log(e)
            content = `[${i + 1}] DOI: ${DOI}`
          }
        } else {
          content = `[${i + 1}] ` + (data.unstructured || title || data["journal-title"] || author || year || "unknown");
        }
      }
      DOI = DOI || content;
      reference[i] = [content, DOI];
      tabpanel.querySelector("#referenceNum").setAttribute("value", `${Object.keys(reference).length}/${referenceNum} ${Locale[lang].referenceNumLabel}`);
    })
    for (let i = 0; i < referenceNum; i++) {
      while (true) {
        if (i in reference) {
          let [content, DOI] = reference[i];
          this.addRow(tabpanel, content, DOI, refData[i]);
          break;
        } else {
          await Zotero.Promise.delay(100);
        }
      }
    }
    tabpanel.querySelector("#referenceNum").setAttribute("value", `${referenceNum} ${Locale[lang].referenceNumLabel}`);
  }

  public addSearch(node) {
    this.Addon.toolkit.Tool.log("addSearch")
    let textbox = document.createElement("textbox");
    textbox.setAttribute("id", "zotero-reference-search");
    textbox.setAttribute("type", "search");
    textbox.setAttribute("placeholder", Locale[lang].searchBoxTip)
    textbox.style.marginBottom = ".5em";
    textbox.addEventListener("input", (event: XUL.XULEvent) => {
      let text = event.target.value
      this.Addon.toolkit.Tool.log(
        `ZoteroReference: source text modified to ${text}`
      );

      let keywords = text.split(/[ ,，]/).filter(e => e)
      if (keywords.length == 0) {
        node.querySelectorAll("row").forEach((row: XUL.Element) => row.style.display = "")
        return
      }
      node.querySelectorAll("row").forEach((row: XUL.Element) => {
        let content = (row.querySelector("label") as XUL.Element).value as String
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

  public addRow(node, content, DOI, ref, addSearch: boolean = true, skipRelated: boolean = false) {
    // 避免重复添加
    if ([...node.querySelectorAll("row label")]
      .filter(e => e.value == content)
      .length > 0) { return }
    let row = document.createElement("row");
    let box = document.createElement("box");
    box.setAttribute("class", "zotero-clicky");
    let image = document.createElement("image");
    image.setAttribute("class", "zotero-box-icon");
    image.setAttribute("src", "chrome://zotero/skin/treeitem-journalArticle@2x.png");

    let label = document.createElement("label");
    label.setAttribute("class", "zotero-box-label");
    label.setAttribute("value", content);
    label.setAttribute("DOI", DOI);
    label.setAttribute("crop", "end");
    label.setAttribute("flex", "1");
    box.append(image, label);
    box.addEventListener("click", async (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.ctrlKey) {
        console.log(ref.DOI)
        let URL = ref.URL || (ref.DOI && `https://doi.org/${ref.DOI}`)
        if (!URL) {
          let [title, author] = this.Addon.utils.parseContent(content)
          if (this.Addon.utils.isChinese(content)) {
            URL = await this.Addon.utils.getCnkiURL(title, author)
          } else {
            DOI = await this.Addon.utils.getTitleDOIByCrossref(ref.unstructured)
            ref["DOI"] = DOI
            URL = `https://doi.org/${DOI}`
          }
        }
        this.showProgressWindow("Open", URL)
        if (URL) {
          Zotero.launchURL(URL);
        }
      } else {
        this.showProgressWindow("Reference", content, "default", 2500, -1)
        this.Addon.toolkit.Tool.getCopyHelper()
          .addText(content + (content == DOI ? "" : "\n" + DOI), "text/unicode")
          .copy();
      }
    })

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
      this.Addon.toolkit.Tool.log("removeRelatedItem")
      this.showProgressWindow("Removing", DOI)
      setState()

      let relatedItems = item.relatedItems.map(key => Zotero.Items.getByLibraryAndKey(1, key))
      relatedItems = relatedItems.filter(item => item.getField("DOI") == DOI || DOI.includes(item.getField("title")))
      if (relatedItems.length == 0) {
        this.showProgressWindow("Removed", DOI)
        node.querySelector("#refreshButton").click()
        return
      }
      for (let relatedItem of relatedItems) {
        relatedItem.removeRelatedItem(item)
        item.removeRelatedItem(relatedItem)
        await item.saveTx()
        await relatedItem.saveTx()
      }

      setState("+")
      this.showProgressWindow("Removed", DOI, "success")
    }

    let add = async (collections: undefined | number[] = undefined) => {
      this.Addon.toolkit.Tool.log("addRelatedItem", content, DOI)
      // check DOI
      let refItem, source
      let [title, author] = this.Addon.utils.parseContent(content);
      setState()
      // CNKI
      if (this.Addon.utils.isChinese(title) && Zotero.Jasminum) {
        this.showProgressWindow("CNKI", DOI)

        // search DOI in local
        refItem = await this.Addon.utils.searchItem("title", "contains", title)

        if (refItem) {
          source = "已有条目"
        } else {
          refItem = await this.Addon.utils.createItemByJasminum(title, author)
          source = "CNKI文献"
        }
        this.Addon.toolkit.Tool.log("addToCollection")
        for (let collectionID of (collections || item.getCollections())) {
          refItem.addToCollection(collectionID)
          await refItem.saveTx()
        }
      }
      // DOI
      else {
        if (!this.Addon.utils.isDOI(DOI)) {
          DOI = await this.Addon.utils.getTitleDOI(title)
          if (!this.Addon.utils.isDOI(DOI)) {
            setState("+")
            this.Addon.toolkit.Tool.log("error DOI", DOI)
            return
          }
        }
        // done
        let reltaedDOIs = item.relatedItems.map(key => Zotero.Items.getByLibraryAndKey(1, key).getField("DOI"))
        if (reltaedDOIs.indexOf(DOI) != -1) {
          this.showProgressWindow("Added", DOI, "success");
          node.querySelector("#refreshButton").click()
          return
        }
        this.showProgressWindow("Adding", DOI)
        setState()
        // search DOI in local
        refItem = await this.Addon.utils.searchItem("DOI", "is", DOI);

        if (refItem) {
          source = "Local Item"
          for (let collectionID of (collections || item.getCollections())) {
            refItem.addToCollection(collectionID)
            await refItem.saveTx()
          }
        } else {
          source = "Created Item"
          try {
            refItem = await this.Addon.utils.createItemByZotero(DOI, (collections || item.getCollections()))
          } catch (e) {
            this.showProgressWindow(`Add ${source}`, DOI + "\n" + e.toString(), "fail")
            setState("+")
            this.Addon.toolkit.Tool.log(e)
            return
          }
        }
      }
      // addRelatedItem
      this.Addon.toolkit.Tool.log("addRelatedItem")
      item.addRelatedItem(refItem)
      refItem.addRelatedItem(item)
      await item.saveTx()
      await refItem.saveTx()
      // button
      setState("-")
      this.showProgressWindow(`Added with ${source}`, DOI, "success")
    }

    label = document.createElement("label");
    // check 
    let item = this.getItem()
    let relatedItems = item.relatedItems.map(key => Zotero.Items.getByLibraryAndKey(1, key))
    let relatedDOIs = relatedItems.map(item => item.getField("DOI"))
    let relatedTitles = relatedItems.map(item => item.getField("title"))
    if (
      [...relatedDOIs, ...relatedTitles].indexOf(DOI) != -1 ||
      relatedTitles.filter(title => DOI.includes(title)).length > 0
    ) {
      setState("-")
      if (skipRelated) { return }
    } else {
      setState("+")
    }

    let getCollectionPath = async (id) => {
      let path = []
      while (true) {
        let collection = await Zotero.Collections.getAsync(id)
        path.push(collection._name)
        if (collection._parentID) {
          id = collection._parentID
        } else {
          break
        }
      }
      console.log(path)
      return path.reverse().join("/")
    }

    let timer = null, tipNode
    box.addEventListener("mouseenter", () => {
      if (!Zotero.Prefs.get(`${this.Addon.addonRef}.isShowTip`)) { return }
      box.classList.add("active")
      const unstructured = content.replace(/^\[\d+\]/, "")
      let timeout = parseInt(Zotero.Prefs.get(`${this.Addon.addonRef}.showTipAfterMillisecond`) as string)
      timer = window.setTimeout(async () => {
        let toTimeInfo = (t) => {
          if (!t) { return undefined }
          let info = (new Date(t)).toString().split(" ")
          return `${info[1]} ${info[3]}`
        }

        tipNode = this.showTip(
          (this.Addon.utils.isDOI(DOI) && DOI) || ref.URL || "Reference",
          [],
          [],
          unstructured,
          box
        )
        let data
        let arXivId = this.Addon.utils.matchArXivId(unstructured)
        if (arXivId) {
          // 如果标注arXiv，优先在arXiv上搜索信息
          data = await this.Addon.utils.getArXivInfo(arXivId)
        } else if (this.Addon.utils.isDOI(ref.DOI) || this.Addon.utils.isDOI(DOI)) {
          data = await this.Addon.utils.getDOIInfo(ref.DOI || DOI)
        } else {
          // 没有则在readpaper匹配信息
          // 匹配年份
          let body = {}
          if (!row.classList.contains("only-title")) {
            let years = unstructured.match(/[^\d](\d{4})[^\d]/)
            if (years && Number(years[1]) <= (new Date()).getFullYear() && Number(years[1]) > 1900) {
              body["startYear"] = years[1];
              body["endYear"] = years[1];
            }
          }
          data = await this.Addon.utils.getTitleInfo(unstructured, body)
        }
        const sourceConfig = {
          arXiv: { color: "#b31b1b", tip: "arXiv is a free distribution service and an open-access archive for 2,186,475 scholarly articles in the fields of physics, mathematics, computer science, quantitative biology, quantitative finance, statistics, electrical engineering and systems science, and economics. Materials on this site are not peer-reviewed by arXiv."},
          readpaper: { color: "#1f71e0", tip: "论文阅读平台ReadPaper共收录近2亿篇论文、2.7亿位作者、近3万所高校及研究机构，几乎涵盖了全人类所有学科。科研工作离不开论文的帮助，如何读懂论文，读好论文，这本身就是一个很大的命题，我们的使命是：“让天下没有难读的论文”" },
          semanticscholar: { color: "#1857b6", tip: "Semantic Scholar is an artificial intelligence–powered research tool for scientific literature developed at the Allen Institute for AI and publicly released in November 2015. It uses advances in natural language processing to provide summaries for scholarly papers. The Semantic Scholar team is actively researching the use of artificial-intelligence in natural language processing, machine learning, Human-Computer interaction, and information retrieval."}
        }
        if (data) {
          let author = (data.authorList || []).slice(0, 3).map(e => this.Addon.utils.Html2Text(e.name)).join(" / ")
          let publish = [this.Addon.utils.Html2Text(data?.primaryVenue), toTimeInfo(data?.publishDate) || data.year].filter(e => e).join(" \u00b7 ")
          let tags = (data.venueTags || []).map(text => { return { color: "#59C1BD", text } })
          if (data.citationCount) { tags.push({ color: "#1f71e0", text: data.citationCount }) }
          if (data.source) { tags.push({ text: data.source, ...sourceConfig[data.source] }) }
          if (this.Addon.utils.isDOI(ref.DOI)) {
            tags.push({ text: "DOI", color: "#fcb426", tip: ref.DOI, link: `http://doi.org/${ref.DOI}` })
          }
          tipNode = this.showTip(
            this.Addon.utils.Html2Text(data.title),
            tags,
            [
              author,
              publish
            ],
            this.Addon.utils.Html2Text(data.summary),
            box
          )
        }
      }, timeout);
    })

    box.addEventListener("mouseleave", () => {
      box.classList.remove("active")
      window.clearTimeout(timer);
      let timeout = parseInt(Zotero.Prefs.get(`${this.Addon.addonRef}.removeTipAfterMillisecond`) as string)
      this.tipTimer = window.setTimeout(async () => {
        // 监测是否连续一段时间内无active
        for (let i = 0; i < timeout / 2; i++) {
          if (rows.querySelector(".active")) { return }
          await Zotero.Promise.delay(1/1000)
        }
        tipNode && tipNode.remove()
      }, timeout / 2)
    })

    label.addEventListener("click", async (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (label.value == "+") {
        if (event.ctrlKey) {
          let collection = ZoteroPane.getSelectedCollection();
          console.log(collection)
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
    // const rows = node.querySelector("#referenceRows")
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

  public getItem(): _ZoteroItem {
    return (Zotero.Items.get(this.reader.itemID) as _ZoteroItem).parentItem as _ZoteroItem
  }

  public unInitViews() {
    this.removeTabPanel()

  }

  public showTip(title, tags: { text: string, color: string, tip?: string, link?: string}[], descriptions: string[], content: string, element: HTMLElement) {
    if (!element.classList.contains("active")) { return }
    let shadeMillisecond = parseInt(Zotero.Prefs.get(`${this.Addon.addonRef}.shadeMillisecond`) as string)
    document.querySelectorAll(".zotero-reference-tip").forEach(e => {
      e.style.opacity = "0"
      window.setTimeout(() => {
        e.remove()
      }, shadeMillisecond);
    })
    const winRect = document.querySelector('#main-window').getBoundingClientRect()
    const rect = element.getBoundingClientRect()

    const ZoteroPDFTranslate = Zotero.ZoteroPDFTranslate
    const addonRef = this.Addon.addonRef
    let translateNode = async function(event) {
      if (event.ctrlKey && Zotero.Prefs.get(`${addonRef}.ctrlClickTranslate`)) {
        let sourceText = this.getAttribute("sourceText")
        let translatedText = this.getAttribute("translatedText")
        console.log(sourceText, translatedText)
        if (!sourceText) {
          sourceText = this.innerText;
          this.setAttribute("sourceText", sourceText)
        }
        if (!translatedText) {
          ZoteroPDFTranslate._sourceText = sourceText
          const success = await ZoteroPDFTranslate.translate.getTranslation()
          if (!success) {
            ZoteroPDFTranslate.view.showProgressWindow(
              "Translate Failed",
              success,
              "fail"
            );
            return
          }
          translatedText = ZoteroPDFTranslate._translatedText;
          this.setAttribute("translatedText", translatedText)
        }

        if (this.innerText == sourceText) {
          console.log("-> translatedText")
          this.innerText = translatedText
        } else if (this.innerText == translatedText) {
          this.innerText = sourceText
          console.log("-> sourceText")
        }
      }
    }

    let copyNodeText = function () {
      Zotero.ZoteroReference.toolkit.Tool.getCopyHelper().addText(this.innerText, "text/unicode").copy();
      Zotero.ZoteroReference.views.showProgressWindow("Copy", this.innerText, "success")
    }

    let transformNode = function(event) {
      if (!event.ctrlKey) { return }
      let _scale = tipNode.style.transform.match(/scale\((.+)\)/)
      let scale = _scale ? parseFloat(_scale[1]) : 1
      let minScale = 1, maxScale = 1.7, step = 0.05
      if (tipNode.style.bottom == "0px") {
        tipNode.style.transformOrigin = "center bottom"
      } else {
        tipNode.style.transformOrigin = "center center"
      }
      if (event.detail > 0) {
        // 缩小
        scale = scale - step
        tipNode.style.transform = `scale(${scale < minScale ? 1 : scale})`;
      } else {
        // 放大
        scale = scale + step
        tipNode.style.transform = `scale(${scale > maxScale ? maxScale : scale})`;
      }
    }

    const tipNode = this.Addon.toolkit.UI.creatElementsFromJSON(
      document,
      {
        tag: "div",
        classList: ["zotero-reference-tip"],
        styles: {
          position: "fixed",
          width: "800px",
          right: `${winRect.width - rect.left + 22}px`,
          top: `${rect.top}px`,
          zIndex: "999",
          "-moz-user-select": "text",
          border: "2px solid #7a0000",
          padding: ".5em",
          backgroundColor: "#f0f0f0",
          transition: `opacity ${shadeMillisecond / 1000}s linear`,
        },
        listeners: [
          {
            type: "DOMMouseScroll",
            listener: transformNode
          },
          {
            type: "mouseenter",
            listener: () => {
              window.clearTimeout(this.tipTimer);
            }
          },
          {
            type: "mouseleave",
            listener: () => {
              let timeout = parseInt(Zotero.Prefs.get(`${this.Addon.addonRef}.removeTipAfterMillisecond`) as string)
              this.tipTimer = window.setTimeout(() => {
                tipNode.remove()
              }, timeout)
            }
          }
        ],
        subElementOptions: [
          {
            tag: "span",
            classList: ["title"],
            styles: {
              display: "block",
              fontWeight: "bold",
            },
            directAttributes: {
              innerText: title
            },
            listeners: [
              {
                type: "click",
                listener: translateNode
              }
            ]
          },
          ...(tags && tags.length > 0 ? [{
            tag: "div",
            id: "tags",
            styles: {
              width: "100%",
              margin: "0.5em 0px",
            },
            subElementOptions: (function (tags) {
              if (!tags) { return []}
              let arr = []
              for (let tag of tags) {
                console.log(tag)
                arr.push({
                  tag: "span",
                  directAttributes: {
                    innerText: tag.text
                  },
                  styles: {
                    backgroundColor: tag.color,
                    borderRadius: "10px",
                    marginRight: "1em",
                    padding: "0 8px",
                    color: "white",
                    cursor: "pointer",
                    userSelect: "none"
                  },
                  listeners: [
                    {
                      type: "click",
                      listener: function(){
                        if (tag.link) {
                          Zotero.launchURL(tag.link);
                        } else {
                          copyNodeText.bind(this)()
                        }
                      }
                    },
                    {
                      type: "mouseenter",
                      listener: () => {
                        if (!tag.tip) { return }
                        Zotero.ZoteroReference.views.showProgressWindow("Reference", tag.tip, "default", -1, -1)
                      }
                    },
                    {
                      type: "mouseleave",
                      listener: () => {
                        if (!tag.tip) { return }
                        Zotero.ZoteroReference.views.progressWindow.close();
                      }
                    }
                  ]
                })
              }
              return arr
            })(tags) as any
          }] : []),
          ...(descriptions && descriptions.length > 0 ? [{
            tag: "div",
            id: "descriptions",
            styles: {
              marginBottom: "0.25em"
            },
            subElementOptions: (function (descriptions) {
              if (!descriptions) { return [] }
              let arr = [];
              for (let text of descriptions) {
                console.log(text)
                arr.push({
                  tag: "span",
                  id: "content",
                  styles: {
                    display: "block",
                    lineHeight: "1.5em",
                    opacity: "0.5",
                    cursor: "pointer",
                    userSelect: "none"
                  },
                  directAttributes: {
                    innerText: text
                  },
                  listeners: [
                    {
                      type: "click",
                      listener: copyNodeText
                    }
                  ]
                })
              }
              return arr
            })(descriptions) as any
          }] : []),
          {
            tag: "span",
            id: "content",
            directAttributes: {
              innerText: content
            },
            styles: {
              display: "block",
              lineHeight: "1.5em",
              textAlign: "justify",
              opacity: "0.8",
              maxHeight: "300px",
              overflowY: "auto"
            },
            listeners: [
              {
                type: "click",
                listener: translateNode
              }
            ]
          }
        ]
      }
    ) as HTMLDivElement

    document.querySelector('#main-window').appendChild(tipNode)

    let boxRect = tipNode.getBoundingClientRect()
    if (boxRect.bottom >= winRect.height) {
      tipNode.style.top = ""
      tipNode.style.bottom = "0px"
    }
    tipNode.style.opacity = "1";
    return tipNode
  }

  public showProgressWindow(
    header: string,
    context: string,
    type: string = "default",
    t: number = 5000,
    maxLength: number = 100
  ) {
    console.log(arguments)
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
