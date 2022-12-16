import AddonModule from "./module";
import { Addon } from "./addon";

class Utils extends AddonModule {
  constructor(parent: Addon) {
    console.log("Utils constructor")
    super(parent);
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

  async getTitleDOIByCrossref(title: string) {
    let res
    try {
      const crossref = `https://api.crossref.org/works?query=${title}`
      res = await this.Zotero.HTTP.request(
        "GET",
        crossref,
        {
          responseType: "json"
        }
      )
      const DOI = res.response.message.items.filter(e=>e.type != "component")[0].DOI
      this.debug(`getTitleDOIByCrossref(${title}) -> ${DOI}`)
      return DOI
    } catch {
      this.debug("error, getTitleDOIByCrossref", res.response)
      return false
    }
  }

  async getTitleDOIByUnpaywall(title: string) {
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
      this.debug(`getTitleDOIByUnpaywall(${title}) -> ${DOI}`)
      return DOI
    } catch {
      this.debug("error, getTitleDOIByUnpayWall", res.response)
      return false
    }
  }

  async getTitleDOI(title: string) {
    this.Addon.views.showProgressWindow("通过unpaywall查询DOI", title)
    let DOI = await this.getTitleDOIByUnpaywall(title)
    if (!DOI) {
      this.Addon.views.showProgressWindow("通过crossref查询DOI", title)
      DOI = await this.getTitleDOIByCrossref(title)
    }
    this.Addon.views.showProgressWindow("DOI", DOI)
    return DOI
  }

  async getRefDataFromCrossref(DOI: string) {
    let refData = await this.getRefDataFromPDF()
    if (refData.length > 0) {
      return refData
    }
    // request or read data
    if (DOI in this.Addon.DOIRefData) {
      refData = this.Addon.DOIRefData[DOI]
    } else {
      try {
        this.Addon.views.showProgressWindow("Crossref", `从Crossref API获取参考文献`)
        const crossrefApi = `https://api.crossref.org/works/${DOI}/transform/application/vnd.citationstyles.csl+json`
        let res = await this.Zotero.HTTP.request(
          "GET",
          crossrefApi,
          {
            responseType: "json"
          }
        )
        refData = res.response.reference || []
        if (refData) {
          this.Addon.DOIRefData[DOI] = refData
        } else {
          return await this.getRefDataFromPDF()
        }
        this.Addon.views.showProgressWindow("Crossref", `获取${refData.length}条参考文献`, "success")
      } catch (e) {
        this.Addon.views.showProgressWindow("Crossref", e, "fail")
        return await this.getRefDataFromPDF()
      }
    }
    // analysis refData
    return refData
  }

  async getRefDataFromCNKI(URL: string) {
    let refData = await this.getRefDataFromPDF()
    if (refData.length > 0) {
      return refData
    }
    this.Addon.views.showProgressWindow("CNKI", `从知网获取参考文献`, "success")
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
        this.Addon.views.showProgressWindow("CNKI", `获取第${page}页参考文献`, "success")
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
      if (refData) {
        this.Addon.DOIRefData[URL] = refData
      } else {
        return this.getRefDataFromPDF()
      }
    }
    return refData;
  }

  async getRefDataFromPDF() {
    this.Addon.views.showProgressWindow("PDF", "从PDF解析参考文献")
    let refLines = await this.prepareTextContent()
    if (!refLines) {
      this.Addon.views.showProgressWindow("PDF", "解析失败", "fail")
      return []
    }

    let isRefStart = (text) => {
      let regexArray = [
        /^\[\d{0,3}\].+?[\,\.\uff0c\uff0e]/,
        /^\d+\s[^\d]+?[\,\.\uff0c\uff0e]/,
        /^[A-Z][A-Za-z]+[\,\.\uff0c\uff0e]/,
        /^[\u4e00-\u9fa5]{1,4}[\,\.\uff0c\uff0e]/
      ]
      for (let i = 0; i < regexArray.length; i++) {
        if (regexArray[i].test(text)) {
          return true
        }
      }
    }

    // 获取左右栏分界线，这里中间可能对个别奇怪排版pdf不适用，但应该可以应对大多数情况
    let firstLine = refLines[0]
    // 已知新一行参考文献缩进
    let firstX = firstLine.x
    // 分成左栏和右栏，未必真的会分，有的文章只有一栏
    let leftLines, rightLines
    leftLines = refLines.filter(line => line.column.side == "left")
    rightLines = refLines.filter(line => line.column.side == "right")
    // 找到两栏最小的x
    let leftSortedX = leftLines.map(line => line.x).sort((a, b) => a - b)
    let rightSortedX = rightLines.map(line => line.x).sort((a, b) => a - b)
    // 如果已知条目缩进是在左侧，且含右栏
    if (firstLine.column.side == "left" && rightSortedX) {
      // 将右栏移到左栏
      rightLines.forEach(line => {
        line.x = line.x - rightSortedX[0] + firstX
      })
    }
    // 如果已知条目缩进是在右侧，且含左栏
    else if (firstLine.column.side == "right" && leftSortedX) {
      // 将左栏移到右栏
      leftLines.forEach(line => {
        line.x = rightSortedX[0] + line.x - leftSortedX[0]
      })
    }

    let references = []
    for (let i = 0; i < refLines.length; i++) {
      let line = refLines[i]
      let text = line.text 
      let error = line.x - firstX
      error = error > 0 ? error : -error
      if (error < line.height && isRefStart(text)) {
        references.push(text)
      } else {
        references[references.length-1] += text
      }
    }

    console.log(references)
    if (references.length > 0) {
      this.Addon.views.showProgressWindow("PDF", `${references.length}条参考文献`, "success")
    } else {
      this.Addon.views.showProgressWindow("PDF", `解析失败`, "fail")
    }
    let refData = []
    for (let i = 0; i < references.length; i++) {
      let reference = references[i].trim()
      reference = reference.replace(/^\[\d+\]/, "").trim()
      let matchedDOI = reference.match(this.Addon.DOIRegex)
      let data = { unstructured: reference }
      if (matchedDOI) {
        data["DOI"] = matchedDOI[0]
      }
      refData.push(data)
    } 
    return refData
  }

  public recordLayout(lines, middle) {
    let leftLines = lines.filter(line => line.x < middle)
    let rightLines = lines.filter(line => line.x > middle)
    // 储存栏目最小值，用于校正整体偏移，极少数pdf需要
    let leftSortedX = leftLines.map(line => line.x).sort((a, b) => a - b)
    let rightSortedX = rightLines.map(line => line.x).sort((a, b) => a - b)
    if (leftSortedX) {
      leftLines.forEach(line => {
        line["column"] = {
          side: "left",
          minX: leftSortedX[0]
        }
      })
    }
    if (rightSortedX) {
      rightLines.forEach(line => {
        line["column"] = {
          side: "right",
          minX: rightSortedX[0]
        }
      })
    }
    return [leftSortedX, rightSortedX]
  }

  public mergeSameTop(items) {
    let toLine = (item) => {
      return {
        x: parseFloat(item.transform[4].toFixed(1)),
        y: parseFloat(item.transform[5].toFixed(1)),
        text: item.str || "",
        height: item.height,
        width: item.width
      }
    }
    let j = 0
    let lines = [toLine(items[j])]
    for (j = 1; j < items.length; j++) {
      let item = toLine(items[j])
      let error = item.y - lines.slice(-1)[0].y
      error = error > 0 ? error : -error
      if (error < item.height * .5) {
        lines.slice(-1)[0].text += item.text
        lines.slice(-1)[0].width += item.width
      } else {
        lines.push(item)
      }
    }
    return lines
  }

  async prepareTextContent() {
    const PDFViewerApplication = this.Addon.views.reader._iframeWindow.wrappedJSObject.PDFViewerApplication;
    await PDFViewerApplication.pdfLoadingTask.promise;
    await PDFViewerApplication.pdfViewer.pagesPromise;
    let pages = PDFViewerApplication.pdfViewer._pages
    this.debug(pages)
    let refLines = []
    let flag = false
    let leftSortedX, rightSortedX
    for (let i = pages.length - 1; i >= 0; i--) {
      this.debug("page num", i)
      let pdfPage = pages[i].pdfPage
      console.log(pdfPage)
      let items = (await pdfPage.getTextContent()).items
      this.debug("ori length", items.length)
      // 合并同一高度的，同一行
      let lines = this.mergeSameTop(items)
      // 判断是否含有参考文献
      let line = lines.reverse().find(line => {
        return (
          /(参考文献|reference)/ig.test(line.text) ||
          line.text.includes("参考文献") ||
          line.text.includes("Reference") 
        ) && line.text.length < 20
      })
      lines.reverse()
      let k = lines.indexOf(line);

      // 需要记录一下column，防止相邻页布局更改
      let maxWidth = pdfPage._pageInfo.view[2];
      [leftSortedX, rightSortedX] = this.recordLayout(lines, maxWidth / 2)

      if (k != -1) {
        // const maxy = line.y
        // lines = lines.filter(line=>line.y<maxy)
        flag = true
        refLines = [...lines.slice(k+1), ...refLines]
        break
      } else {
        refLines = [...lines, ...refLines]
      }
    }
    if (flag) {
      this.debug("refLines", [...refLines])
      // 校正不同页面整体偏移
      // leftSortedX, rightSortedX记录的是参考文献页面
      if (leftSortedX) {
        let minX = leftSortedX[0]
        refLines.forEach(line => {
          if (line.column.side == "left" && line.column.minX != minX) {
            let offset = minX - line.column.minX
            line.column.minX += offset
            line.x += offset
          }
        })
      }
      if (rightSortedX) {
        let minX = rightSortedX[0]
        refLines.forEach(line => {
          if (line.column.side == "right" && line.column.minX != minX) {
            let offset = minX - line.column.minX
            line.column.minX += offset
            line.x += offset
          }
        })
      }
      this.debug("refLines", [...refLines])
      return refLines
    } else {
      return []
    }
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
    let title = titles.sort((a, b) => b.length-a.length)[0]
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
        console.log(htmlString)
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
    return this.Addon.absoluteDOIRegex.test(text)
  }

  public getReader() {
    return this.Zotero.Reader.getByTabID(((this.window as any).Zotero_Tabs as typeof Zotero_Tabs).selectedID)
  }
}

export default Utils