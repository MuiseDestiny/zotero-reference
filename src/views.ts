import { Addon } from "./addon";
import AddonModule from "./module";
import { CopyHelper } from "./copy";
const { addonRef } = require("../package.json");

class AddonViews extends AddonModule {
  private progressWindowIcon: object;
  private progressWindow: any;
  public tabpanel: XUL.Element;
  public reader: _ZoteroReader;

  constructor(parent: Addon) {
    console.log("AddonViews constructor")
    super(parent);
    this.progressWindowIcon = {
      success: "chrome://zotero/skin/tick.png",
      fail: "chrome://zotero/skin/cross.png",
      default: `chrome://${addonRef}/skin/favicon.png`,
    };
  }

  public initViews() {
    this.debug("Initializing UI");
    let reader = this.Addon.utils.getReader()
    if (reader) {
      this.reader = reader
      this.buildSideBarPanel()
    }
  }

  public async updateReferencePanel(reader: _ZoteroReader) {
    // reference Zotero-PDF-Translate
    this.debug("updateReferencePanel is called")
    await this.Zotero.uiReadyPromise;
    if (!this.Zotero.ZoteroReference) {
      return this.removeSideBarPanel()
    }
    if (!reader) { return false }

    const item = this.Zotero.Items.get(reader.itemID) as Zotero.Item;
    this.debug(item.getField("title"));
    await reader._waitForReader();
    this.reader = reader
    await this.buildSideBarPanel();
  }

  public removeSideBarPanel() {
    try {
      const tabContainer = this.document.querySelector(`#${this.window.Zotero_Tabs.selectedID}-context`);
      tabContainer.querySelector("#zotero-reference-tab").remove()
      tabContainer.querySelector("#zotero-reference-tabpanel").remove()
    } catch (e) {}
  }

  public getTabContainer() {
    let tabId = this.window.Zotero_Tabs.selectedID
    return this.document.querySelector(`#${tabId}-context`)
  }

  async buildSideBarPanel() {
    this.debug("buildSideBarPanel");
    let tabContainer = this.getTabContainer()
    if (tabContainer.querySelector("#zotero-reference-tab")) {
      return
    }

    // for tab
    let tab = this.document.createElement("tab");
    tab.setAttribute("id", "zotero-reference-tab");
    tab.setAttribute("label", "参考文献");

    
    let tabbox = tabContainer.querySelector("tabbox")

    const tabs = tabbox.querySelector("tabs") as HTMLElement;
    // tabs.appendChild(tab)
    this.debug(tabs.childNodes[2], tab, tabs.childNodes[2].parentNode)
    this.insertAfter(tab, tabs.childNodes[2]);

    // for panel
    let tabpanel = this.document.createElement("tabpanel");
    tabpanel.setAttribute("id", "zotero-reference-tabpanel");

    let relatedbox = this.document.createElement("relatedbox");
    relatedbox.setAttribute("flex", "1");
    relatedbox.setAttribute("class", "zotero-editpane-related");


    let vbox = this.document.createElement("vbox");
    vbox.setAttribute("class", "zotero-box");
    vbox.setAttribute("flex", "1");
    vbox.style.paddingLeft = "0px";
    vbox.style.paddingRight = "0px";
    

    let hbox = this.document.createElement("hbox");
    hbox.setAttribute("align", "center");

    let label = this.document.createElement("label");
    label.setAttribute("id", "referenceNum");
    label.setAttribute("value", "0 条参考文献：");

    let button = this.document.createElement("button");
    button.setAttribute("id", "refreshButton");
    button.setAttribute("label", "刷新");
    button.addEventListener("click", async () => {
      await this.refreshReference(tabpanel, this.getItem())
    })

    hbox.append(label, button)
    vbox.appendChild(hbox)

    let grid = this.document.createElement("grid");
    grid.setAttribute("flex", "1");
    let columns = this.document.createElement("columns");
    let column1 = this.document.createElement("column");
    column1.setAttribute("flex", "1");
    let column2 = this.document.createElement("column");
    columns.append(column1, column2);
    let rows = this.document.createElement("rows");
    rows.setAttribute("id", "referenceRows");
    grid.append(columns, rows)

    vbox.appendChild(grid)

    relatedbox.appendChild(vbox);
    tabpanel.appendChild(relatedbox);

    const tabpanels = tabbox.querySelector("tabpanels") as HTMLElement;
    this.insertAfter(tabpanel, tabpanels.childNodes[2]);
    this.refreshReference(tabpanel, this.getItem())

  }

  public getItem(): _ZoteroItem {
    return this.Zotero.Items.get(this.reader.itemID).parentItem as _ZoteroItem
  }

  public async refreshReference(tabpanel, item) {
    tabpanel.classList.toggle("PDF")

    let itemDOI = item.getField("DOI")
    const itemTitle = item.getField("title")

    // clear 
    tabpanel.querySelectorAll("#referenceRows row").forEach(e => e.remove());
    let refData
    if (this.Addon.utils.isChinese(itemTitle) && !itemDOI) {
      let cnkiURL = item.getField("url")
      if (!cnkiURL) {
        let creator = item._creators[0]
        let itemAuthor = creator.lastName + creator.firstName
        cnkiURL = await this.Addon.utils.getCnkiURL(itemTitle, itemAuthor)
        item.setField("url", cnkiURL)
        await item.saveTx()
      }
      refData = await this.Addon.utils.getRefDataFromCNKI(cnkiURL)
    } else {
      if (!itemDOI || !this.Addon.utils.isDOI(itemDOI)) {
        itemDOI = await this.Addon.utils.getTitleDOI(itemTitle)
      }
      refData = await this.Addon.utils.getRefDataFromCrossref(itemDOI)
    }
    const referenceNum = refData.length
    tabpanel.querySelector("#referenceNum").setAttribute("value", `${referenceNum} 条参考文献：`);
    this.debug(refData)
    const readerDocument = this.reader._iframeWindow.wrappedJSObject.document
    const aNodes = readerDocument.querySelectorAll("a[href*='doi.org']")
    let pdfDOIs = [...aNodes].map((e: HTMLElement) => e.getAttribute("href").match(this.Addon.DOIRegex)[0])
    pdfDOIs = [...(new Set(pdfDOIs))]
    this.debug(pdfDOIs)
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
          this.debug(`[${i + 1}] getDOIInfo更新条目中...`, DOI);
          // update DOIInfo by unpaywall
          let _data = await this.Addon.utils.getDOIInfo(DOI);
          try {
            author = _data.author
            year = _data.year
            title = _data.title
            content = `[${i + 1}] ${author} et al., ${year}. ${title}`
          } catch (e) {
            this.debug(_data)
            this.debug(e)
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
          await this.Zotero.Promise.delay(100);
        }
      }
    }
    tabpanel.querySelector("#referenceNum").setAttribute("value", `${referenceNum} 条参考文献：`);
  }

  public addSearch(tabpanel) {
    this.debug("addSearch")
    let textbox = this.document.createElement("textbox");
    textbox.setAttribute("id", "zotero-reference-search");
    textbox.setAttribute("type", "search");
    textbox.setAttribute("placeholder", "在此输入关键词查询")
    textbox.style.marginBottom = ".5em";
    textbox.addEventListener("input", (event: XUL.XULEvent) => {
      let text = event.target.value
      this.debug(
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
    let row = this.document.createElement("row");
    let box = this.document.createElement("box");
    box.setAttribute("class", "zotero-clicky");
    let image = this.document.createElement("image");
    image.setAttribute("class", "zotero-box-icon");
    image.setAttribute("src", "chrome://zotero/skin/treeitem-journalArticle@2x.png");

    let label = this.document.createElement("label");
    label.setAttribute("class", "zotero-box-label");
    label.setAttribute("value", content);
    label.setAttribute("DOI", DOI);
    label.setAttribute("crop", "end");
    label.setAttribute("flex", "1");
    box.append(image, label);
    const headLine = (this.Addon.utils.isDOI(DOI) && DOI) || ref.URL || "Reference"
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
          this.Zotero.launchURL(URL);
        }
      } else {
        let [title, _] = this.Addon.utils.parseContent(content)
        this.showProgressWindow(headLine, "复制成功", "success")
        new CopyHelper()
          .addText(content + (content == DOI ? "" : "\n" + DOI), "text/unicode")
          .copy();
      }
    })

    let timer = null
    box.addEventListener("mouseenter", () => {
      timer = this.window.setTimeout(() => {
        this.showTip(headLine, content, box)
      }, 100);
    })

    box.addEventListener("mouseleave", () => {
      this.window.clearTimeout(timer)
      this.document.querySelectorAll(".zotero-reference-tip").forEach(e=>e.remove())
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
      this.debug("removeRelatedItem")
      this.showProgressWindow("移除关联", DOI)
      setState()

      let relatedItems = item.relatedItems.map(key => this.Zotero.Items.getByLibraryAndKey(1, key))
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
    
    let add = async (collections: number[] = []) => {
      this.debug("addRelatedItem", content, DOI)
      // check DOI
      let refItem, source
      let [title, author] = this.Addon.utils.parseContent(content);
      setState()
      // CNKI
      if (this.Addon.utils.isChinese(title) && this.Zotero.Jasminum) {
        this.showProgressWindow("CNKI", DOI)

        // search DOI in local
        refItem = await this.Addon.utils.searchItem("title", "contains", title)
        
        if (refItem) {
          source = "已有条目"
        } else {
          refItem = await this.Addon.utils.createItemByJasminum(title, author)
          source = "CNKI文献"
        }
        this.debug("addToCollection")
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
            this.debug("error DOI", DOI)
            return
          }
        }
        // done
        let reltaedDOIs = item.relatedItems.map(key => this.Zotero.Items.getByLibraryAndKey(1, key).getField("DOI"))
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
            this.debug(e)
            return
          }
        }
      }
      // addRelatedItem
      this.debug("addRelatedItem")
      item.addRelatedItem(refItem)
      refItem.addRelatedItem(item)
      await item.saveTx()
      await refItem.saveTx()
      // button
      setState("-")
      this.showProgressWindow(`与${source}关联成功`, DOI, "success")
    }

    label = this.document.createElement("label");
    // check 
    let item = this.getItem()
    let relatedItems = item.relatedItems.map(key => this.Zotero.Items.getByLibraryAndKey(1, key))
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
        let collection = await this.Zotero.Collections.getAsync(id)
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
          let collection = this.window.ZoteroPane.getSelectedCollection();
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
    this.debug("nextSibling", _node.nextSibling)
    if (_node.nextSibling) {
      this.debug("insert After")
      _node.parentNode.insertBefore(node, _node.nextSibling);
    } else {
      _node.parentNode.appendChild(node);
    }
  }

  public unInitViews() {
    this.removeSideBarPanel()
  }

  public showTip(title, content, element) {
    const winRect = this.document.querySelector('#main-window').getBoundingClientRect()
    const rect = element.getBoundingClientRect()
    let xmlns = "http://www.w3.org/1999/xhtml"
    let div = this.document.createElementNS(xmlns, "div")
    div.setAttribute("class", "zotero-reference-tip")
    let titleSpan = this.document.createElementNS(xmlns, "span")
    titleSpan.innerText = title
    titleSpan.style = `
      display: block;
      font-weight: bold;
      margin-bottom: .5em;
    `
    let contentSpan = this.document.createElementNS(xmlns, "span")
    contentSpan.innerText = content
    contentSpan.style = `
      line-height: 1.5em;
      opacity: .73;
    `
    div.append(
      titleSpan,
      contentSpan
    )
    // bottom: ${winRect.height - rect.bottom}px;

    div.style = `
      position: fixed;
      right: ${winRect.width - rect.left + 22}px;
      top: ${rect.top}px;
      width: 600px;
      z-index: 999;
      background-color: #f0f0f0;
      padding: .5em;
      border: 2px solid #7a0000;
    `
    this.document.querySelector('#main-window').appendChild(div)

    let boxRect = div.getBoundingClientRect()
    console.log(boxRect, winRect)
    if (boxRect.bottom >= winRect.height) {
      div.style.top = ""
      div.style.bottom = `${winRect.height - rect.bottom}px`
    }
  }

  public showProgressWindow(
    header: string,
    context: string,
    type: string = "default",
    t: number = 2500,
    maxLength: number = 100
  ) {
    console.log(arguments)
    // if (this.progressWindow && ) {
    //   this.progressWindow.close();
    // }
    let progressWindow = new this.Zotero.ProgressWindow({ closeOnClick: true });
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
  }
}

export default AddonViews;
