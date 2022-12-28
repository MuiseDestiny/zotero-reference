import AddonModule from "./module";
import Addon from "./addon";

class Utils extends AddonModule {

  constructor(parent: Addon) {
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
        let res = await Zotero.HTTP.request(
          "GET",
          configs[method].url,
          {
            responseType: "json"
          }
        )
        if (res.status == 200) {
          data = configs[method].parse(res.response)
          this.Addon.toolkit.Tool.log(data)
          this.Addon.DOIData[DOI] = data
          break
        }
      }
    }
    return data
  }

  async getTitleInfo(title: string, body: object = {}) {
    this.Addon.toolkit.Tool.log("getTitleInfo", title)
    let data
    const key = `readpaper - ${title}`
    if (key in this.Addon.DOIData) {
      data = this.Addon.DOIData[key]
    } else {
      const readpaperApi = "https://readpaper.com/api/microService-app-aiKnowledge/aiKnowledge/paper/search"
      let _body = {
        keywords: title,
        page: 1,
        pageSize: 1,
        searchType: Number(Object.values(body).length > 0)
      }
      body = { ..._body, ...body}
      let res = await Zotero.HTTP.request(
        "POST",
        readpaperApi,
        {
          responseType: "json",
          headers: {
						"Content-Type": "application/json"
					},
          body: JSON.stringify(body)
        }
      )
      data = res.response?.data?.list[0]
      if (data) {
        // TODO: 评价匹配成功度，低不返回
        this.Addon.DOIData[key] = data
      } else {
        data = undefined
      }
    }
    return data
  }

  async getTitleDOIByCrossref(title: string) {
    let res
    try {
      this.Addon.views.showProgressWindow("通过crossref查询DOI", title)
      const crossref = `https://api.crossref.org/works?query=${title}`
      res = await Zotero.HTTP.request(
        "GET",
        crossref,
        {
          responseType: "json"
        }
      )
      const DOI = res.response.message.items.filter(e=>e.type != "component")[0].DOI
      this.Addon.toolkit.Tool.log(`getTitleDOIByCrossref(${title}) -> ${DOI}`)
      return DOI
    } catch {
      this.Addon.toolkit.Tool.log("error, getTitleDOIByCrossref", res.response)
      return false
    }
  }

  async getTitleDOIByUnpaywall(title: string) {
    let res
    try {
      this.Addon.views.showProgressWindow("通过unpaywall查询DOI", title)
      const unpaywall = `https://api.unpaywall.org/v2/search?query=${title}&email=zoterostyle@polygon.org`
      res = await Zotero.HTTP.request(
        "GET",
        unpaywall,
        {
          responseType: "json"
        }
      )
      const DOI = res.response.results[0].response.doi
      this.Addon.toolkit.Tool.log(`getTitleDOIByUnpaywall(${title}) -> ${DOI}`)
      return DOI
    } catch {
      this.Addon.toolkit.Tool.log("error, getTitleDOIByUnpayWall", res.response)
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
    let refData
    // request or read data
    this.Addon.views.showProgressWindow("Crossref", `从Crossref API获取参考文献`)
    if (DOI in this.Addon.DOIRefData) {
      refData = this.Addon.DOIRefData[DOI]
    } else {
      try {
        const crossrefApi = `https://api.crossref.org/works/${DOI}/transform/application/vnd.citationstyles.csl+json`
        let res = await Zotero.HTTP.request(
          "GET",
          crossrefApi,
          {
            responseType: "json"
          }
        )
        refData = res.response.reference || []
        if (refData) {
          refData.forEach(ref => {
            if (ref.unstructured) {
              this.unpackUnstructured(ref)
            }
          })
          this.Addon.DOIRefData[DOI] = refData
        } else {
          return []
        }
        this.Addon.views.showProgressWindow("Crossref", `获取${refData.length}条参考文献`, "success")
      } catch (e) {
        this.Addon.views.showProgressWindow("Crossref", e, "fail")
        return []
      }
    }
    // analysis refData
    return refData
  }

  async getRefDataFromCNKI(URL: string) {
    let refData
    this.Addon.views.showProgressWindow("CNKI", `从知网获取参考文献`)
    if (URL in this.Addon.DOIRefData) {
      refData = this.Addon.DOIRefData[URL]
    } else {
      this.Addon.toolkit.Tool.log("get by CNKI", URL)
      // URL - https://kns.cnki.net/kcms/detail/detail.aspx?dbcode=CJFD&dbname=CJFDLAST2022&filename=ZYJH202209006&uniplatform=NZKPT&v=4RWl_k1sYrO5ij1n5KXGDdusm5zXyjI12tpcPkSPI4OMnblizxXSTsDcSTbO-AqK
      //       https://kns.cnki.net/kcms/detail/frame/list.aspx?dbcode=CJFD&filename=zyjh202209006&RefType=1&vl=
      let args = this.parseCnkiURL(URL)
      let htmltext
      htmltext = (await Zotero.HTTP.request(
        "GET",
        URL,
        {
          responseType: "text"
        }
      )).response
      const vl = htmltext.match(/id="v".+?value="(.+?)"/)[1]
      this.Addon.toolkit.Tool.log("vl", vl);
      let page = 0;
      let parser = new window.DOMParser();
      refData = []
      while (true) {
        page++
        this.Addon.toolkit.Tool.log("page", page)
        if (page >= 6) { break }
        htmltext = (await Zotero.HTTP.request(
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
        return []
      }
    }
    return refData;
  }

  async getRefDataFromURL() {
    let item = this.Addon.views.getItem()
    let itemDOI = item.getField("DOI")
    const itemTitle = item.getField("title")
    
    let refData
    if (!this.isDOI(itemDOI)) {
      let cnkiURL = item.getField("url")
      if (!cnkiURL) {
        const creators = item._creators
        let creator = (creators.length > 0 && creators[0]) || ""
        let itemAuthor = creator.lastName + creator.firstName
        this.Addon.views.showProgressWindow("CNKI", (itemAuthor.length > 0 ? itemAuthor + " " : "") + itemTitle)
        cnkiURL = await this.getCnkiURL(itemTitle, itemAuthor)
        if (!cnkiURL) { return []}
        item.setField("url", cnkiURL)
        await item.saveTx()
      }
      refData = await this.getRefDataFromCNKI(cnkiURL) 
    } else {
      if (!itemDOI || !this.isDOI(itemDOI)) {
        itemDOI = await this.getTitleDOI(itemTitle)
      }
      refData = await this.getRefDataFromCrossref(itemDOI)
    }
    return refData
  }

  async getRefDataFromPDF() {
    // try {
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

    this.Addon.toolkit.Tool.log(refData)
    for (let i = 0; i < refData.length; i++) {
      let ref = refData[i]
      let unstructured = ref.text
      console.log(unstructured)
      unstructured = unstructured
        .trim()
        .replace(/^[^0-9a-zA-Z]\s*\d+\s*[^0-9a-zA-Z]/, "")
        .replace(/^\d+[\.\s]?/, "")
        .trim()
      console.log(unstructured)
      ref["unstructured"] = unstructured
      this.unpackUnstructured(ref)
    }
    return refData
    // } catch (e) {
    //   console.error(e)
    //   this.Addon.views.showProgressWindow("PDF", e, "fail")
    //   return []
    // }
  }

  public unpackUnstructured(ref) {
    const regex = {
      "DOI": this.Addon.DOIRegex,
      "URL": /https?:\/\/[^\s]+[^\.]/
    }
    for (let key in regex) {
      if (key in ref) { continue }
      let matchedRes = (ref?.url || "").match(regex[key]) || ref.unstructured.match(regex[key])
      if (matchedRes) {
        let value = matchedRes[0] as string
        ref[key] = value
      }
    }
  }

  public mergeSameLine(items) {

    let toLine = (item) => {
      let line = {
        x: parseFloat(item.transform[4].toFixed(1)),
        y: parseFloat(item.transform[5].toFixed(1)),
        text: item.str || "",
        height: item.height,
        width: item.width,
        url: item?.url,
        _height: [item.height]
      }
      if (line.width < 0) {
        line.x += line.width
        line.width = -line.width
      }
      return line
    }

    let j = 0
    let lines = [toLine(items[j])]
    for (j = 1; j < items.length; j++) {
      let line = toLine(items[j])
      let lastLine = lines.slice(-1)[0]
      // 考虑上标下标
      if (
        line.y == lastLine.y ||
        (line.y >= lastLine.y && line.y < lastLine.y + lastLine.height) ||
        (line.y + line.height > lastLine.y && line.y + line.height <= lastLine.y + lastLine.height)
      ) {
        lastLine.text += (" " + line.text)
        lastLine.width += line.width
        lastLine.url = lastLine.url || line.url
        // 记录所有高度
        lastLine._height.push(line.height)
      } else {
        // 处理已完成的行，用众数赋值高度
        let hh = lastLine._height
        lastLine.height = hh.sort((a, b) => a - b)[parseInt(String(hh.length/2))]
        // 新的一行
        lines.push(line)
      }
    }
    return lines
  }

  public isRefStart(text) {
    let regexArray = [
      [/^\[\d{0,3}\].+?[\,\.\uff0c\uff0e]?/],
      [/^\uff3b\d{0,3}\uff3d.+?[\,\.\uff0c\uff0e]?/],  // ［1］
      [/^\d+[^\d]+?[\,\.\uff0c\uff0e]?/],
      [/^[A-Z][A-Za-z]+[\,\.\uff0c\uff0e]?/, /^.+?,.+.,/, /^[\u4e00-\u9fa5]{1,4}[\,\.\uff0c\uff0e]?/],
    ]
    for (let i = 0; i < regexArray.length; i++) {
      let flags = new Set(regexArray[i].map(regex => regex.test(text.replace(/\s+/g, ""))))
      if (flags.has(true)) {
          return [true, i]
      }
    }
    return [false, -1]
  }

  public mergeSameRef(refLines) {
    const _refLines = [...refLines]
    console.log(this.copy(_refLines))
    let firstLine = refLines[0]
    // 已知新一行参考文献缩进
    let firstX = firstLine.x
    let secondLine = refLines.slice(1).find(line => {
      return line.x != firstX && this.abs(line.x - firstX) < 10 * firstLine.height
    })
    this.Addon.toolkit.Tool.log(secondLine)
    let indent = secondLine ? firstX - secondLine.x : 0
    this.Addon.toolkit.Tool.log("indent", indent)
    let [_, refType] = this.isRefStart(firstLine.text)
    this.Addon.toolkit.Tool.log(firstLine.text, refType)
    let ref
    for (let i = 0; i < refLines.length; i++) {
      let line = refLines[i]
      let text = line.text as string
      let isRef = this.isRefStart(text)
      // 如果有indent
      // if (
      //   // this.abs(line.x - firstX) < line.height * 1.2 &&
      //   isRef[0] &&
      //   isRef[1] == refType &&
      //   this.abs(firstX - line.x) < (this.abs(indent) || line.height) * .5 &&
      //   (
      //     indent == undefined ||
      //     _refLines.find(_line => {
      //       let flag = (
      //         line != _line &&
      //         (line.x - _line.x) * indent > 0 && 
      //         this.abs(this.abs(line.x - _line.x) - this.abs(indent)) <= line.height
      //       )
      //       return flag
      //     }) !== undefined
      //   )
      // )
      if (
        // this.abs(line.x - firstX) < line.height * 1.2 &&
        (
          indent == 0 &&
          isRef[0] &&
          isRef[1] == refType &&
          this.abs(firstX - line.x) < (this.abs(indent) || line.height) * .5
        ) ||
        (
          indent != 0 &&
          _refLines.find(_line => {
            let flag = (
              line != _line &&
              (line.x - _line.x) * indent > 0 &&
              this.abs(this.abs(line.x - _line.x) >= this.abs(indent)) &&
              this.abs(this.abs(line.x - _line.x) - this.abs(indent)) < 2 * line.height
              // this.abs(this.abs(line.x - _line.x) - this.abs(indent)) <= line.height
            )
            return flag
          }) !== undefined
        )
      )
      {
        ref = line
        console.log("->", line.text)
      } else {
        if (ref && this.abs(this.abs(ref.x - line.x) - this.abs(indent)) > 5 * line.height) {
          refLines = refLines.slice(0, i)
          this.Addon.toolkit.Tool.log("x", line.text, this.abs(this.abs(ref.x - line.x) - this.abs(indent)), 5 * line.height)
          break
        }
        this.Addon.toolkit.Tool.log("+", text)
        ref.text += text
        if (line.url) {
          ref.url = line.url
        }
        refLines[i] = false
      }
    }
    return refLines.filter(e => e)
  }

  public isIntersect(A, B) {
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

  public updateItemsAnnotions(items, annotations) {
    // annotations {rect: [416, 722, 454, 733]}
    // items {transform: [...x, y], width: 82}
    let toBox = (rect) => {
      let [left, bottom, right, top] = rect;
      return {left, bottom, right, top}
    }
    annotations.forEach(annotation => {
      let annoBox = toBox(annotation.rect)
      items.forEach(item => {
        let [x, y] = item.transform.slice(4)
        let itemBox = toBox([x, y, x + item.width, y + item.height])
        if (this.isIntersect(annoBox, itemBox)) {
          item["url"] = annotation?.url || annotation?.unsafeUrl
        }
      })
    })
  }

  async readPdfPage(pdfPage) {
    let textContent = await pdfPage.getTextContent()
    let items = textContent.items.filter(item=>item.str.trim().length)
    let annotations = (await pdfPage.getAnnotations())

    console.log("items", this.copy(items))
    // add URL to item with annotation
    this.updateItemsAnnotions(items, annotations)

    // merge items with the same y to lines
    let lines = this.mergeSameLine(items);
    return lines
  }

  async getRefLines() {
    const PDFViewerApplication = this.Addon.views.reader._iframeWindow.wrappedJSObject.PDFViewerApplication;
    await PDFViewerApplication.pdfLoadingTask.promise;
    await PDFViewerApplication.pdfViewer.pagesPromise;
    let pages = PDFViewerApplication.pdfViewer._pages;
    // skip the pdf with page less than 3
    let pageLines = {};
    // read 2 page to remove head and tail
    let maxWidth, maxHeight
    const minPreLoadPageNum = parseInt(Zotero.Prefs.get(`${this.Addon.addonRef}.minPreLoadPageNum`) as string)
    let preLoadPageNum = pages.length > minPreLoadPageNum ? minPreLoadPageNum : pages.length

    const progressWindow = this.Addon.views.showProgressWindow(
      "[Pending] Zotero Reference",
      `[0/${preLoadPageNum}] Analysis PDF`,
      "success",
      -1
    );

    progressWindow.progress.setProgress(1);

    for (let pageNum = pages.length - 1; pageNum >= pages.length - preLoadPageNum; pageNum--) {
      let pdfPage = pages[pageNum].pdfPage
      maxWidth = pdfPage._pageInfo.view[2];
      maxHeight = pdfPage._pageInfo.view[3];

      let lines = await this.readPdfPage(pdfPage)
      pageLines[pageNum] = lines;
      progressWindow.progress.setProgress(((pages.length - pageNum) / preLoadPageNum) * 100)
      progressWindow.progress._itemText.innerHTML = `[${pages.length - pageNum}/${preLoadPageNum}] Read PDF`;
    }
    progressWindow.progress.setProgress(100);
    // analysis maxPct
    // 可能奇数页没有，偶数有
    let parts = []
    let part = []
    let refPart = undefined
    for (let pageNum = pages.length - 1; pageNum >= 1; pageNum--) {
      let show = pageNum + 1 == 14
      show = true
      if (show) { this.Addon.toolkit.Tool.log("\n\n---------------------", "current page", pageNum + 1) }
      let pdfPage = pages[pageNum].pdfPage
      maxWidth = pdfPage._pageInfo.view[2];
      maxHeight = pdfPage._pageInfo.view[3];
      if (show) { this.Addon.toolkit.Tool.log(maxWidth, maxHeight) }
      let lines = (pageNum in pageLines && [...pageLines[pageNum]]) || await this.readPdfPage(pdfPage);
      console.log("lines", lines)

      // 移除PDF页面首尾关于期刊页码等信息
      // 正向匹配移除PDF顶部无效信息
      let removeLines = new Set()
      let removeNumber = (text) => {
        return text.replace(/\s+/g, "").replace(/\d+/g, "")
      }
      let isIntersectLines = (lineA, lineB) => {
        let rectA = {
          left: lineA.x / maxWidth,
          right: (lineA.x + lineA.width) / maxWidth,
          bottom: lineA.y / maxHeight,
          top: (lineA.y + lineA.height) / maxHeight
        }
        let rectB = {
          left: lineB.x / maxWidth,
          right: (lineB.x + lineB.width) / maxWidth,
          bottom: lineB.y / maxHeight,
          top: (lineB.y + lineB.height) / maxHeight
        }
        return this.isIntersect(rectA, rectB)
      }
      let isRepeat = (line, _line) => {
        let text = removeNumber(line.text)
        let _text = removeNumber(_line.text)
        return text == _text && isIntersectLines(line, _line)
          // this.abs(line.x - _line.x) < line.height &&
          // this.abs(line.y - _line.y) < line.height &&
          // this.abs(line.width - _line.width) < line.height
      }
      // 存在于数据起始结尾的无效行
      for (let i of Object.keys(pageLines)) {
        if (Number(i) == pageNum) { continue }
        // 两个不同页，开始对比
        let _lines = pageLines[i]
        let directions = {
          forward: {
            factor: 1,
            done: false
          },
          backward: {
            factor: -1,
            done: false
          }
        }
        for (let offset = 0; offset < lines.length && offset < _lines.length; offset++) {
          ["forward", "backward"].forEach(direction => {
            if (directions[direction].done) { return }
            let factor = directions[direction].factor
            let index = factor * offset + (factor > 0 ? 0 : -1)
            let line = lines.slice(index)[0]
            let _line = _lines.slice(index)[0]
            if (isRepeat(line, _line)) {
              // 认为是相同的
              line[direction] = true
              removeLines.add(line)
            } else {
              directions[direction].done = true
            }
          })
        }
        // 内部的
        // 设定一个百分百正文区域防止误杀
        const content = { x: 0.2 * maxWidth, width: .6 * maxWidth, y: .2 * maxHeight, height: .6 * maxHeight }
        for (let j = 0; j < lines.length; j++) {
          let line = lines[j]
          if (isIntersectLines(content, line)) { continue }
          for (let k = 0; k < _lines.length; k++) {
            let _line = _lines[k]
            if (isRepeat(line, _line)) {
              line.repeat = line.repeat == undefined ? 1 : (line.repeat + 1)
              line.repateWith = _line
              removeLines.add(line)
            }
          }
        }
      }
      lines = lines.filter(e => !(e.forward || e.backward || (e.repeat && e.repeat > preLoadPageNum / 2)));
      if (show) { this.Addon.toolkit.Tool.log("remove", [...removeLines]) }

      // 分栏
      // 跳过图表影响正常分栏
      let isFigureOrTable = (text) => {
        text = text.replace(/\s+/g, "")
        const flag = /^(Table|Tab|Fig|Figure).*\d/i.test(text)
        if (flag) {
          console.log("Skip", text)
        }
        return flag
      }
      lines = lines.filter(e => !isFigureOrTable(e.text))
      let columns = [[lines[0]]]
      for (let i = 1; i < lines.length; i++) {
        let line = lines[i]
        let column = columns.slice(-1)[0]
        if (
          column
            .map(_line => Number(line.x > _line.x + _line.width))
            .reduce((a, b) => a + b) == column.length
          ||
          column
            .map(_line => Number(line.x + line.width < _line.x))
            .reduce((a, b) => a + b) == column.length
        ) {
          columns.push([line])
        } else {
          column.push(line)
        }
      }
      if (show) { this.Addon.toolkit.Tool.log("columns", this.copy(columns)) }
      columns.forEach((column, columnIndex) => {
        column.forEach(line => {
          line["column"] = columnIndex
          line["pageNum"] = pageNum
        })
      })
      if (show) { this.Addon.toolkit.Tool.log("remove indent", this.copy(lines)) }

      // part
      let isStart = false
      let donePart = (part) => {
        part.reverse()
        console.log("donePart", this.copy(part))
        // parts.push(part)
        // return
        // 去除缩进同一页同意栏的缩进
        let columns = [[part[0]]]
        for (let i = 1; i < part.length; i++) {
          let line = part[i];
          if (
            line.column == columns.slice(-1)[0].slice(-1)[0].column &&
            line.pageNum == columns.slice(-1)[0].slice(-1)[0].pageNum
          ) {
            columns.slice(-1)[0].push(line)
          } else {
            columns.push([line])
          }
        }
        columns.forEach(column => {
          let offset = column.map(line => line.x).sort((a, b) => a - b)[0]
          column.forEach(line => {
            line["_x"] =  line.x;
            line["_offset"] = offset;
            line.x = parseInt((line.x - offset).toFixed(1));
          })
        })
        parts.push(part)
        return part
      }
      let isRefBreak = (text) => {
        text = text.replace(/\s+/g, "")
        return /(\u53c2\u8003\u6587\u732e|reference)/i.test(text) && text.length < 20
      }

      // 分析最右下角元素
      let endLines = lines.filter(line => {
        return lines.every(_line => {
          if (_line == line) { return true }
          // 其它所有行都在它左上方
          return (_line.x + _line.width < line.x + line.width || _line.y > line.y)
        })
      })
      const endLine = endLines.slice(-1)[0]
      console.log("endLine", endLines, endLine)
      for (let i = lines.length - 1; i >= 0; i--) {
        let line = lines[i]
        // 刚开始就是图表，然后才是右下角文字，剔除图表
        if (
          !isStart && pageNum < pages.length - 1 &&
          // 图表等
          (
            // 我们认为上一页的正文（非图表）应从页面最低端开始
            line != endLine ||
            // ((line.x + line.width) / maxWidth < 0.7 && line.y > pageYmin) ||
            /(图|fig|Fig|Figure).*\d+/.test(line.text.replace(/\s+/g, ""))
          )
        ) {
          this.Addon.toolkit.Tool.log("Not start, skip", line.text, line.y)
          continue
        } else {
          isStart = true
        }
        // 前一页第一行与当前页最后一行
        if (part.length > 0 && part.slice(-1)[0].height != line.height) {
          donePart(part)
          part = [line]
          continue
        }
        // push之前判断
        if (isRefBreak(line.text)) {
          refPart = donePart(part)
          break
        }
        part.push(line)
        if (
          // 以下条件满足则页内断开
          (
            lines[i - 1] && 
            (
              line.height != lines[i - 1].height ||
              lines[i].column < lines[i - 1].column ||
              (
                line.pageNum == lines[i - 1].pageNum &&
                line.column == lines[i - 1].column &&
                this.abs(line.y - lines[i - 1].y) > line.height * 2.5
              )
            )
            // /^(\[1\]|1\.)/.test(line.text)
          )
        ) {
          if (isRefBreak(lines[i-1].text)) {
            refPart = donePart(part)
            break
          }
          donePart(part)
          part = []
          if (show) {
            this.Addon.toolkit.Tool.log("break", line.text, " - ", lines[i - 1].text)
          }
        }
      }
      if (refPart) {
        this.Addon.toolkit.Tool.log("\n\n\nBreak by reference keyword\n\n\n")
        break
      }
    }
    this.Addon.toolkit.Tool.log("parts", this.copy(parts)) 
    if (!refPart) {
      let partRefNum = []
      for (let i = 0; i < parts.length; i++) {
        let isRefs = parts[i].map(line => Number(this.isRefStart(line.text)[0]))
        partRefNum.push([i, isRefs.reduce((a, b) => a + b)])
      }
      let i = partRefNum.sort((a, b) => b[1] - a[1])[0][0]
      refPart = parts[i]
    }
    this.Addon.toolkit.Tool.log("refPart", this.copy(refPart))
    progressWindow.changeHeadline("[Done] Zotero Reference");
    progressWindow.startCloseTimer(5000)
    return refPart
  }

  public copy(obj) {
    try {
      return JSON.parse(JSON.stringify(obj))
    } catch {
      console.log(obj)
    }
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
      this.Addon.toolkit.Tool.log("parts", parts)
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
      this.Addon.toolkit.Tool.log(content, "\n->\n", title, author)
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
    this.Addon.toolkit.Tool.log("getCnkiURL", title, author)
    let cnkiURL
    let oldFunc = Zotero.Jasminum.Scrape.getItemFromSearch
    Zotero.Jasminum.Scrape.getItemFromSearch = function (htmlString) {
      try {        
        let res = htmlString.match(/href='(.+FileName=.+?&DbName=.+?)'/i)
        if (res.length) {
            return res[1]
        }
      } catch {
        console.log(htmlString)
        return undefined
      }
    }.bind(Zotero.Jasminum);
    cnkiURL = await Zotero.Jasminum.Scrape.search({ author: author, keyword: title })
    Zotero.Jasminum.Scrape.getItemFromSearch = oldFunc.bind(Zotero.Jasminum);
    console.log("cnkiURL", cnkiURL)
    if (!cnkiURL) {
      this.Addon.views.showProgressWindow("CNKI", title, "fail")
      if (title.length > 5) {
        return await this.getCnkiURL(title.slice(0, parseInt(String(title.length/2))), author)
      } else {
        this.Addon.views.showProgressWindow("CNKI", "知网检索失败", "fail")
        return false
      }
    }
    let args = this.parseCnkiURL(cnkiURL)
    cnkiURL = `https://kns.cnki.net/kcms/detail/detail.aspx?FileName=${args.FileName}&DbName=${args.DbName}&DbCode=${args.DbCode}`
    this.Addon.toolkit.Tool.log(cnkiURL)
    return cnkiURL
  }

  async createItemByJasminum(title, author) {
    let cnkiURL = await this.getCnkiURL(title, author)
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
  
  async createItemByZotero(DOI, collections) {
    var translate = new Zotero.Translate.Search();
    translate.setIdentifier({ "DOI": DOI });

    let translators = await translate.getTranslators();
    translate.setTranslator(translators);
    let libraryID = ZoteroPane.getSelectedLibraryID();

    return (await translate.translate({
      libraryID,
      collections,
      saveAttachments: true
    }))[0]
  }

  async searchItem(condition, operator, value) {
    let s = new Zotero.Search;
    s.addCondition(condition, operator, value);
    var ids = await s.search();
    let items = await Zotero.Items.getAsync(ids);
    if (items) {
      return items[0]
    }
  }

  public isChinese(text) {
    return (text.match(/[^a-zA-Z]/g)?.length || 0) / text.length > .9
  }

  public isDOI(text) {
    let res = text.match(this.Addon.DOIRegex)
    if (res) {
      return res[0] == text && !/(cnki|issn)/i.test(text)
    } else {
      return false
    }
  }

  public getReader() {
    return Zotero.Reader.getByTabID(Zotero_Tabs.selectedID) 
  }

  public abs(v) {
    return v > 0 ? v: -v
  }
  
}

export default Utils