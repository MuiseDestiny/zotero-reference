import { Addon } from "./addon";
import AddonModule from "./module";
import { CopyHelper } from "./copy";
const { addonRef } = require("../package.json");

class AddonViews extends AddonModule {
  private progressWindowIcon: object;
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
  }

  public async updateReferencePanel(reader: _ZoteroReader) {
    // reference Zotero-PDF-Translate
    this.debug("updateReferencePanel is called")
    await this.Zotero.uiReadyPromise;

    if (!reader) {
      return false;
    }

    this.debug("ZoteroPDFTranslate: Update Translate Panels");

    const item = this.Zotero.Items.get(reader.itemID) as Zotero.Item;
    this.debug(item.getField("title"));
    await reader._waitForReader();
    this.reader = reader
    await this.buildSideBarPanel();
  }

  async buildSideBarPanel() {
    this.debug("buildSideBarPanel");
    const tabContainer = this.document.querySelector(`#${this.window.Zotero_Tabs.selectedID}-context`);

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
    let getRefData = async (DOI: string) => {
      // request or read data
      let refData
      if (DOI in this.Addon.DOIRefData) {
        refData = this.Addon.DOIRefData[DOI]
      } else {
        try {
          const crossrefApi = `https://api.crossref.org/works/${DOI}/transform/application/vnd.citationstyles.csl+json`
          let res = await this.Zotero.HTTP.request(
            "GET",
            crossrefApi,
            {
              responseType: "json"
            }
          )
          refData = res.response
        } catch {
          return false
        }
      }
      // analysis refData
      return refData.reference
    }

    let getDOIInfo = async (DOI: string) => {
      let data
      if (DOI in this.Addon.DOIData) {
        data = this.Addon.DOIData[DOI]
      } else {
        try {
          const unpaywall = `https://api.unpaywall.org/v2/${DOI}?email=zoterostyle@polygon.org`
          let res = await this.Zotero.HTTP.request(
            "GET",
            unpaywall,
            {
              responseType: "json"
            }
          )
          data = res.response
          this.Addon.DOIData[DOI] = data
        } catch (e) {
          console.log(e)
          return false
        }
      }
      return data
    }
    let itemDOI = item.getField("DOI")
    const title = item.getField("title")

    // clear 
    tabpanel.querySelectorAll("#referenceRows row").forEach(e => e.remove());

    if (!this.Addon.DOIRegex.test(itemDOI)) {
      itemDOI = await getDOIInfo(title)
    }
    // api res
    let refData = await getRefData(itemDOI)
    this.debug(refData)

    const readerDocument = this.reader._iframeWindow.wrappedJSObject.document
    const aNodes = readerDocument.querySelectorAll("a[href*='doi.org']")
    let pdfDOIs = [...aNodes].map((a: HTMLElement) => a.getAttribute("href").match(this.Addon.DOIRegex)[0])
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

    const referenceNum = refData.length
    // add line
    let reference = {}
    refData.forEach(async (data: any, i: number) => {
      let titleName = "article-title"
      let title = data[titleName]
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
          this.debug(`[${i + 1}] 从unpaywall更新条目中...`, DOI);
          // update DOIInfo by unpaywall
          let _data = await getDOIInfo(DOI);
          try {
            author = _data.z_authors[0]["family"]
            year = _data.year
            title = _data.title
            content = `[${i + 1}] ${author} et al., ${year}. ${title}`
          } catch (e) {
            this.debug(_data)
            this.debug(e)
            content = `[${i + 1}] DOI: ${DOI}`
          }
        } else {
          content = `[${i + 1}] ` + (data.unstructured || title || author || year || "unknown");
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
          this.addRow(tabpanel, content, DOI);
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

  public addRow(tabpanel, content, DOI) {
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
    box.addEventListener("click", () => {
      this.showProgressWindow(this.Addon.DOIRegex.test(DOI) ? DOI : "No DOI", content, "success")
      new CopyHelper()
        .addText(content + "\n" + DOI, "text/unicode")
        .copy();
    })

    // check 
    let item = this.getItem()
    let relatedItems = item.relatedItems.map(key => this.Zotero.Items.getByLibraryAndKey(1, key))
    let relatedDOIs = relatedItems.map(item => item.getField("DOI"))
    let relatedTitles = relatedItems.map(item => item.getField("title"))

    let remove = async () => {
      this.debug("removeRelatedItem")
      label.classList.remove("zotero-clicky")
      label.setAttribute("value", "");
      let relatedItems = item.relatedItems.map(key => this.Zotero.Items.getByLibraryAndKey(1, key))
      let relatedItem = relatedItems.filter(item => item.getField("DOI") == DOI || item.getField("title") == DOI)[0]
      relatedItem.removeRelatedItem(item)
      item.removeRelatedItem(relatedItem)
      await item.saveTx()
      await relatedItem.saveTx()
      label.setAttribute("class", "zotero-clicky zotero-clicky-plus");
      label.setAttribute("value", "+");
      this.showProgressWindow("关联移除成功", DOI, "success")
    }
    let add = async () => {
      this.debug("addRelatedItem", DOI)
      // check DOI
      if (!this.Addon.DOIRegex.test(DOI)) {
        this.showProgressWindow("无效的DOI", DOI, "fail")
        return
      }
      this.showProgressWindow("正在关联", DOI, "success")
      label.classList.remove("zotero-clicky")
      label.setAttribute("value", "");
      var translate = new this.Zotero.Translate.Search();
      translate.setIdentifier({ "DOI": DOI });

      let translators = await translate.getTranslators();
      translate.setTranslator(translators);
      try {
        let libraryID = this.window.ZoteroPane.getSelectedLibraryID();
        let collection = this.window.ZoteroPane.getSelectedCollection();
        let collections = collection ? [collection.id] : false;
        let refItem = (await translate.translate({
          libraryID,
          collections,
          saveAttachments: true
        }))[0];
        // addRelatedItem
        this.debug("item.addRelatedItem(refItem)")
        item.addRelatedItem(refItem)
        this.debug("refItem.addRelatedItem(item)")
        refItem.addRelatedItem(item)
        await item.saveTx()
        await refItem.saveTx()
      } catch (e) {
        this.debug(e)
      }
      label.setAttribute("class", "zotero-clicky zotero-clicky-minus");
      label.setAttribute("value", "-");
      this.showProgressWindow("文献关联成功", DOI, "success")
    }
    label = this.document.createElement("label");
    if ([...relatedDOIs, ...relatedTitles].indexOf(DOI) != -1) {
      label.setAttribute("class", "zotero-clicky zotero-clicky-minus");
      label.setAttribute("value", "-");
    } else {
      label.setAttribute("class", "zotero-clicky zotero-clicky-plus");
      label.setAttribute("value", "+");
    }
    label.addEventListener("click", async () => {
      if (label.value == "+") {
        await add()
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
  }

  public showProgressWindow(
    header: string,
    context: string,
    type: string = "default",
    t: number = 5000
  ) {
    // A simple wrapper of the Zotero ProgressWindow
    let progressWindow = new this.Zotero.ProgressWindow({ closeOnClick: true });
    progressWindow.changeHeadline(header);
    progressWindow.progress = new progressWindow.ItemProgress(
      this.progressWindowIcon[type],
      context
    );
    progressWindow.show();
    if (t > 0) {
      progressWindow.startCloseTimer(t);
    }
  }
}

export default AddonViews;
