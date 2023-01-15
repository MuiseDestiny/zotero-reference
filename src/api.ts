import { ItemBaseInfo, ItemInfo} from "./types"
import Utils from "./utils"
var xml2js = require('xml2js')

class Requests {
  /**
 * Record api response
 */
  public cache = {}

  async get(url, responseType: string = "json") {
    const k = JSON.stringify(arguments)
    if (this.cache[k]) {
      return this.cache[k]
    }
    let res = await Zotero.HTTP.request(
      "GET",
      url,
      {
        responseType: responseType
      }
    )
    if (res.status == 200) {
      this.cache[k] = res.response
      return res.response
    } else {
      console.log(`get ${url} error`, res)
    }
  }

  async post(url, body: object = {}, responseType: string = "json") {
    const k = JSON.stringify(arguments)
    if (this.cache[k]) {
      return this.cache[k]
    }
    let res = await Zotero.HTTP.request(
      "POST",
      url,
      Object.assign({
        responseType: responseType,
      }, (Object.keys(body).length > 0 ? {
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      } : {}))
    )
    if (res.status == 200) {
      this.cache[k] = res.response
      return res.response
    } else {
      console.log(`post ${url} error`, res)
    }
  }
}

/**
 * 放弃知网，默认PDF处理完全可以解析出中文参考文献
 * 知网结果顺序是错误的，并不想加入它
 */
class API {
  public utils: Utils;
  public requests: Requests;
  Info: { crossref: Function, readpaper: Function, semanticscholar: Function, unpaywall: Function, arXiv: Function};
  BaseInfo: { readcube: Function};
  constructor(utils) {
    this.utils = utils
    this.requests = new Requests()
    this.Info = {
      crossref: (item) => {
        const types = {
          "journal-article": "journalArticle",
          "report": "report",
          "posted-content": "preprint",
          "book-chapter": "bookSection"
        }
        let references: ItemBaseInfo[] = item.reference?.map(item => {
          let identifiers
          let url: string
          let text: string
          let textInfo: ItemBaseInfo
          if (item.unstructured) {
            text = item.unstructured
            textInfo = this.utils.refText2Info(text)
          } else {
            if (
              item["article-title"] &&
              item.year &&
              item.author
            ) {
              text = `${item.author} et al., ${item.year}, ${item["article-title"]}`
            } else {
              let textArray = []
              for (let key in item) {
                textArray.push(`${key}: ${item[key]}`)
              }
              text = textArray.join("; ")
            }
          }
          if (item.DOI) {
            identifiers = { DOI: item.DOI }
            url = this.utils.identifiers2URL(identifiers)
          } 
          let info: ItemBaseInfo = {
            identifiers: identifiers || textInfo?.identifiers || {},
            title: item["article-title"],
            authors: [item?.author],
            year: item.year,
            text: text,
            type: types[item.type] || "journalArticle",
            url: textInfo?.url || url
          }
          return info
        })
        const refCount = item["is-referenced-by-count"]
        let info: ItemInfo = {
          identifiers: { DOI: item.DOI },
          authors: item?.author?.map(i => i.family),
          title: Array.isArray(item.title) ? item.title[0] : item.title,
          year: item.published["date-parts"][0][0],
          type: types[item.type] || "journalArticle",
          text: item.title[0],
          url: item.URL,
          abstract: item.abstract,
          publishDate: item.published["date-parts"][0].join("-"),
          source: item.source.toLowerCase(),
          primaryVenue: item["container-title"] ? item["container-title"][0] : [],
          references: references,
          tags: [
            ...(refCount && refCount > 0 ? [{
              text: refCount,
              color: "#2fb8cb",
              tip: "is-referenced-by-count"
            }]: []),
          ]
        }
        return info
      },
      readpaper: (data) => {
        let info: ItemInfo = {
          identifiers: {},
          title: this.utils.Html2Text(data.title),
          year: data.year,
          publishDate: data.publishDate,
          authors: data?.authorList.map(i => this.utils.Html2Text(i.name)),
          abstract: this.utils.Html2Text(data.summary),
          primaryVenue: this.utils.Html2Text(data.primaryVenue),
          tags: [
            ...(data.venueTags || []),
            ...(
              data.citationCount && data.citationCount > 0 ?
                [
                  {
                    text: data.citationCount,
                    tip: "citationCount",
                    color: "#1f71e0"
                  }
                ] : []
            )
          ],
          source: "readpaper",
          type: "journalArticle"
        }
        return info
      },
      semanticscholar(data) {
        let info: ItemInfo = {
          identifiers: { DOI: data.DOI },
          title: data.title,
          authors: data.authors.map(i => i.name),
          year: data.year,
          publishDate: data.publicationDate,
          abstract: data.abstract,
          source: "semanticscholar",
          type: "journalArticle",
          tags: data.fieldsOfStudy || [],
          primaryVenue: data.journal.name,
          url: data.DOI ? `http://doi.org/${data.DOI}` : undefined
        }
        return info
      },
      unpaywall(data) {
        const types = {
          "journal-article": "journalArticle",
          "report": "report",
          "posted-content": "preprint",
          "book-chapter": "bookSection"
        }
        let info: ItemInfo = {
          identifiers: { DOI: data.DOI },
          authors: data.z_authors.map(i => i.family),
          title: data.title,
          year: data.year,
          type: types[data.genre],
          primaryVenue: data.journal_name,
          source: "unpaywall",
          publishDate: data.published_date,
          abstract: undefined
        }
        return info
      },
      arXiv: (data) => {
        let info: ItemInfo = {
          identifiers: { arXiv: data.arXiv },
          title: data.title[0].replace(/\n/g, ""),
          year: data.year,
          authors: data.author.map(e => e.name[0]),
          abstract: data.summary[0].replace(/\n/g, ""),
          url: this.utils.identifiers2URL({ arXiv: data.arXiv }),
          type: "preprint",
          tags: data.category.map(e => e["$"].term),
          publishDate: data.published && data.published[0],
          primaryVenue: data["arxiv:comment"] && data["arxiv:comment"][0]["_"].replace(/\n/g, "")
        }
        return info
      }
    }
    this.BaseInfo = {
      readcube: (data) => {
        let identifiers
        if (data.doi && this.utils.regex.arXiv.test(data.doi)) {
          data.arxiv = data.doi.match(this.utils.regex.arXiv).slice(-1)[0]
          data.doi = undefined
        }
        let type = "journalArticle"
        if (data.arxiv && !data.doi) {
          identifiers = { arXiv: data.arxiv }
          type = "preprint"
        } else {
          identifiers = { DOI: data.doi }
        }
        let url = this.utils.identifiers2URL(identifiers)
        let related: ItemBaseInfo = {
          identifiers: identifiers,
          title: data.title,
          authors: data?.authors,
          year: data.year,
          type: type,
          text: data.title,
          url: url
        }
        return related
      }
    }
  }

  async test() {
    let data = await this.getDOIBaseInfo("frf") 
    let d2 = await this.getDOIRelatedArray("")
    d2.forEach(d => {
      d
    })
  }

  // For DOI
  async getDOIBaseInfo(DOI: string): Promise<ItemBaseInfo> {
    const routes = {
      semanticscholar: `https://api.semanticscholar.org/graph/v1/paper/${DOI}?fields=title,year,authors`,
      unpaywall: `https://api.unpaywall.org/v2/${DOI}?email=ZoteroReference@polygon.org`
    }
    for (let route in routes) {
      let response = await this.requests.get(routes[route])
      if (response) {
        response.DOI = DOI
        return this.Info[route](response) as ItemBaseInfo
      }
    }
  }

  /**
   * From semanticscholar API
   * @param DOI 
   */
  async getDOIInfoBySemanticscholar(DOI: string): Promise<ItemInfo> {
    const api = `https://api.semanticscholar.org/graph/v1/paper/${DOI}?fields=title,authors,abstract,year,journal,fieldsOfStudy,publicationVenue,publicationDate`
    let response = await this.requests.get(api)
    if (response) {
      response.DOI = DOI
      return this.Info.semanticscholar(response)
    }
  }

  async getDOIInfoByCrossref(DOI: string): Promise<ItemInfo> {
    const api = `https://api.crossref.org/works/${DOI}/transform/application/vnd.citationstyles.csl+json`
    let response = await this.requests.get(api)
    if (response) {
      response.DOI = DOI
      let info: ItemInfo = this.Info.crossref(response)
      return info
    }
  }

  async getDOIRelatedArray(DOI: string): Promise<ItemBaseInfo[]> {
    const api = `https://services.readcube.com/reader/related?doi=${DOI}`
    let response = await this.requests.get(api)
    if (response) {
      let arr: ItemBaseInfo[] = response.map(i => {
        return this.BaseInfo.readcube(i) as ItemBaseInfo
      })
      return arr
    }
  }

  // For arXiv
  async getArXivInfo(arXiv: string) {
    const api = `https://export.arxiv.org/api/query?id_list=${arXiv}`
    let response = await this.requests.get(
      api,
      "application/xhtml+xml"
    )
    if (response) {
      let data = (await xml2js.parseStringPromise(response))?.feed?.entry[0]
      if (data) {
        data.arXiv = arXiv
        return this.Info.arXiv(data)
      }
    }
  }

  // For title
  /**
   * From crossref
   * @param title 
   * @returns 
   */
  async getTitleInfoByCrossref(title: string): Promise<ItemInfo> {
    const api = `https://api.crossref.org/works?query=${title}`
    let response = await this.requests.get(api)
    if (response) {
      const skipTypes = ["component"]
      let item = response.message.items.filter(e => skipTypes.indexOf(e.type) == -1)[0]
      let info = this.Info.crossref(item) as ItemInfo
      return info
    }
  }

  async getTitleInfoByReadpaper(title: string, body: object = {}): Promise<ItemInfo> {
    const api = "https://readpaper.com/api/microService-app-aiKnowledge/aiKnowledge/paper/search"
    let _body = {
      keywords: title,
      page: 1,
      pageSize: 1,
      searchType: Number(Object.values(body).length > 0)
    }
    body = { ..._body, ...body }
    
    let response = await this.requests.post(api, body)
    if (response) {
      let data = response?.data?.list[0]
      let info = this.Info.readpaper(data) as ItemInfo
      return info
    }
  }

  // For CNKI
  async getCNKIURL(title, author) {
    console.log("getCNKIURL", title, author)
    let cnkiURL
    let oldFunc = Zotero.Jasminum.Scrape.getItemFromSearch
    Zotero.Jasminum.Scrape.getItemFromSearch = function (htmlString) {
      try {
        let res = htmlString.match(/href='(.+FileName=.+?&DbName=.+?)'/i)
        if (res.length) {
          return res[1]
        }
      } catch {
        return
      }
    }.bind(Zotero.Jasminum);
    cnkiURL = await Zotero.Jasminum.Scrape.search({ author: author, keyword: title })
    Zotero.Jasminum.Scrape.getItemFromSearch = oldFunc.bind(Zotero.Jasminum);
    // console.log("cnkiURL", cnkiURL)
    // if (!cnkiURL) {
    //   if (title.length > 5) {
    //     return await this.getCNKIURL(title.slice(0, parseInt(String(title.length / 2))), author)
    //   } else {
    //     return false
    //   }
    // }
    if (!cnkiURL) {
      console.log("cnkiURL", cnkiURL)
      return
    }
    let args = this.utils.parseCNKIURL(cnkiURL)
    cnkiURL = `https://kns.cnki.net/kcms/detail/detail.aspx?FileName=${args.FileName}&DbName=${args.DbName}&DbCode=${args.DbCode}`
    return cnkiURL
  }

  async getTitleInfoByCNKI(refText): Promise<ItemInfo> {
    // 拒绝非中文请求，避免被封IP
    if (!this.utils.isChinese(refText)) { return }
    let res = this.utils.parseRefText(refText)
    const key = `${res.title}${res.authors[0]}`
    if (this.requests.cache[key]) {
      return this.requests.cache[key]
    }
    console.log("parseRefText", refText, res)
    let url = await this.getCNKIURL(res.title, res.authors[0])
    if (!url) { return }
    let htmlString = await this.requests.get(url, "text/html")
    const parser = this.tookit.getDOMParser()
    let doc = parser.parseFromString(htmlString, "text/html").childNodes[1] as any
    let aTags = doc.querySelectorAll(".top-tip span a")
    let info: ItemInfo = {
      identifiers: { CNKI: url },
      title: doc.querySelector(".brief h1").innerText,
      abstract: doc.querySelector("span#ChDivSummary").innerText,
      authors: [...doc.querySelectorAll("#authorpart span a")].map(a => a.innerText),
      type: "journalArticle",
      primaryVenue: aTags[0].innerText,
      year: aTags[1].innerText.split(",")[0],  //2020,32(10)
      url: url,
      source: "CNKI",
      tags: [...doc.querySelectorAll(".keywords a")].map(a => a.innerText.replace(/(\n|\s+|;)/g, ""))
        .concat([
          {
            text: [...doc.querySelectorAll("p.total-inform span")]
              .find(span => span.innerText.includes("下载"))
              .innerText.match(/\d+/)[0] as string,
            color: "#cc7c08",
            tip: "知网下载量"
          }
        ])
    }
    this.requests.cache[key] = info
    return info
  }
}

export default API

