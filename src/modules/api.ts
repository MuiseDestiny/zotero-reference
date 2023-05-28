import Utils from "./utils"
var xml2js = require('xml2js')
import { config } from "../../package.json";
import Requests from "./requests";
import { inflate } from "zlib";

/**
 * 放弃知网，默认PDF处理完全可以解析出中文参考文献
 * 知网结果顺序是错误的，并不想加入它
 */
class API {
  public utils: Utils;
  public requests: Requests;
  public Info: { crossref: Function, connectedpapers: Function,readpaper: Function, semanticscholar: Function, unpaywall: Function, arXiv: Function };
  public BaseInfo: { readcube: Function };
  constructor(utils: Utils) {
    this.utils = utils
    this.requests = new Requests()
    this.Info = {
      crossref: (item: any) => {
        const types: any = {
          "journal-article": "journalArticle",
          "report": "report",
          "posted-content": "preprint",
          "book-chapter": "bookSection"
        }
        let references: ItemBaseInfo[] = item.reference?.map((item: any) => {
          let identifiers
          let url: string | undefined
          let text: string
          let textInfo: any = {}
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
            identifiers: identifiers || textInfo!.identifiers || {},
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
          authors: item?.author?.map((i: any) => i.family),
          title: Array.isArray(item.title) ? item.title[0] : item.title,
          year: item.published && item.published["date-parts"][0][0],
          type: types[item.type] || "journalArticle",
          text: item.title[0],
          url: item.URL,
          abstract: item.abstract,
          publishDate: item.published && item.published["date-parts"][0].join("-"),
          source: item.source.toLowerCase(),
          primaryVenue: item["container-title"] ? item["container-title"][0] : [],
          references: references,
          tags: [
            ...(refCount && refCount > 0 ? [{
              text: refCount,
              color: "#2fb8cb",
              tip: "is-referenced-by-count"
            }] : []),
          ]
        }
        return info
      },
      connectedpapers: (item: any) => {
        let info: ItemInfo = {
          identifiers: { DOI: item.doiInfo.doi },
          authors: item?.authors?.map((i: any) => i[0].name),
          title: item.title.text,
          year: item.year.text,
          type: "journalArticle",
          text: item.title.text,
          url: item.doiInfo.doiUrl,
          abstract: item.paperAbstract.text,
          source: "connectedpapers",
          primaryVenue: item.venue.text,
          references: [],
          tags: [
            { text: item.citationStats.numCitations, tip: "citationStats.numCitations", color: "rgba(53, 153, 154, 0.5)" },
            { text: item.citationStats.numReferences, tip: "citationStats.numReferences", color: "rgba(53, 153, 154, 0.75)" }
          ]
        }
        return info
      },
      readpaper: (data: any) => {
        let info: ItemInfo = {
          identifiers: {},
          title: this.utils.Html2Text(data.title) as string,
          year: data.year,
          publishDate: data.publishDate,
          authors: data?.authorList.map((i: any) => this.utils.Html2Text(i.name)),
          abstract: this.utils.Html2Text(data.summary) as string,
          primaryVenue: this.utils.Html2Text(data.primaryVenue) as string,
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
      semanticscholar(data: any) {
        let info: ItemInfo = {
          identifiers: { DOI: data.DOI },
          title: data.title,
          authors: data.authors.map((i: any) => i.name),
          year: data.year,
          publishDate: data.publicationDate,
          abstract: data.abstract,
          source: "semanticscholar",
          type: "journalArticle",
          tags: data.fieldsOfStudy || [],
          primaryVenue: data.journal?.name,
          url: data.DOI ? `http://doi.org/${data.DOI}` : undefined
        }
        return info
      },
      unpaywall(data: any) {
        const types: any = {
          "journal-article": "journalArticle",
          "report": "report",
          "posted-content": "preprint",
          "book-chapter": "bookSection"
        }
        let info: ItemInfo = {
          identifiers: { DOI: data.DOI },
          authors: data.z_authors.map((i: any) => i.family),
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
      arXiv: (data: any) => {
        let info: ItemInfo = {
          identifiers: { arXiv: data.arXiv },
          title: data.title[0].replace(/\n/g, ""),
          year: data.year,
          authors: data.author.map((e: any) => e.name[0]),
          abstract: data.summary[0].replace(/\n/g, ""),
          url: this.utils.identifiers2URL({ arXiv: data.arXiv }),
          type: "preprint",
          tags: data.category.map((e: any) => e["$"].term),
          publishDate: data.published && data.published[0],
          primaryVenue: data["arxiv:comment"] && data["arxiv:comment"][0]["_"].replace(/\n/g, "")
        }
        return info
      }
    }
    this.BaseInfo = {
      readcube: (data: any) => {
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

  // For DOI
  async getDOIBaseInfo(DOI: string): Promise<ItemBaseInfo | undefined> {
    const routes: any = {
      semanticscholar: `https://api.semanticscholar.org/graph/v1/paper/${DOI}?fields=title,year,authors`,
      unpaywall: `https://api.unpaywall.org/v2/${DOI}?email=ZoteroReference@polygon.org`
    }
    for (let route in routes) {
      let response = await this.requests.get(routes[route])
      if (response) {
        response.DOI = DOI
        return this.Info[route as keyof typeof this.Info](response) as ItemBaseInfo
      }
    }
  }

  /**
   * From semanticscholar API
   * @param DOI 
   */
  async getDOIInfoBySemanticscholar(DOI: string): Promise<ItemInfo | undefined> {
    const api = `https://api.semanticscholar.org/graph/v1/paper/${DOI}?fields=title,authors,abstract,year,journal,fieldsOfStudy,publicationVenue,publicationDate`
    let response = await this.requests.get(api)
    if (response) {
      response.DOI = DOI
      if (!response.abstract) {
        // 可能是摘要太长，打开网页版获取
        let text = await this.requests.get(
          `https://www.semanticscholar.org/paper/${response.paperId}`,
          "text/html"
        )
        let parser = ztoolkit.getDOMParser()
        let doc = parser.parseFromString(text, "text/html")
        const abstract = doc.head.querySelector("meta[name=description]")?.getAttribute("content")
        if (!abstract?.startsWith("Semantic Scholar")) {
          response.abstract = abstract
        }
      }
      return this.Info.semanticscholar(response)
    }
  }

  async getDOIInfoByCrossref(DOI: string): Promise<ItemInfo | undefined> {
    const api = `https://api.crossref.org/works/${DOI}/transform/application/vnd.citationstyles.csl+json`
    let response = await this.requests.get(api)
    if (response) {
      response.DOI = DOI
      let info: ItemInfo = this.Info.crossref(response)
      return info
    }
  }

  // async getDOIRelatedArray(DOI: string): Promise<ItemBaseInfo[] | undefined> {
  //   const api = `https://services.readcube.com/reader/related?doi=${DOI}`
  //   let response = await this.requests.get(api)
  //   if (response) {
  //     let arr: ItemBaseInfo[] = response.map((i: any) => {
  //       return this.BaseInfo.readcube(i) as ItemBaseInfo
  //     })
  //     return arr
  //   }
  // }


  async getDOIRelatedArray(DOI: string, limit: number = 20): Promise<ItemBaseInfo[] | undefined> {
    let res = await this.requests.get(
      `https://rest.connectedpapers.com/id_translator/doi/${DOI}`,
      "json",
      {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 e/107.0.0.0 Safari/537.36"
      }
    )
    const api = `https://www.semanticscholar.org/api/1/paper/${res.paperId}/related-papers?limit=20&recommenderType=relatedPapers`
    // const api = `https://www.semanticscholar.org/api/1/search/paper/${res.paperId}/citations`
    let response = await this.requests.get(api, "json", {
      cookie: "aws-waf-token=fcf9f43b-d494-44a8-8806-da20c50d9457:AQoAaIgZ+Q0AAAAA:z/ZtlDV2Oz/Ymw+RFbJ0vnEAl1/wBKTH6I4/INUou3Qqkm00bibIWkYKq0w3qq4yxB2EtdBTtRT7Q2MBPjx17WmPmcVznf7mTMTwFQjmJOB2VgQeoBzsmuzVlI/l/NBlyTFdH8xEKYYWbXB8R5oK9o7JxolugTzDKvLX4Pc57cdkbCA5A6AIExi/Wm16"
    })
    ztoolkit.log(response)
    if (response) {
      let arr: ItemInfo[] = response.papers.map((i: any) => {
        let info: ItemInfo = {
          title: i.title.text,
          identifiers: {},
          year: i.year.text,
          text: i.title.text,
          type: "journalArticle",
          authors: i.authors.map((e: any) => e[1].text),
          abstract: i.paperAbstract?.text || i?.paperAbstractTruncated
        }
        if (i.citationContexts?.length > 0) {
          let descriptions: string[] = []
          i.citationContexts.slice(0, 1).forEach((ctx: any) => {
            try {
              descriptions.push(
                `${ctx.intents.length > 0 ? ctx.intents[0].id : "unknown"}: ${i.citationContexts[0].context.text}`
              )
            } catch {
              ztoolkit.log(ctx)
            }
          })
          info.description = descriptions.join("\n")
        }
        return info
      })
      return arr
    }
  }

  /**
   * API失效
   */
  async _getDOIRelatedArray(DOI: string, limit: number = 20): Promise<ItemBaseInfo[] | undefined> {
    let res = await this.requests.get(
      `https://rest.connectedpapers.com/id_translator/doi/${DOI}`,
      "json",
      {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 e/107.0.0.0 Safari/537.36"
      }
    )
    const api = `https://www.semanticscholar.org/api/1/search/paper/${res.paperId}/citations`
    let response = await this.requests.post(api, {
      "page": 1,
      "pageSize": 20,
      "sort": "relevance",
      "authors": [],
      "coAuthors": [],
      "venues": [],
      "yearFilter": null,
      "requireViewablePdf": false,
      "fieldsOfStudy": [],
      "useS2FosFields": true
    })
    ztoolkit.log(response)
    if (response) {
      let arr: ItemInfo[] = response.results.map((i: any) => {
        let info: ItemInfo = {
          title: i.title.text,
          identifiers: {},
          year: i.year,
          text: i.title.text,
          type: "journalArticle",
          authors: i.authors.map((e: any) => e[1].text),
        }
        if (i.citationContexts?.length > 0) {
          let descriptions: string[] = []
          i.citationContexts.slice(0, 1).forEach((ctx: any) => {
            try {
              descriptions.push(
                `${ctx.intents.length > 0 ? ctx.intents[0].id : "unknown"}: ${i.citationContexts[0].context.text}`
              )
            } catch {
              ztoolkit.log(ctx)
            }
          })
          info.description = descriptions.join("\n")
        }
        return info
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
  async getTitleInfoByCrossref(title: string): Promise<ItemInfo | undefined> {
    const api = `https://api.crossref.org/works?query=${title}`
    let response = await this.requests.get(api)
    if (response) {
      const skipTypes = ["component"]
      let item = response.message.items.filter((e: any) => skipTypes.indexOf(e.type) == -1)[0]
      let info = this.Info.crossref(item) as ItemInfo
      return info
    }
  }

  async getTitleInfoByConnectedpapers(text: string): Promise<ItemInfo | undefined> {
    let title = text
    if (this.utils.isDOI(text)) {
      let DOI = text
      let res = await this.requests.get(
        `https://rest.connectedpapers.com/id_translator/doi/${DOI}`
      )
      title = res.title
    }
    const api = `https://rest.connectedpapers.com/search/${escape(title)}/1`
    let response = await this.requests.post(api)
    if (response) {
      if (response?.results?.length) {
        let item = response.results[0]
        let info = this.Info.connectedpapers(item) as ItemInfo
        return info
      }
    }
  }
  
  async getTitleInfoByReadpaper(title: string, body: object = {}, doi: string | undefined = undefined): Promise<ItemInfo|undefined> {
    const api = "https://readpaper.com/api/microService-app-aiKnowledge/aiKnowledge/paper/search"
    let _body = {
      keywords: title,
      page: 1,
      pageSize: 1,
      searchType: Number(Object.values(body).length > 0)
    }
    body = { ..._body, ...body }

    let response = await this.requests.post(api, body)
    if (response && response?.data?.list?.[0]) {
      let data = response?.data?.list?.[0]
      // 验证DOI
      if (doi) {
        // 获取paperId的doi
        let _res = await this.requests.post(
          "https://readpaper.com/api/microService-app-aiKnowledge/aiKnowledge/paper/getPaperDetailInfo",
          { paperId: data.id }
        )
        ztoolkit.log(doi, _res.data.doi)
        if (_res.data.doi.toUpperCase() != doi.toUpperCase()) {
          return
        }
      }
      let info = this.Info.readpaper(data) as ItemInfo
      if (doi) { info.identifiers = { DOI: doi }}
      return info
    }
  }

  // For CNKI
  async _getCNKIURL(title: string, author: string) {
    ztoolkit.log("getCNKIURL", title, author)
    let cnkiURL
    let oldFunc = Zotero.Jasminum.Scrape.getItemFromSearch
    ztoolkit.patch(
      Zotero.Jasminum.Scrape,
      "createPostData",
      config.addonRef,
      (original) => 
        (arg: any) => {
          let text = original.call(Zotero.Jasminum.Scrape, arg)
          ztoolkit.log(text)
          text = escape(unescape(text)
            .replace(/SCDB/g, "CFLS")
          )
          ztoolkit.log(text)
          return text
        }
    )
    Zotero.Jasminum.Scrape.getItemFromSearch = function (htmlString: string) {
      try {
        let res = htmlString.match(/href='(.+FileName=.+?&DbName=.+?)'/i) as any[]
        if (res.length) {
          return res[1]
        }
      } catch {
        return
      }
    }.bind(Zotero.Jasminum);
    cnkiURL = await Zotero.Jasminum.Scrape.search({ keyword: title })
    Zotero.Jasminum.Scrape.getItemFromSearch = oldFunc.bind(Zotero.Jasminum);
    if (!cnkiURL) {
      ztoolkit.log("cnkiURL", cnkiURL)
      return
    }
    let args = this.utils.parseCNKIURL(cnkiURL)
    if (args) {
      cnkiURL = `https://kns.cnki.net/kcms/detail/detail.aspx?FileName=${args.fileName}&DbName=${args.dbName}&DbCode=${args.dbCode}`
      return cnkiURL
    }
  }

  async getCNKIURL(keywords: string, slience: boolean = false) {
    if (!slience) {
      (new ztoolkit.ProgressWindow("[Pending] API", {closeOtherProgressWindows: true}))
        .createLine({ text: `Get CNKI URL`, type: "default" })
        .show()
    }
    const res = await Zotero.HTTP.request(
      "POST",
      "https://kns.cnki.net/kns8/Brief/GetGridTableHtml",
      {
        headers: {
          Accept: "text/html, */*; q=0.01",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7",
          Connection: "keep-alive",
          "Content-Length": "2085",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Host: "kns.cnki.net",
          Origin: "https://kns.cnki.net",
          Referer:
            "https://kns.cnki.net/kns8/AdvSearch?dbprefix=SCDB&&crossDbcodes=CJFQ%2CCDMD%2CCIPD%2CCCND%2CCISD%2CSNAD%2CBDZK%2CCJFN%2CCCJD",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: `IsSearch=true&QueryJson={"Platform":"","DBCode":"CFLS","KuaKuCode":"CJFQ,CDMD,CIPD,CCND,CISD,SNAD,BDZK,CCJD,CCVD,CJFN","QNode":{"QGroup":[{"Key":"Subject","Title":"","Logic":1,"Items":[{"Title":"主题","Name":"SU","Value":"${keywords}","Operate":"%=","BlurType":""}],"ChildItems":[]}]},"CodeLang":"ch"}&PageName=defaultresult&DBCode=CFLS&CurPage=1&RecordsCntPerPage=20&CurDisplayMode=listmode&CurrSortField=&CurrSortFieldType=desc&IsSentenceSearch=false&Subject=`
      }
    )
    try {
      if (res) {
        let cnkiURL = res.responseText.match(/href='(.+FileName=.+?&DbName=.+?)'/i)
        if (cnkiURL) {
          let args = this.utils.parseCNKIURL(cnkiURL[1])
          if (args) {
            cnkiURL = `https://kns.cnki.net/kcms/detail/detail.aspx?FileName=${args.fileName}&DbName=${args.dbName}&DbCode=${args.dbCode}`
            return cnkiURL
          }
        }
      }
    } catch { }
    if (!slience) {
      (new ztoolkit.ProgressWindow("[Pending] API", { closeOtherProgressWindows: true }))
        .createLine({ text: `Get CNKI URL Fail`, type: "fail" })
        .show()
    }
  }

  async getTitleInfoByCNKI(refText: string): Promise<ItemInfo | undefined> {
    // 拒绝非中文请求，避免被封IP
    if (!this.utils.isChinese(refText)) { return }
    let res = this.utils.parseRefText(refText)
    const key = `${res.title}${res.authors}${refText}`
    if (this.requests.cache[key]) {
      return this.requests.cache[key]
    }
    ztoolkit.log("parseRefText", refText, res)
    let url = await this.getCNKIURL(res.title, true)
    if (!url) { return }

    let htmlString = await this.requests.get(url, "text")
    ztoolkit.log(url, htmlString)
    const parser = ztoolkit.getDOMParser();
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

  async getCNKIFileInfo(fileName: string, count: number=0): Promise<ItemInfo | undefined> {
    /**
     * 根据账号密码登录
     */
    const prefsKey = `${config.addonRef}.CNKI.token`
    const username = Zotero.Prefs.get(`${config.addonRef}.CNKI.username`) as string;
    const password = Zotero.Prefs.get(`${config.addonRef}.CNKI.password`) as string;
    if (username.length * password.length == 0) {
      (new ztoolkit.ProgressWindow("[Fail] API", { closeOtherProgressWindows: true }))
        .createLine({ text: "请配置知网研学账号密码后重试", type: "fail" })
        .show()
    }
    let updateToken = async () => {
      function getRandomIP() {
        let ip: string = "";
        for (var i = 0; i < 4; i++) {
          //判断是否小于3，决定后面要不要拼接.
          if (i < 3) {
            ip = ip + String(Math.floor(Math.random() * 256)) + "."
          } else {
            ip = ip + String(Math.floor(Math.random() * 256))
          }
        }
        return ip
      }
      let res = await this.requests.post(
        "https://apix.cnki.net/databusapi/api/v1.0/credential/namepasswithcleartext/personalaccount",
        {
          Username: username,
          Password: password,
          Clientip: getRandomIP()
        }
      )
      const token = res.Content
      Zotero.Prefs.set(prefsKey, token)
    }
    const infoApi = `https://x.cnki.net/readApi/api/v1/paperInfo?fileName=${fileName}&tableName=CJFDTOTAL&dbCode=CJFD&from=ReadingHistory&type=psmc&fsType=1&taskId=0`
    const refApi = `https://x.cnki.net/readApi/api/v1/paperRefreNotes?appId=CRSP_BASIC_PSMC&dbcode=CJFD&tablename=CJFDTOTAL&filename=${fileName}&type=1&page=1`
    const userAgent = "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36"
    const token = Zotero.Prefs.get(prefsKey) as string
    const infoData = await this.requests.get(infoApi, "json", {
      token: token,
      "user-agent": userAgent
    })
    // 这是最后一根救命稻草
    const refData = await this.requests.get(refApi, "json", {
      token: token,
      "user-agent": userAgent
    })
    ztoolkit.log(refData)
    if (String(refData.code) != "200") {
      if (count < 3) {
        await updateToken()
        return await this.getCNKIFileInfo(fileName, count + 1)
      } else {
        (new ztoolkit.ProgressWindow("[Fail] API", {closeOtherProgressWindows: true}))
          .createLine({ text: `${refData.code}: ${refData.promptMessage}`, type: "fail" })
          .show()
        return
      }
    } 

    let info: ItemInfo = {
      identifiers: {},
      authors: [],
      type: "",
      references: [],
      title: ""
    }
    const typeMap: any = {
      "journal": "journalArticle"
    }
    if (String(infoData.code)  == "200") {
      infoData.content.paper.bibliography.forEach((ref: {title: string}) => {
        let _ref = refData.content.refer.find((_ref: {title: string}) => {
          return ref.title.indexOf(_ref.title) != -1
        })
        const refText = ref.title.replace(/^\[\d+\]/, "")
        if (_ref) {
          const cnkiURL = `https://kns.cnki.net/kcms/detail/detail.aspx?FileName=${_ref.fileName}&DbName=${_ref.tableName}&DbCode=${_ref.dbSource.split("_")[0]}`
          info.references?.push({
            identifiers: {
              CNKI: cnkiURL
            },
            text: refText,
            title: _ref.title,
            authors: [],
            type: typeMap[_ref.type] || "journalArticle",
            url: cnkiURL
          })
        } else {
          info.references?.push({
            identifiers: {},
            text: refText,
            authors: [],
            type: "journalArticle",
            title: refText
          })
        }
      })
    } else {
      refData.content.refer.sort((a: any, b: any) => Number(a.citationNumber) - Number(b.citationNumber))
        .forEach((ref: {
        type: string; title: string; author: string;
        fileName: string;
        tableName: string;
        dbSource: string;
        year: string;
        citationNumber: string;
        volumn: string;
        source: string;
        pageNumber: string;
      }) => {
        const title = ref.title.replace(/^\[\d+\]/, "")
        
        const cnkiURL = `https://kns.cnki.net/kcms/detail/detail.aspx?FileName=${ref.fileName}&DbName=${ref.tableName}&DbCode=${ref.dbSource.split("_")[0]}`
        info.references?.push(
          {
            identifiers: {
              CNKI: cnkiURL
            },
            authors: ref.author.split(";").filter(s=>s.length),
            type: typeMap[ref.type] || "journalArticle",
            text: `${ref.author}. ${title}[${ref.type[0]}]. ${ref.source}, ${ref.year}, ${ref.volumn}:${ref.pageNumber}.`,
            title: ref.title,
            year: ref.year,
            url: cnkiURL,
            number: Number(ref.citationNumber)
          }
        )
      })
    }
    return info
  }
}

export default  API

