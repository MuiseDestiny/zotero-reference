import API from "./api"
import PDF from "./pdf";


class Utils {
  API: API;
  PDF: PDF;
  private cache: {[key: string]: any} = {};
  public regex = {
    DOI: /10\.\d{4,9}\/[-\._;\(\)\/:A-z0-9><]+[^\.\]]/,
    arXiv: /arXiv[\.:](\d+\.\d+)/,
    URL: /https?:\/\/[^\s\.]+/
  }
  constructor() {
    this.API = new API(this);
    this.PDF = new PDF(this);
  }

  public getIdentifiers(text: string): ItemBaseInfo["identifiers"] {
    const targets = [
      {
        key: "DOI",
        ignoreSpace: true,
        regex: this.regex.DOI
      },
      {
        key: "arXiv",
        ignoreSpace: true,
        regex: this.regex.arXiv
      }
    ]
    let identifiers: any = {}
    for (let target of targets) {
      let res = (
        target.ignoreSpace ? text.replace(/\s+/g, "") : text
      ).match(target.regex)
      if (res) {
        identifiers[target.key] = res.slice(-1)[0]
      }
    }
    return identifiers
  }

  private extractURL(text: string) {
    let res = text.match(this.regex.URL)
    if (res) {
      return res.slice(-1)[0]
    }
  }

  public parseRefText(text: string): { year: string, authors: string[], title: string } {
    // 匹配年份
    let year 
    let _years = text.match(/[^\d]?(\d{4})[^\d]?/g) as string[]
    if (_years) {
      let years = _years
        .map(year => Number(year.match(/\d{4}/)![0]))
        .filter(year => year > 1900 && year < (new Date()).getFullYear())
      if (years.length > 0) { year = String(years[0]) }
    }
    year = year as string
    if (this.isChinese(text)) {
      // extract author and title
      // [1] 张 宁, 张 雨青, 吴 坎坎. 信任的心理和神经生理机制. 2011, 1137-1143.
      // [1] 中央环保督察视角下的城市群高质量发展研究——以成渝城市群为例[J].李毅.  环境生态学.2022(04) 
      let parts = text
        .replace(/\[.+?\]/g, "")
        .replace(/\s+/g, " ")
        .split(/[\.,\uff0c\uff0e\uff3b\[\]]/) // \uff0c: ，\uff0e: ．
        .map(e => e.trim())
        .filter(e => e)
      let authors = []
      let titles = []
      for (let part of parts) {
        if (part.length <= 3 && part.length >= 2) {
          authors.push(part);
        } else {
          titles.push(part);
        }
      }
      let title = titles.sort((a, b) => b.length - a.length)[0]
      ztoolkit.log(text, "\n->\n", title, authors)
      return { title, authors, year }
    } else {
      let authors: string[] = []
      text = text.replace(/[\u4e00-\u9fa5]/g, "")
      const authorRegexs = [/[A-Za-z,\.\s]+?\.?[\.,;]/g, /[A-Z][a-z]+ et al.,/]
      authorRegexs.forEach(regex => {
        text.match(regex)?.forEach(author => {
          authors.push(author.slice(0, -1))
        })
      })
      let title = text
        .split(/[,\.]\s/g)
        .filter((e: string) => !e.includes("http"))
        .sort((a, b) => b.length - a.length)[0]
      return { title, authors, year }
    }
  }

  public identifiers2URL(identifiers: ItemBaseInfo["identifiers"]) {
    let url
    if (identifiers.DOI) {
      url = `https://doi.org/${identifiers.DOI}`
    }
    if (identifiers.arXiv) {
      url = `https://arxiv.org/abs/${identifiers.arXiv}`
    }
    return url
  }

  public refText2Info(text: string): ItemBaseInfo {
    let identifiers = this.getIdentifiers(text)
    return {
      identifiers: identifiers,
      url: this.extractURL(text) || this.identifiers2URL(identifiers),
      ...this.parseRefText(text),
      type: (identifiers.arXiv ? "preprint" : "journalArticle")
    }

  }

  public parseCNKIURL(cnkiURL: string) {
    let FileName = cnkiURL.match(/FileName=(\w+)/i)![1]
    let DbName = cnkiURL.match(/DbName=(\w+)/i)![1]
    let DbCode = cnkiURL.match(/DbCode=(\w+)/i)![1]
    return { FileName, DbName, DbCode }
  }

  async createItemByZotero(identifiers: ItemBaseInfo["identifiers"], collections: number[]) {
    var translate = new Zotero.Translate.Search();
    translate.setIdentifier(identifiers);

    let translators = await translate.getTranslators();
    translate.setTranslator(translators);
    let libraryID = ZoteroPane.getSelectedLibraryID();

    return (await translate.translate({
      libraryID,
      collections,
      saveAttachments: true
    }))[0]
  }

  async createItemByJasminum(title: string, author: string) {
    let cnkiURL = await this.API.getCNKIURL(title, author)
    // Jasminum
    let articleId = Zotero.Jasminum.Scrape.getIDFromURL(cnkiURL);
    let postData = Zotero.Jasminum.Scrape.createRefPostData([articleId])
    let data = await Zotero.Jasminum.Scrape.getRefText(postData)

    let items = await Zotero.Jasminum.Utils.trans2Items(data, 1);
    if (items) {
      let item = items[0]
      item.setField("url", cnkiURL)
      await item.saveTx()
      return item
    }
  }

  private async searchItem(condition: string, operator: Zotero.Search.Operator, value: string) {
    if (!value) { return }
    let s = new Zotero.Search;
    s.addCondition(condition, operator, value);
    var ids = await s.search();
    let items = await Zotero.Items.getAsync(ids);
    if (items) {
      return items[0]
    }
  }

  public searchRelatedItem(item: Zotero.Item, reference: ItemBaseInfo): Zotero.Item | undefined | boolean {
    if (!item) { return false }
    let relatedItems = item.relatedItems.map(key => Zotero.Items.getByLibraryAndKey(1, key) as Zotero.Item)
    let relatedItem = relatedItems.find((item: Zotero.Item) => {
      let flag = (
        reference.identifiers && (
          item.getField("DOI") == reference.identifiers.DOI ||
          (item.getField("url") as string).includes(reference.identifiers.arXiv as string)
        ) ||
        item.getField("title") == reference?.title
      )
      return flag
    })
    return relatedItem
  }

  public async searchLibraryItem(info: ItemBaseInfo): Promise<Zotero.Item | undefined> {
    const key = JSON.stringify(info)
    if (key in this.cache) {
      return this.cache[key]
    } else {
      let item = (
        await this.searchItem("title", "contains", info.title!) ||
        await this.searchItem("DOI", "is", info.identifiers.DOI!) ||
        await this.searchItem("url", "contains", info.identifiers.arXiv!)
      ) as Zotero.Item
      if (item) {
        this.cache[key] = item
      }
      return item
    }
  }

  public selectItemInLibrary(item: Zotero.Item) {
    Zotero_Tabs.select('zotero-pane');
    ZoteroPane.selectItem(item.id);
  }

  public getItemType(item: Zotero.Item) {
    if (!item) { return }
    return Zotero.ItemTypes.getName(
      item.getField("itemTypeID" as any) as number
    )
  }

  public isChinese(text: string) {
    return (text.match(/[^a-zA-Z]/g)?.length || 0) / text.length > .5
  }

  public isDOI(text: string) {
    if (!text) { return false }
    let res = text.match(this.regex.DOI)
    if (res) {
      return res[0] == text && !/(cnki|issn)/i.test(text)
    } else {
      return false
    }
  }

  public matchArXiv(text: string) {
    let res = text.match(this.regex.arXiv)
    if (res != null && res.length >= 2) {
      return res[1]
    } else {
      return false
    }
  }

  public Html2Text(html: string): string | undefined {
    if (!html) { return "" }
    let text
    try {
      let span: HTMLSpanElement | null = document.createElement("span")
      span.innerHTML = html
      text = span.innerText || span.textContent
      span = null
    } catch (e) {
      console.log(html)
      text = html
    }
    if (text) {
      return text.replace(/<(\w+?)>(.+?)<\/\1>/g, (match, p1, p2) => p2)
    }
  }

  public getReader() {
    return Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)
  }

  public copyText = (text: string, show: boolean = true) => {
    (new ztoolkit.Clipboard()).addText(text, "text/unicode").copy();
    if (show) {
      (new ztoolkit.ProgressWindow("Copy"))
        .createLine({ text: text, type: "success" })
        .show()
    }
  }

  public getItem(): Zotero.Item | undefined {
    let reader = this.getReader()
    if (reader) {
      return (Zotero.Items.get(this.getReader()._itemID) as Zotero.Item).parentItem as Zotero.Item
    }
  }

  public abs(v: number) {
    return v > 0 ? v : -v
  }
}

export default Utils