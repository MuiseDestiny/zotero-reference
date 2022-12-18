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
      const configs = {
        semanticscholar: {
          url: `https://api.semanticscholar.org/graph/v1/paper/${DOI}?fields=title,year,authors`,
          parse: (response) => {
            let author = response.authors[0].name
            let title = response.title
            let year = response.year
            return {
              author, title, year
            }
          }
        },
        unpaywall: {
          url: `https://api.unpaywall.org/v2/${DOI}?email=zoterostyle@polygon.org`,
          parse: (response) => {
            let author = response.z_authors[0].family
            let title = response.title
            let year = response.year
            return {
              author, title, year
            }
          }
        }
      }
      for (let method in configs) {
        let res = await this.Zotero.HTTP.request(
          "GET",
          configs[method].url,
          {
            responseType: "json"
          }
        )
        if (res.status == 200) {
          data = configs[method].parse(res.response)
          this.debug(data)
          this.Addon.DOIData[DOI] = data
          break
        }
      }
    }
    return data
  }

  async getTitleDOIByCrossref(title: string) {
    let res
    try {
      this.Addon.views.showProgressWindow("通过crossref查询DOI", title)
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
      this.Addon.views.showProgressWindow("通过unpaywall查询DOI", title)
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
    let DOI = await this.getTitleDOIByUnpaywall(title)
    if (!DOI) {
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
                data["URL"] = `https://kns.cnki.net/kcms/detail/detail.aspx?FileName=${_args.FileName}&DbName=${_args.DbName}&DbCode=${_args.DbCode}`
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
    let tabId = this.window.Zotero_Tabs.selectedID
    const tabContainer = this.document.querySelector(`#${tabId}-context`);
    if (!tabContainer.querySelector("#zotero-reference-tabpanel").classList.contains("PDF")) {
      return []
    }
    try {
      this.Addon.views.showProgressWindow("PDF", "从PDF解析参考文献")
      let refLines = await this.getRefLines()
      if (refLines.length == 0) {
        this.Addon.views.showProgressWindow("PDF", "解析失败", "fail")
        return []
      }
  
      let refData = this.mergeSameRef(refLines)
      
      if (refData.length > 0) {
        this.Addon.views.showProgressWindow("PDF", `${refData.length}条参考文献`, "success")
      } else {
        this.Addon.views.showProgressWindow("PDF", `解析失败`, "fail")
      }
  
      this.debug(refData)
      for (let i = 0; i < refData.length; i++) {
        let ref = refData[i]
        let unstructured = ref.text
        unstructured = unstructured
          .trim()
          .replace(/^\[\d+\]/, "").replace(/^\d+[\.\s]?/, "").trim()
        ref["unstructured"] = unstructured
        const regex = {
          "DOI": this.Addon.DOIRegex,
          "URL": /https?:\/\/[^\s]+/
        }
        for (let key in regex) {
          let matchedRes = ref.unstructured.match(regex[key]) || (ref?.url || "").match(regex[key])
          if (matchedRes) {
            let value = matchedRes[0] as string
            if (value.endsWith(".")) {
              value = value.slice(0, -1)
            }
            ref[key] = value
          }
        }
      } 
      return refData
    } catch (e) {
      this.Addon.views.showProgressWindow("PDF", e, "fail")
      return []
    }
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
    this.debug("mergeSameTop input", [...items])
    let toLine = (item) => {
      return {
        x: parseFloat(item.transform[4].toFixed(1)),
        y: parseFloat(item.transform[5].toFixed(1)),
        text: item.str || "",
        height: item.height,
        width: item.width,
        url: item?.url
      }
    }
    let j = 0
    let lines = [toLine(items[j])]
    for (j = 1; j < items.length; j++) {
      let line = toLine(items[j])
      let lastLine = lines.slice(-1)[0]
      let error = line.y - lastLine.y
      error = error > 0 ? error : -error
      if (error < line.height * .5) {
        lastLine.text += line.text
        lastLine.width += line.width
        lastLine.url = lastLine.url || line.url
      } else {
        lines.push(line)
      }
    }
    return lines
  }

  public mergeSameRef(refLines) {
    let isRefStart = (text) => {
      let regexArray = [
        /^\[\d{0,3}\].+?[\,\.\uff0c\uff0e]/,
        /^\d+[\.]?[^\d]+?[\,\.\uff0c\uff0e]/,
        /^[A-Z][A-Za-z]+[\,\.\uff0c\uff0e]/,
        /^[\u4e00-\u9fa5]{1,4}[\,\.\uff0c\uff0e]/
      ]
      for (let i = 0; i < regexArray.length; i++) {
        if (regexArray[i].test(text.replace(/\s+/g, ""))) {
          return true
        }
      }
      return false
    }

    let firstLine = refLines[0]
    // 已知新一行参考文献缩进
    let firstX = firstLine.x
    let ref
    for (let i = 0; i < refLines.length; i++) {
      let line = refLines[i]
      let text = line.text 
      let error = line.x - firstX
      error = error > 0 ? error : -error
      if (error < line.height && isRefStart(text)) {
        // new ref start
        ref = line
      } else {
        ref.text += text
        if (line.url) {
          ref.url = line.url
        }
        refLines[i] = false
      }
    }
    return refLines.filter(e => e)
  }

  public alignColumns(refLines) {
    let firstLine = refLines[0]
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
  }

  public adjustPageOffset(refLines, leftSortedX, rightSortedX) {
    console.log(leftSortedX, rightSortedX)
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
  }

  public updateItemsAnnotions(items, annotations) {
    // annotations {rect: [416, 722, 454, 733]}
    // items {transform: [...x, y], width: 82}
    let toBox = (rect) => {
      let [left, bottom, right, top] = rect;
      return {left, bottom, right, top}
    }
    let isIntersect = (A, B) => {
      if (
        B.right < A.left || 
        B.left > A.right || 
        B.bottom > A.top ||
        B.top < A.bottom
      ) {
        return false
      } else {
        return true
      }
    }
    annotations.forEach(annotation => {
      let annoBox = toBox(annotation.rect)
      items.forEach(item => {
        let [x, y] = item.transform.slice(4)
        let itemBox = toBox([x, y, x + item.width, y + item.height])
        if (isIntersect(annoBox, itemBox)) {
          item["url"] = annotation?.url || annotation?.unsafeUrl
        }
      })
    })
  }

  public removeMargin(lines) {
    // 第一行与第二行间距过大，跳过第一行
    if (lines[0].y - lines[1].y > lines[0].height * 1.5) {
      lines[0] = false
    }
    return lines.filter(e=>e)
    // TODO
    // if (lines.slice(-2)[0].y - lines.slice(-2)[0].y)
  }

  async getRefLines() {
    const PDFViewerApplication = this.Addon.views.reader._iframeWindow.wrappedJSObject.PDFViewerApplication;
    await PDFViewerApplication.pdfLoadingTask.promise;
    await PDFViewerApplication.pdfViewer.pagesPromise;
    let pages = PDFViewerApplication.pdfViewer._pages
    this.debug(pages)
    let refLines = []
    let flag = false
    let leftSortedX, rightSortedX
    for (let i = pages.length - 1; i >= 0; i--) {
      this.debug("current page", i)
      let pdfPage = pages[i].pdfPage

      let items = (await pdfPage.getTextContent()).items
      let annotations = (await pdfPage.getAnnotations())
      // add URL to item with annotation
      this.updateItemsAnnotions(items, annotations)
      this.debug("after updateItemsAnnotions", this.copy(items))

      let lines = this.mergeSameTop(items)
      await this.Zotero.Promise.delay(1000);
      this.debug("after mergeSameTop", this.copy(lines))

      // 需要记录一下column，防止相邻页布局更改
      let maxWidth = pdfPage._pageInfo.view[2];
      let maxHeight = pdfPage._pageInfo.view[3];
      this.debug(maxWidth, maxHeight);
      [leftSortedX, rightSortedX] = this.recordLayout(lines, maxWidth / 2)
      // 判断是否含有参考文献
      let line = lines.reverse().find(line => {
        return (
          /(\u53c2\u8003\u6587\u732e|reference)/i.test(line.text) ||        
          line.text.includes("参考文献") ||
          line.text.includes("Reference") ||
          line.text.includes("REFERENCES")
        ) && line.text.length < 20
      })
      lines.reverse()
      let breakIndex = lines.indexOf(line);
      this.debug("breakIndex", breakIndex)
      if (breakIndex != -1) {
        flag = true
        refLines = [...this.removeMargin(lines.slice(breakIndex + 1)), ...refLines]
        break
      } else {
        refLines = [...this.removeMargin(lines), ...refLines]
      }
    }
    if (flag) {
      // leftSortedX, rightSortedX记录的是参考文献页面
      this.adjustPageOffset(refLines, leftSortedX, rightSortedX)
      this.alignColumns(refLines)
      return refLines
    } else {
      return []
    }
  }

  public copy(obj) {
    return JSON.parse(JSON.stringify(obj))
  }

  public parseContent(content) {
    if (this.isChinese(content)) {
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
    } else {
      let authors = []
      content = content.replace(/[\u4e00-\u9fa5]/g, "")
      const authorRegexs = [/[A-Za-z,\.\s]+?\.?[\.,;]/g, /[A-Z][a-z]+ et al.,/]
      authorRegexs.forEach(regex => {        
        content.match(regex)?.forEach(author => {
          authors.push(author.slice(0, -1))
        })
      })
      let title = content
        .split(/[,\.]\s/g)
        .filter((e: string)=>!e.includes("http"))
        .sort((a,b)=>b.length-a.length)[0]
      return [title, authors[0]]
    }
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
    if (!cnkiURL && title) {
      return await this.getCnkiURL(title.slice(0, parseInt(String(title.length/2))), author)
    } else if (!title) {
      this.Addon.views.showProgressWindow("CNKI", "知网检索失败", "fail")
      return false
    }
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
    return (text.match(/[^a-zA-Z]/g)?.length || 0) / text.length > .9
  }

  public isDOI(text) {
    return this.Addon.absoluteDOIRegex.test(text)
  }

  public getReader() {
    return this.Zotero.Reader.getByTabID(((this.window as any).Zotero_Tabs as typeof Zotero_Tabs).selectedID)
  }
}

export default Utils