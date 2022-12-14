import AddonModule from "./module";
import { Addon } from "./addon";

class Utils extends AddonModule {
  constructor(parent: Addon) {
    console.log("Utils constructor")
    super(parent);
  }

  async getRefDataFromCrossref(DOI: string) {
    // request or read data
    let refData
    if (DOI in this.Addon.DOIRefData) {
      refData = this.Addon.DOIRefData[DOI]
    } else {
      try {
        this.Addon.views.showProgressWindow("Crossref", `正在获取参考文献`)
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

  async getDOIInfo(DOI: string) {
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

  async getTitleDOI(title: string) {
    let res
    try {
      const unpaywall = `https://api.unpaywall.org/v2/search?query=${title}&email=zoterostyle@polygon.org`
      res = await this.Zotero.HTTP.request(
        "GET",
        unpaywall,
        {
          responseType: "json"
        }
      )
      const DOI = res.response.results[0].response.doi
      this.debug(`getTitleDOI(${title}) -> ${DOI}`)
      return DOI
    } catch {
      this.debug("error, getTitleDOI", res.response)
      title = title.slice(0, parseInt(String(title.length / 2)))
      if (title) {
        this.debug("try -> ", title)
        return await this.getTitleDOI(title)
      }
    }
  }

  async getRefDataFromCNKI(URL: string) {
    let refData = []
    if (URL in this.Addon.DOIRefData) {
      refData = this.Addon.DOIRefData[URL]
    } else {
      this.debug("get by CNKI", URL)
      // URL - https://kns.cnki.net/kcms/detail/detail.aspx?dbcode=CJFD&dbname=CJFDLAST2022&filename=ZYJH202209006&uniplatform=NZKPT&v=4RWl_k1sYrO5ij1n5KXGDdusm5zXyjI12tpcPkSPI4OMnblizxXSTsDcSTbO-AqK
      //       https://kns.cnki.net/kcms/detail/frame/list.aspx?dbcode=CJFD&filename=zyjh202209006&RefType=1&vl=
      let args = this.parseCnkiURL(URL)
      let htmltext
      htmltext = (await this.Zotero.HTTP.request(
        "GET",
        URL,
        {
          responseType: "text"
        }
      )).response
      const vl = htmltext.match(/id="v".+?value="(.+?)"/)[1]
      this.debug("vl", vl);
      let page = 0;
      let parser = new this.window.DOMParser();
      while (true) {
        page++
        this.debug("page", page)
        if (page >= 6) { break }
        htmltext = (await this.Zotero.HTTP.request(
          "GET",
          `https://kns.cnki.net/kcms/detail/frame/list.aspx?dbcode=${args.DbCode}&filename=${args.FileName}&RefType=1&vl=${vl}&page=${page}`,
          {
            reponseType: "text",
            headers: {
              "Referer": `https://kns.cnki.net/kcms/detail/detail.aspx?filename=${args.FileName}`
            }
          }
        )).response
        const HTML = parser.parseFromString(htmltext, "text/html").body as HTMLElement
        let liNodes = [...HTML.querySelectorAll("ul li")]
        if (liNodes.length == 0) { break }
        this.Addon.views.showProgressWindow("CNKI", `获取第${page}页参考文献`)
        liNodes.forEach((li: HTMLLIElement) => {
            let data = {}
            let a = li.querySelector("a[href]")
            if (a) {
              try {
                let _args = this.parseCnkiURL(a.getAttribute("href"))
                data["url"] = `https://kns.cnki.net/kcms/detail/detail.aspx?FileName=${_args.FileName}&DbName=${_args.DbName}&DbCode=${_args.DbCode}`
              } catch {}
            }
            data["unstructured"] = li.innerText
              .replace(/\n/g, "")
              .replace(/\[\d+?\]/g, "")
              .replace(/\s+/g, " ")
              .trim()
            refData.push(data)
          })
      }
      this.Addon.DOIRefData[URL] = refData
    }
    return refData;
  }

  public parseContent(content) {
    // extract author and title
    // [1] 张 宁, 张 雨青, 吴 坎坎. 信任的心理和神经生理机制. 2011, 1137-1143.
    // [1] 中央环保督察视角下的城市群高质量发展研究——以成渝城市群为例[J].李毅.  环境生态学.2022(04) 
    let parts = content
      .replace(/\[.+?\]/g, "")
      .replace(/\s+/g, " ")
      .split(/(\.\s+|,|，)/)
      .map(e=>e.trim())
      .filter(e => e)
    this.debug("parts", parts)
    let authors = []
    let titles = []
    for (let part of parts) {
      if (part.length <= 3 && part.length >= 2) {
        authors.push(part);
      } else {
        titles.push(part);
      }
    }
    let title = titles.sort(title=>title.length).slice(-1)[0]
    let author = authors[0]
    this.debug(content, "\n->\n", title, author)
    return [title, author]
  }

  public parseCnkiURL(cnkiURL) {
    let FileName = cnkiURL.match(/FileName=(\w+)/i)[1]
    let DbName = cnkiURL.match(/DbName=(\w+)/i)[1]
    let DbCode = cnkiURL.match(/DbCode=(\w+)/i)[1]
    return {FileName, DbName, DbCode}
  }

  async getCnkiURL(title, author) {
    this.debug("getCnkiURL", title, author)
    let cnkiURL
    let oldFunc = this.Zotero.Jasminum.Scrape.getItemFromSearch
    this.Zotero.Jasminum.Scrape.getItemFromSearch = function (htmlString) {
      try {        
        let res = htmlString.match(/href='(.+FileName=.+?&DbName=.+?)'/i)
        if (res.length) {
            return res[1]
        }
      } catch {
        this.debug(htmlString)
      }
    }.bind(this.Zotero.Jasminum);
    cnkiURL = await this.Zotero.Jasminum.Scrape.search({ author: author, keyword: title })
    this.Zotero.Jasminum.Scrape.getItemFromSearch = oldFunc.bind(this.Zotero.Jasminum);
    let args = this.parseCnkiURL(cnkiURL)
    cnkiURL = `https://kns.cnki.net/kcms/detail/detail.aspx?FileName=${args.FileName}&DbName=${args.DbName}&DbCode=${args.DbCode}`
    console.log(cnkiURL)
    return cnkiURL
  }

  async createItemByJasminum(title, author) {
    let cnkiURL = await this.getCnkiURL(title, author)
    // Jasminum
    let articleId = this.Zotero.Jasminum.Scrape.getIDFromURL(cnkiURL);
    let postData = this.Zotero.Jasminum.Scrape.createRefPostData([articleId])
    let data = await this.Zotero.Jasminum.Scrape.getRefText(postData)

    let items = await this.Zotero.Jasminum.Utils.trans2Items(data, 1);
    if (items) {
      let item = items[0]
      item.setField("url", cnkiURL)
      await item.saveTx()
      return item
    }
  }
  
  async createItemByZotero(DOI, collections) {
    var translate = new this.Zotero.Translate.Search();
    translate.setIdentifier({ "DOI": DOI });

    let translators = await translate.getTranslators();
    translate.setTranslator(translators);
    let libraryID = this.window.ZoteroPane.getSelectedLibraryID();

    return (await translate.translate({
      libraryID,
      collections,
      saveAttachments: true
    }))[0]

  }

  async searchItem(condition, operator, value) {
    let s = new this.Zotero.Search;
    s.addCondition(condition, operator, value);
    var ids = await s.search();
    let items = await this.Zotero.Items.getAsync(ids);
    if (items) {
      return items[0]
    }
  }

  public isChinese(text) {
    return /[\u4e00-\u9fa5]+/.test(text)
  }

  public isDOI(text) {
    return this.Addon.DOIRegex.test(text)
  }

  public getReader() {
    return this.Zotero.Reader.getByTabID(((this.window as any).Zotero_Tabs as typeof Zotero_Tabs).selectedID)
  }

  
}

export default Utils