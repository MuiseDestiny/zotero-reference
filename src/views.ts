import Addon from "./addon";
import AddonModule from "./module";

class AddonViews extends AddonModule {
  private progressWindowIcon: object;
  private progressWindow: any;
  public tabpanel: XUL.Element;
  public reader: _ZoteroReader;
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
    this.Addon.toolkit.Tool.log("Initializing UI");
    let reader = this.Addon.utils.getReader()
    if (reader) {
      this.reader = reader 
      this.buildSideBarPanel()
    }
  }

  public async updateReferencePanel(reader: _ZoteroReader) {
    this.Addon.toolkit.Tool.log("updateReferencePanel is called")
    await Zotero.uiReadyPromise;
    if (!Zotero.ZoteroReference) {
      return this.removeSideBarPanel()
    }

    if (!reader) { return false }
    this.reader = reader
    
    const item = this.getItem()
    this.Addon.toolkit.Tool.log(item.getField("title"));
    await reader._waitForReader();
    await this.buildSideBarPanel();
    this.modifyLink(reader)
    
  }

  public modifyLink(reader) {
    let id = window.setInterval(() => {
      try {
        String(reader._iframeWindow.wrappedJSObject.document)
      } catch {
        window.clearInterval(id)
        return
      }
      reader._iframeWindow.wrappedJSObject.document
        .querySelectorAll("a[href^='#']:not([modify])").forEach(a => {
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

  public removeSideBarPanel() {
    try {
      const tabContainer = document.querySelector(`#${Zotero_Tabs.selectedID}-context`);
      tabContainer.querySelector("#zotero-reference-tab").remove()
      tabContainer.querySelector("#zotero-reference-tabpanel").remove()
    } catch (e) {}
  }

  public getTabContainer() {
    let tabId = Zotero_Tabs.selectedID
    return document.querySelector(`#${tabId}-context`)
  }

  async buildSideBarPanel() {
    this.Addon.toolkit.Tool.log("buildSideBarPanel");
    let tabContainer = this.getTabContainer()
    if (tabContainer.querySelector("#zotero-reference-tab")) {
      return
    }

    // for tab
    let tab = document.createElement("tab");
    tab.setAttribute("id", "zotero-reference-tab");
    tab.setAttribute("label", "参考文献");

    
    let tabbox = tabContainer.querySelector("tabbox")

    const tabs = tabbox.querySelector("tabs") as HTMLElement;
    // tabs.appendChild(tab)
    this.Addon.toolkit.Tool.log(tabs.childNodes[2], tab, tabs.childNodes[2].parentNode)
    this.insertAfter(tab, tabs.childNodes[2]);

    // for panel
    let tabpanel = document.createElement("tabpanel");
    tabpanel.setAttribute("id", "zotero-reference-tabpanel");

    let relatedbox = document.createElement("relatedbox");
    relatedbox.setAttribute("flex", "1");
    relatedbox.setAttribute("class", "zotero-editpane-related");


    let vbox = document.createElement("vbox");
    vbox.setAttribute("class", "zotero-box");
    vbox.setAttribute("flex", "1");
    vbox.style.paddingLeft = "0px";
    vbox.style.paddingRight = "0px";
    

    let hbox = document.createElement("hbox");
    hbox.setAttribute("align", "center");

    let label = document.createElement("label");
    label.setAttribute("id", "referenceNum");
    label.setAttribute("value", "0 条参考文献：");

    let button = document.createElement("button");
    button.setAttribute("id", "refreshButton");
    button.setAttribute("label", "刷新");
    button.addEventListener("click", async () => {
      await this.refreshReference(tabpanel)
    })

    hbox.append(label, button)
    vbox.appendChild(hbox)

    let grid = document.createElement("grid");
    grid.setAttribute("flex", "1");
    let columns = document.createElement("columns");
    let column1 = document.createElement("column");
    column1.setAttribute("flex", "1");
    let column2 = document.createElement("column");
    columns.append(column1, column2);
    let rows = document.createElement("rows");
    rows.setAttribute("id", "referenceRows");
    grid.append(columns, rows)

    vbox.appendChild(grid)

    relatedbox.appendChild(vbox);
    tabpanel.appendChild(relatedbox);

    const tabpanels = tabbox.querySelector("tabpanels") as HTMLElement;
    this.insertAfter(tabpanel, tabpanels.childNodes[2]);
    if (Zotero.Prefs.get(`${this.Addon.addonRef}.autoRefresh`) === true) {
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
        // ZoteroPane.getSelectedItems()[0].getField("itemTypeID")
        this.refreshReference(tabpanel)
      }
    }
  }

  public getItem(): _ZoteroItem {
    return (Zotero.Items.get(this.reader.itemID) as _ZoteroItem).parentItem as _ZoteroItem
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
    tabpanel.querySelector("#referenceNum").setAttribute("value", `${referenceNum} 条参考文献：`);
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
            let _data = await this.Addon.utils.getDOIInfo(DOI);
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
      tabpanel.querySelector("#referenceNum").setAttribute("value", `${Object.keys(reference).length}/${referenceNum} 条参考文献：`);
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
    tabpanel.querySelector("#referenceNum").setAttribute("value", `${referenceNum} 条参考文献：`);
  }

  public addSearch(tabpanel) {
    this.Addon.toolkit.Tool.log("addSearch")
    let textbox = document.createElement("textbox");
    textbox.setAttribute("id", "zotero-reference-search");
    textbox.setAttribute("type", "search");
    textbox.setAttribute("placeholder", "在此输入关键词查询")
    textbox.style.marginBottom = ".5em";
    textbox.addEventListener("input", (event: XUL.XULEvent) => {
      let text = event.target.value
      this.Addon.toolkit.Tool.log(
        `ZoteroReference: source text modified to ${text}`
      );

      let keywords = text.split(/[ ,，]/).filter(e => e)
      if (keywords.length == 0) {
        tabpanel.querySelectorAll("row").forEach((row: XUL.Element) => row.style.display = "")
        return
      }
      tabpanel.querySelectorAll("row").forEach((row: XUL.Element) => {
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
      tabpanel.querySelectorAll("row").forEach((row: XUL.Element) => row.style.display = "")
    }
    tabpanel.querySelector("vbox").insertBefore(
      textbox,
      tabpanel.querySelector("vbox grid")
    )
  }

  public addRow(tabpanel, content, DOI, ref) {
    if ([...tabpanel.querySelectorAll("row label")]
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
      if (event.ctrlKey) {
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

    let timer = null, tipNode
    box.addEventListener("mouseenter", () => {
      if (!Zotero.Prefs.get(`${this.Addon.addonRef}.isShowTip`)) { return }
      box.classList.add("active")
      const unstructured = content.replace(/^\[\d+\]/, "")
      timer = window.setTimeout(async () => {
        let toPlainText = (text) => {
          if (!text) { return "" }
          return text.replace(/<\/?em>/g, "")
        }
        let toTimeInfo = (t) => {
          if (!t) { return undefined }
          let info = (new Date(t)).toString().split(" ")
          return `${info[1]} ${info[3]}`
        }

        tipNode = this.showTip(
          (this.Addon.utils.isDOI(DOI) && DOI) || ref.URL || "Reference",
          "",
          unstructured,
          [],
          box
        )
        // 匹配年份
        let years = unstructured.match(/[^\d](\d{4})[^\d]/)
        let body = {}
        if (years && Number(years[1]) <= (new Date()).getFullYear()) {
          body["startYear"] = years[1];
          body["endYear"] = years[1];
        }
        let data = await this.Addon.utils.getTitleInfo(unstructured, body)
        if (data) {
          let author = (data.authorList || []).slice(0, 3).map(e => toPlainText(e.name)).join(" / ")
          let publish = [data?.primaryVenue, toTimeInfo(data?.publishDate)].filter(e => e).join(" \u00b7 ")
          let tags = (data.venueTags || []).map(text => { return { color: "#59C1BD", text } })
          if (data.citationCount) {tags.push({color: "#1f71e0", text: data.citationCount})}
          tipNode = this.showTip(
            toPlainText(data.title),
            [
              author,
              publish
            ],
            toPlainText(data.summary),
            tags,
            box
          )
        }
      },
      parseInt(Zotero.Prefs.get(`${this.Addon.addonRef}.showTipAfterMillisecond`) as string)
      );
    })

    box.addEventListener("mouseleave", () => {
      box.classList.remove("active")
      window.clearTimeout(timer);
      this.tipTimer = window.setTimeout(() => {
        tipNode && tipNode.remove()
      },
      parseInt(Zotero.Prefs.get(`${this.Addon.addonRef}.removeTipAfterMillisecond`) as string)
      )
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
      this.showProgressWindow("移除关联", DOI)
      setState()

      let relatedItems = item.relatedItems.map(key => Zotero.Items.getByLibraryAndKey(1, key))
      relatedItems = relatedItems.filter(item => item.getField("DOI") == DOI || DOI.includes(item.getField("title")))
      if (relatedItems.length == 0) {
        this.showProgressWindow("已经移除", DOI)
        tabpanel.querySelector("#refreshButton").click()
        return
      }
      for (let relatedItem of relatedItems) {
        relatedItem.removeRelatedItem(item)
        item.removeRelatedItem(relatedItem)
        await item.saveTx()
        await relatedItem.saveTx()
      }

      setState("+")
      this.showProgressWindow("移除成功", DOI, "success")
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
          this.showProgressWindow("已经关联", DOI, "success");
          tabpanel.querySelector("#refreshButton").click()
          return
        }
        this.showProgressWindow("正在关联", DOI)
        setState()
        // search DOI in local
        refItem = await this.Addon.utils.searchItem("DOI", "is", DOI);
        
        if (refItem) {
          source = "已有条目"
          for (let collectionID of (collections || item.getCollections())) {
            refItem.addToCollection(collectionID)
            await refItem.saveTx()
          }
        } else {
          source = "新建条目"
          try {
            refItem = await this.Addon.utils.createItemByZotero(DOI, (collections || item.getCollections()))
          } catch (e) {
            this.showProgressWindow(`与${source}关联失败`, DOI + "\n" + e.toString(), "fail")
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
      this.showProgressWindow(`与${source}关联成功`, DOI, "success")
    }

    label = document.createElement("label");
    // check 
    let item = this.getItem()
    let relatedItems = item.relatedItems.map(key => Zotero.Items.getByLibraryAndKey(1, key))
    let relatedDOIs = relatedItems.map(item => item.getField("DOI"))
    let relatedTitles = relatedItems.map(item => item.getField("title"))
    if (
      [...relatedDOIs, ...relatedTitles].indexOf(DOI) != -1 ||
      relatedTitles.filter(title=>DOI.includes(title)).length > 0
    ) {
      setState("-")
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

    label.addEventListener("click", async (event) => {
      console.log(event)
      if (label.value == "+") {
        if (event.ctrlKey) {
          let collection = ZoteroPane.getSelectedCollection();
          console.log(collection)
          if (collection) {
            this.showProgressWindow("关联至", `${await getCollectionPath(collection.id)}`)
            await add([collection.id])
          } else {
            this.showProgressWindow("失败", "请在主界面选择文件夹后重试")
          }
        } else {
          await add()
        }
      } else if (label.value == "-") {
        await remove()
      }
    })
    row.append(box, label);
    const rows = tabpanel.querySelector("#referenceRows")
    rows.appendChild(row);
    let referenceNum = rows.childNodes.length
    if (referenceNum && !tabpanel.querySelector("#zotero-reference-search")) { this.addSearch(tabpanel) }

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
    this.removeSideBarPanel()
  }

  public _showTip(title, descriptions, content, tags, element) {
    window.clearTimeout(this.tipTimer)
    let tipDiv = document.querySelector(".zotero-reference-tip")
    const winRect = document.querySelector('#main-window').getBoundingClientRect()
    const rect = element.getBoundingClientRect()
    let xmlns = "http://www.w3.org/1999/xhtml"
    let titleSpan, despDiv, contentSpan, tagDiv, oldStyle
    if (!tipDiv) {
      tipDiv = document.createElementNS(xmlns, "div")
      tipDiv.setAttribute("class", "zotero-reference-tip")
      titleSpan = document.createElementNS(xmlns, "span")
      titleSpan.setAttribute("class", "title")
      titleSpan.innerText = title
      titleSpan.style = `
        display: block;
        font-weight: bold;
      `
      despDiv = document.createElementNS(xmlns, "div")
      despDiv.setAttribute("class", "description")
      despDiv.style = `
        margin-bottom: .25em;
      `
      contentSpan = document.createElementNS(xmlns, "span")
      contentSpan.setAttribute("class", "content")
      contentSpan.style = `
        display: block;
        line-height: 1.5em;
        opacity: .73;
        text-align: justify;
      `
  
      tagDiv = document.createElementNS(xmlns, "div")
      tagDiv.setAttribute("class", "tag")
      tagDiv.style = `
        width: 100%;
        margin: .5em 0;
      `
  
      tipDiv.append(
        titleSpan,
        tagDiv,
        despDiv,
        contentSpan
      )
  
      tipDiv.style = `
        position: fixed;
        width: 800px;
        z-index: 999;
        background-color: #f0f0f0;
        padding: .5em;
        border: 2px solid #7a0000;
        -moz-user-select: text;
        transition: top .5s linear, height .5s linear, bottom .5s linear;
      `

      document.querySelector('#main-window').appendChild(tipDiv)
      oldStyle = window.getComputedStyle(tipDiv)
      // tipDiv.addEventListener("mouseenter", (event) => {
      //   window.clearTimeout(this.tipTimer);
      // })

      // tipDiv.addEventListener("mouseleave", (event) => {
      //   this.tipTimer = window.setTimeout(() => {
      //     tipDiv.remove()
      //   }, 500)
      // })

    } else {
      oldStyle = window.getComputedStyle(tipDiv)
      titleSpan = tipDiv.querySelector("span.title")
      despDiv = tipDiv.querySelector("div.description")
      contentSpan = tipDiv.querySelector("span.content")
      tagDiv = tipDiv.querySelector("div.tag")
    }

    // change content
    titleSpan.innerText = title
    contentSpan.innerText = content

    despDiv.childNodes.forEach(e=>e.remove())
    for (let description of descriptions) {
      let despSpan = document.createElementNS(xmlns, "span")
      despSpan.innerText = description
      despSpan.style = `
          display: block;
          line-height: 1.5em;
          opacity: .5;
        `
      despDiv.appendChild(despSpan)
    }

    tagDiv.childNodes.forEach(e=>e.remove())
    for (let tag of tags) {
      let tagSpan = document.createElementNS(xmlns, "span")
      tagSpan.innerText = tag.text
      tagSpan.style = `
          background-color: ${tag.color};
          border-radius: 10px;
          margin-right: 1em;
          padding: 0 8px;
          color: white;
        `
      tagDiv.appendChild(tagSpan)
    }
    

    tipDiv.style.right = `${winRect.width - rect.left + 22}px`
    tipDiv.style.top = oldStyle.offsetTop;
    tipDiv.style.top = `${rect.top}px`

    let boxRect = tipDiv.getBoundingClientRect()
    if (boxRect.bottom >= winRect.height) {
      tipDiv.style.top = ""
      tipDiv.style.bottom = oldStyle.offsetBottom;
      tipDiv.style.bottom = "0px"
    }
    tipDiv.style.height = "";
    let height = window.getComputedStyle(tipDiv).offsetHeight
    tipDiv.style.height = oldStyle.height;
    tipDiv.style.height = height;
    return tipDiv
  }

  public showTip(title, descriptions, content, tags, element) {
    if (!element.classList.contains("active")) { return }
    document.querySelectorAll(".zotero-reference-tip").forEach(e => {
      e.style.opacity = "0"
      window.setTimeout(() => {
        e.remove()
      }, 100); 
    })
    const winRect = document.querySelector('#main-window').getBoundingClientRect()
    const rect = element.getBoundingClientRect()
    let xmlns = "http://www.w3.org/1999/xhtml"
    let div = document.createElementNS(xmlns, "div")
    div.setAttribute("class", "zotero-reference-tip")
    let titleSpan = document.createElementNS(xmlns, "span")
    titleSpan.innerText = title
    titleSpan.style = `
      display: block;
      font-weight: bold;
    `

    let despDiv = document.createElementNS(xmlns, "div")
    despDiv.style = `
      margin-bottom: .25em;
    `
    for (let description of descriptions) {      
      let despSpan = document.createElementNS(xmlns, "span")
      despSpan.innerText = description
      despSpan.style = `
        display: block;
        line-height: 1.5em;
        opacity: .5;
      `
      despDiv.appendChild(despSpan)
    }

    let contentSpan = document.createElementNS(xmlns, "span")
    contentSpan.innerText = content
    contentSpan.style = `
      display: block;
      line-height: 1.5em;
      opacity: .73;
      text-align: justify;
      max-height: 300px;
      overflow-y: auto;
    `

    let tagDiv = document.createElementNS(xmlns, "div")
    tagDiv.style = `
      width: 100%;
      margin: .5em 0;
    `
    for (let tag of tags) {
      let tagSpan = document.createElementNS(xmlns, "span")
      tagSpan.innerText = tag.text
      tagSpan.style = `
        background-color: ${tag.color};
        border-radius: 10px;
        margin-right: 1em;
        padding: 0 8px;
        color: white;
      `
      tagDiv.appendChild(tagSpan)
    }

    div.append(
      titleSpan,
      tagDiv,
      despDiv,
      contentSpan
    )
    // bottom: ${winRect.height - rect.bottom}px;

    div.style = `
      position: fixed;
      right: ${winRect.width - rect.left + 22}px;
      top: ${rect.top}px;
      width: 800px;
      z-index: 999;
      background-color: #f0f0f0;
      padding: .5em;
      border: 2px solid #7a0000;
      -moz-user-select: text;
      transition: opacity .1s linear;
      opacity: 0;
    `
    document.querySelector('#main-window').appendChild(div)

    let boxRect = div.getBoundingClientRect()
    if (boxRect.bottom >= winRect.height) {
      div.style.top = ""
      div.style.bottom = "0px"
    }
    div.style.opacity = "1";

    ;[titleSpan, contentSpan].forEach(node => {
      node.addEventListener("click", async (event) => {
        if (event.ctrlKey && Zotero.Prefs.get(`${this.Addon.addonRef}.ctrlClickTranslate`)) {
          let sourceText = node.getAttribute("sourceText")
          let translatedText = node.getAttribute("translatedText")
          console.log(sourceText, translatedText)
          if (!sourceText) {
            sourceText = node.innerText;
            node.setAttribute("sourceText", sourceText)
          }
          if (!translatedText) {
            Zotero.ZoteroPDFTranslate._sourceText = sourceText
            const success = await Zotero.ZoteroPDFTranslate.translate.getTranslation()
            if (!success) {
              Zotero.ZoteroPDFTranslate.view.showProgressWindow(
                "Translate Failed",
                success,
                "fail"
              );
              return
            }
            translatedText = Zotero.ZoteroPDFTranslate._translatedText;
            node.setAttribute("translatedText", translatedText)
          }

          if (node.innerText == sourceText) {
            console.log("-> translatedText")
            node.innerText = translatedText
          } else if (node.innerText == translatedText) {
            node.innerText = sourceText
            console.log("-> sourceText")
          }
        }
      })
    })
    div.addEventListener("DOMMouseScroll", (event) => {
      if (!event.ctrlKey) { return }
      let scale = div.style.transform.match(/scale\((.+)\)/)
      scale = scale ? parseFloat(scale[1]) : 1
      let minScale = 1, maxScale = 1.7, step = 0.05
      if (div.style.bottom == "0px") {
        div.style.transformOrigin = "center bottom"
      } else {
        div.style.transformOrigin = "center center"
      }
      if (event.detail > 0) {
        // 缩小
        scale = scale - step
        div.style.transform = `scale(${scale < minScale ? 1 : scale})`;
      } else {
        // 放大
        scale = scale + step
        div.style.transform = `scale(${scale > maxScale ? maxScale : scale})`;
      }
    })
    div.addEventListener("mouseenter", (event) => {
      window.clearTimeout(this.tipTimer);
    })
    div.addEventListener("mouseleave", (event) => {
      this.tipTimer = window.setTimeout(() => {
        div.remove()
      },
      parseInt(Zotero.Prefs.get(`${this.Addon.addonRef}.removeTipAfterMillisecond`) as string)
      )
    })
    
    return div
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
