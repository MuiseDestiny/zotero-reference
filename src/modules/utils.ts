import API from "./api"
import PDF from "./pdf";


class Utils {
  API: API;
  PDF: PDF;
  private lock?: _ZoteroTypes.PromiseObject;
  private cache: { [key: string]: any } = {};
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

  public parseRefText(text: string): { year?: string, authors?: string[], title: string, publicationVenue?: String } {
    console.log("parseRefText -> ", text)
    try {
      text = text.replace(/^\[\d+?\]/, "")
      text = text.replace(/\s+/g, " ")
      // 匹配标题
      // 引号引起来，100%是标题
      let title: string, titleMatch: string
      if (/\u201c(.+)\u201d/.test(text)) {
        [titleMatch, title] = text.match(/\u201c(.+)\u201d/)!
        if (title.endsWith(",")) {
          title = title.slice(0, -1)
        }
      } else {
        title = titleMatch = ((text.indexOf(". ") != -1 && text.match(/\.\s/g)!.length >= 2) && text.split(". ") || text.split("."))
          // 找出最长的两个，其中一个最有可能是一堆作者，另一个最有可能是标题
          .sort((a, b) => b.length - a.length)
          // 统计它们中缩写以及符号出现的次数，出现次数最多的有可能是作者
          .map((s: string) => {
            let count = 0;
            [/[A-Z]\./g, /[,\.\-\(\)\:]/g, /\d/g].forEach(regex => {
              let res = s.match(regex)
              count += (res ? res.length : 0)
            })
            return [count / s.length, s]
          })
          // 过滤期刊描述
          .filter((s: any) => s[1].match(/\s+/g)?.length >= 3)
          .sort((a: any, b: any) => a[0] - b[0])![0][1] as string
        if (/\[[A-Z]\]$/.test(title)) {
          title = title.replace(/\[[A-Z]\]$/, "")
        }
      }
      title = title.trim()
      console.log("title", title)
      let splitByTitle = text.split(titleMatch)
      let authorInfo = splitByTitle[0].trim()

      console.log(splitByTitle[1])

      let publicationVenue = splitByTitle[1].match(/[^.\s].+[^\.]/)![0].split(/[,\d]/)[0].trim()
      if (authorInfo.indexOf("et al.") != -1) {
        authorInfo = authorInfo.split("et al.")[0] + "et al."
      }
      const currentYear = new Date().getFullYear();
      let res = text.match(/[^\d]\d{4}[^\d-]/g)?.map(s => s.match(/\d+/)![0])
      console.log(res)
      let year = res?.find(s => {
        return Number(s) <= Number(currentYear) + 1
      })!
      authorInfo = authorInfo.replace(`${year}.`, "").replace(year, "").trim()
      console.log({ year, title, authors: [authorInfo], publicationVenue })
      return { year, title, authors: [authorInfo], publicationVenue }
    } catch {
      return {
        title: "Reference"
      }
    }

  }

  public _parseRefText(text: string): { year: string, authors: string[], title: string } {
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
      // ztoolkit.log(text, "\n->\n", title, authors)
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
      authors: [],
      ...this.parseRefText(text),
      type: (identifiers.arXiv ? "preprint" : "journalArticle")
    }
  }

  public parseCNKIURL(cnkiURL: string) {
    try {
      let fileName = cnkiURL.match(/fileName=(\w+)/i)![1]
      let dbName = cnkiURL.match(/dbName=(\w+)/i)![1]
      let dbCode = cnkiURL.match(/dbCode=(\w+)/i)![1]
      return { fileName, dbName, dbCode }
    } catch {}
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
      saveAttachments: false
    }))[0]
  }

  async createItemByJasminum(title: string) {
    let cnkiURL = await this.API.getCNKIURL(title, true)
    console.log("cnkiURL", cnkiURL)
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



  public searchRelatedItem(item: Zotero.Item, refItem: Zotero.Item): Zotero.Item | undefined {
    if (!item) { return }
    let relatedItems = item.relatedItems.map(key => Zotero.Items.getByLibraryAndKey(1, key) as Zotero.Item)
    if (refItem) {
      let relatedItem = relatedItems.find((item: Zotero.Item) => refItem.id == item.id)
      return relatedItem
    }
  }

  public async searchItem(info: ItemBaseInfo) {
    if (!info) { return }
    let s = new Zotero.Search;
    // @ts-ignore
    s.addCondition("joinMode", "any");
    if (info.identifiers.DOI) {
      s.addCondition("DOI", "is", info.identifiers.DOI.toLowerCase());
      s.addCondition("DOI", "is", info.identifiers.DOI.toUpperCase());
    } else {
      if (info.title && info.title?.length > 8) {
        s.addCondition("title", "contains", info.title!);
      }
      s.addCondition("url", "contains", info.identifiers.arXiv!);
      s.addCondition("url", "contains", info.identifiers.CNKI!);
    }
    var ids = await s.search();
    let items = (await Zotero.Items.getAsync(ids)).filter(i => {
      return (
        i.itemType !== "attachment" &&
        i.isRegularItem && i.isRegularItem()
      )
    });
    if (items.length) {
      return items[0]
    }
  }

  /**
   * 搜索本地，获取参考文献的本地item引用
   * @param info 
   * @returns 
   */
  public async searchLibraryItem(info: ItemBaseInfo): Promise<Zotero.Item | undefined> {
    await Zotero.Promise.delay(0)
    const key = JSON.stringify(info.identifiers) + info.text + "library-item"
    if (key in this.cache) {
      info._item = this.cache[key]
      return this.cache[key]
    } else {
      // 进行粗暴搜索，可能时间缓慢
      let items: Zotero.Item[] = await Zotero.Items.getAll(1);
      let getPureText = (s: string) => (this.cache["getPureText" + s] ??= s.toLowerCase().match(/[0-9a-z\u4e00-\u9fa5]+/g)?.join("")!)
      let item = await this.searchItem(info) || items.filter(i => (
        i.isRegularItem() &&
        i.getField("title") &&
        ["journalArtical", "preprint", "book"].indexOf(i.itemType) != -1
      )).find((item: Zotero.Item) => {
        try {
          const title = getPureText(item.getField("title") as string)
          const searchTitle = getPureText(info.title || info.text as string)
          if (searchTitle.length > 10 && title && searchTitle && (title?.indexOf(searchTitle) != -1 || searchTitle?.indexOf(title) != -1)) {
            return item;
          }
        } catch (e) {}
      })
      if (item) {
        info._item = item 
        this.cache[key] = item
        // 用本地得到的信息反向更新info
        info.title = item.getField("title") as string
        let DOI = item.getField("DOI") as string
        if (DOI) {
          info.identifiers = {DOI}
        }
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
    text = text.replace(/\s+/g, "")
    return (text.match(/[\u4E00-\u9FA5]/g)?.length || 0) / text.length > .5
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

  public Html2Text(html: string): string | null {
    if (!html) { return "" }
    let text
    try {
      let span: HTMLSpanElement | null = document.createElement("span")
      span.innerHTML = html
      text = span.innerText || span.textContent
      span = null
    } catch (e) {
      text = html
    }
    if (text) {
      text = text
        .replace(/<([\w:]+?)>([\s\S]+?)<\/\1>/g, (match, p1, p2) => p2)
        .replace(/\n+/g, "")
    }
    console.log(text)
    return text
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