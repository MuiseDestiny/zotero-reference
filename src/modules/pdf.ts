import { config } from "../../package.json";
import Utils from "./utils";


/**
 * 解析PDF的参考文献
 */
class PDF {
  public refRegex: RegExp[][];
  public utils: Utils;
  constructor(utils: Utils) {
    this.utils = utils
    this.refRegex = [
      [/^[A-Z]\w.+?\(\d+[a-z]?\)/], // Polygon (2023a)
      [/^\[\d{0,3}\].+?[\,\.\uff0c\uff0e]?/], // [10] Polygon
      [/^\uff3b\d{0,3}\uff3d.+?[\,\.\uff0c\uff0e]?/],  // ［1］
      [/^\[.+?\].+?[\,\.\uff0c\uff0e]?/], // [RCK + 20] 
      [/^\d+[^\d]+?[\,\.\uff0c\uff0e]?/], // 1. Polygon
      [/^[A-Z][A-Za-z]+[\,\.\uff0c\uff0e]?/, /^.+?,.+.,/, /^[\u4e00-\u9fa5]{1,4}[\,\.\uff0c\uff0e]?/],  // 中文
    ];
  }

  async getReferences(reader: _ZoteroTypes.ReaderInstance): Promise<ItemInfo[]> {
    let refLines = await this.getRefLines(reader)
    Zotero.ProgressWindowSet.closeAll();
    if (refLines.length == 0) {
      (new ztoolkit.ProgressWindow("[Fail] PDF"))
        .createLine({
          text: "Function getRefLines: 0 refLines",
          type: "fail"
        })
        .show();
      return []
    }

    let references = this.mergeSameRef(refLines)
    if (references.length > 0) {
      (new ztoolkit.ProgressWindow("[Done] PDF"))
        .createLine({
          text: `${references.length} references`,
          type: "success"
        })
        .show();
    } else {
      (new ztoolkit.ProgressWindow("[Fail] PDF"))
        .createLine({
          text: "Function mergeSameRef: 0 reference",
          type: "fail"
        })
        .show();
    }
    console.log("references", references)
    for (let i = 0; i < references.length; i++) {
      let ref = references[i]
      ref.text = ref.text
        .trim()
        .replace(/^[^0-9a-zA-Z]\s*\d+\s*[^0-9a-zA-Z]/, "")
        .replace(/^\d+[\.\s]?/, "")
        .trim()
      references[i] = {
        text: ref.text,
        ...this.utils.refText2Info(ref.text),
      } as ItemInfo
    }
    return references as ItemInfo[]
  }

  /**
   * Merge patrs with the same height to one part
   * @param items 
   * @returns 
   */
  private mergeSameLine(items: PDFItem[]) {
    let toLine = (item: PDFItem) => {
      let line: PDFLine = {
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
    let lines: PDFLine[] = [toLine(items[j])]
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
        // lastLine.height = hh.sort((a, b) => a - b)[parseInt(String(hh.length / 2))]
        // 用最大值
        lastLine.height = hh.sort((a, b) => b-a)[0]

        // 新的一行
        lines.push(line)
      }
    }
    return lines
  }

  /**
   * 如果是参考文献格式的开头，返回类型；否则返回-1
   * @param text 
   * @returns 
   */
  private getRefType(text: string): number {
    for (let i = 0; i < this.refRegex.length; i++) {
      let flags = new Set(this.refRegex[i].map(regex => regex.test(text.replace(/\s+/g, ""))))
      if (flags.has(true)) {
        return i
      }
    }
    return -1
  }

  /**
   * 把多行合并为一个完整的参考文献
   * @param refLines 
   * @returns 
   */
  private mergeSameRef(refLines: any[]) {
    const _refLines = [...refLines]
    console.log(this.copy(_refLines))
    let firstLine = refLines[0]
    // 已知新一行参考文献缩进
    let firstX = firstLine.x
    let secondLine = refLines.slice(1).find(line => {
      return line.x != firstX && this.abs(line.x - firstX) < 10 * firstLine.height
    })
    console.log(secondLine)
    let indent = secondLine ? firstX - secondLine.x : 0
    console.log("indent", indent)
    let refType = this.getRefType(firstLine.text)
    console.log(firstLine.text, refType)
    let ref
    for (let i = 0; i < refLines.length; i++) {
      let line = refLines[i] as PDFLine
      let text = line.text as string
      let lineRefType = this.getRefType(text)
      if (
        // this.abs(line.x - firstX) < line.height * 1.2 &&
        (
          indent == 0 &&
          lineRefType != -1 &&
          lineRefType == refType &&
          this.abs(firstX - line.x) < (this.abs(indent) || line.height) * .5
        ) ||
        (
          indent != 0 &&
          _refLines.find(_line => {
            let flag = (
              line != _line &&
              (line.x - _line.x) * indent > 0 &&
              this.abs(line.x - _line.x) >= this.abs(indent) &&
              this.abs(this.abs(line.x - _line.x) - this.abs(indent)) < 2 * line.height
            )
            return flag
          }) !== undefined
        )
      ) {
        ref = line
        console.log("->", line.text)
      } else if (ref) {
        if (ref && this.abs(this.abs(ref.x - line.x) - this.abs(indent)) > 5 * line.height) {
          refLines = refLines.slice(0, i)
          console.log("x", line.text, this.abs(this.abs(ref.x - line.x) - this.abs(indent)), 5 * line.height)
          break
        }
        console.log("+", text)
        // Poly-
        // gon
        // -> Polygon
        ref.text = ref.text.replace(/-$/, "") + (ref.text.endsWith("-") ? "" : " ") + text
        if (line.url) {
          ref.url = line.url
        }
        // @ts-ignore
        refLines[i] = false
      }
    }
    return refLines.filter(e => e)
  }

  /**
   * 判断A和B两个矩形是否几何相交
   * @param A 
   * @param B 
   * @returns 
   */
  private isIntersect(A: Box, B: Box): boolean {
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

  /**
   * 为items每个item更新对应annotations中annotation的链接信息
   */
  private updateItemsAnnotions(items: PDFItem[], annotations: PDFAnnotation[]) {
    // annotations {rect: [416, 722, 454, 733]}
    // items {transform: [...x, y], width: 82}
    let toBox = (rect: number[]) => {
      let [left, bottom, right, top] = rect;
      return { left, bottom, right, top }
    }
    annotations.forEach((annotation: PDFAnnotation) => {
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

  /**
   * 读取PDF一页面为lines对象
   * @param pdfPage 
   * @returns 
   */
  private async readPdfPage(pdfPage: any) {
    let textContent = await pdfPage.getTextContent()
    let items: PDFItem[] = textContent.items.filter((item: PDFItem) => item.str.trim().length)
    if (items.length == 0) { return [] }
    let annotations: PDFAnnotation[] = (await pdfPage.getAnnotations())
    console.log("items", this.copy(items))
    // add URL to item with annotation
    this.updateItemsAnnotions(items, annotations)

    // merge items with the same y to lines
    let lines = this.mergeSameLine(items) as PDFLine[];
    return lines
  }

  private async getRefLines(reader:_ZoteroTypes.ReaderInstance) {
    const PDFViewerApplication = (reader._iframeWindow as any).wrappedJSObject.PDFViewerApplication;
    await PDFViewerApplication.pdfLoadingTask.promise;
    await PDFViewerApplication.pdfViewer.pagesPromise;
    let pages = PDFViewerApplication.pdfViewer._pages;
    // skip the pdf with page less than 3
    let pageLines: any = {};
    // read 2 page to remove head and tail
    let maxWidth: number, maxHeight: number

    const minPreLoadPageNum = parseInt(Zotero.Prefs.get(`${config.addonRef}.preLoadingPageNum`) as string)
    let preLoadPageNum = pages.length > minPreLoadPageNum ? minPreLoadPageNum : pages.length
    const popupWin = new ztoolkit.ProgressWindow("[Pending] PDF", {closeTime: -1});
    popupWin.createLine({
      text: `[0/${preLoadPageNum}] Analysis PDF`,
      type: "success",
      progress: 1
    }).show();

    for (let pageNum = pages.length - 1; pageNum >= pages.length - preLoadPageNum; pageNum--) {
      let pdfPage = pages[pageNum].pdfPage
      maxWidth = pdfPage._pageInfo.view[2];
      maxHeight = pdfPage._pageInfo.view[3];

      let lines = await this.readPdfPage(pdfPage)
      if (lines.length == 0) { continue }
      pageLines[pageNum] = lines;
      let pct = ((pages.length - pageNum) / preLoadPageNum) * 100
      popupWin.changeLine({
        text: `[${pages.length - pageNum}/${preLoadPageNum}] Read text`,
        progress: pct > 90 ? 90 : pct
      })
    }
    // analysis maxPct
    // 可能奇数页没有，偶数有
    let parts: any = []
    let part = []
    let refPart = undefined
    for (let pageNum = pages.length - 1; pageNum >= 1; pageNum--) {
      let show = true
      if (show) { console.log("\n\n---------------------", "current page", pageNum + 1) }
      let pdfPage = pages[pageNum].pdfPage
      maxWidth = pdfPage._pageInfo.view[2];
      maxHeight = pdfPage._pageInfo.view[3];
      if (show) { console.log(maxWidth, maxHeight) }
      let lines: any
      if (pageNum in pageLines) {
        lines = [...pageLines[pageNum]]
      } else {
        lines = await this.readPdfPage(pdfPage);
        pageLines[pageNum] = [...lines]
        let p = pages.length - pageNum
        popupWin.changeLine({ text: `[${p}/${p}] Read PDF` });
      }
      if (lines.length == 0) { continue }
      console.log("lines", lines)

      // 移除PDF页面首尾关于期刊页码等信息
      // 正向匹配移除PDF顶部无效信息
      let removeLines = new Set()
      let removeNumber = (text: string) => {
        // 英文页码
        if (/^[A-Z]{1,3}$/.test(text)) {
          text = ""
        }
        // 正常页码1,2,3
        text = text.replace(/\s+/g, "").replace(/\d+/g, "")
        return text
      }
      let isIntersectLines = (lineA: any, lineB: any) => {
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
      let isRepeat = (line: PDFLine, _line: PDFLine) => {
        let text = removeNumber(line.text)
        let _text = removeNumber(_line.text)
        return text == _text && isIntersectLines(line, _line)
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
          ["forward", "backward"].forEach((direction: string) => {
            if (directions[direction as keyof typeof directions].done) { return }
            let factor = directions[direction as keyof typeof directions].factor
            let index = factor * offset + (factor > 0 ? 0 : -1)
            let line = lines.slice(index)[0]
            let _line = _lines.slice(index)[0]
            if (isRepeat(line, _line)) {
              // 认为是相同的
              line[direction] = true
              removeLines.add(line)
            } else {
              directions[direction as keyof typeof directions].done = true
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
      lines = lines.filter((e: any) => !(e.forward || e.backward || (e.repeat && e.repeat > preLoadPageNum / 2)));
      if (lines.length == 0) { continue }
      if (show) { console.log("remove", [...removeLines]) }

      // 分栏
      // 跳过图表影响正常分栏
      let isFigureOrTable = (text: string) => {
        text = text.replace(/\s+/g, "")
        const flag = /^(Table|Tab|Fig|Figure).*\d/i.test(text)
        if (flag) {
          console.log("Skip", text)
        }
        return flag
      }
      lines = lines.filter((e: PDFLine) => !isFigureOrTable(e.text))
      let columns = [[lines[0]]]
      for (let i = 1; i < lines.length; i++) {
        let line = lines[i]
        let column = columns.slice(-1)[0]
        if (
          (line.y > column.slice(-1)[0].y) ||
          column
            .map(_line => Number(line.x > _line.x + _line.width))
            .reduce((a, b) => a + b) == column.length ||
          column
            .map(_line => Number(line.x + line.width < _line.x))
            .reduce((a, b) => a + b) == column.length
        ) {
          columns.push([line])
        } else {
          column.push(line)
        }
      }
      if (show) { console.log("columns", this.copy(columns)) }
      columns.forEach((column, columnIndex) => {
        column.forEach(line => {
          line["column"] = columnIndex
          line["pageNum"] = pageNum
        })
      })
      if (show) { console.log("remove indent", this.copy(lines)) }

      // part
      let isStart = false
      let donePart = (part: any[]) => {
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
            line["_x"] = line.x;
            line["_offset"] = offset;
            line.x = parseInt((line.x - offset).toFixed(1));
          })
        })
        parts.push(part)
        return part
      }
      let isRefBreak = (text: string) => {
        text = text.replace(/\s+/g, "")
        return /(\u53c2\u8003\u6587\u732e|reference)/i.test(text) && text.length < 20
      }

      // 分析最右下角元素
      let endLines = lines.filter((line: PDFLine) => {
        return lines.every((_line: PDFLine) => {
          if (_line == line) { return true }
          // 其它所有行都在它左上方
          return (_line.x + _line.width < line.x + line.width || _line.y > line.y)
        })
      })
      const endLine = endLines.slice(-1)[0]
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
          console.log("Not start, skip", line.text, line.y)
          continue
        } else {
          isStart = true
        }
        // 前一页第一行与当前页最后一行
        if (
          part.length > 0 && part.slice(-1)[0].height != line.height
        ) {
          console.log("前一页第一行与当前页最后一行")
          donePart(part)
          part = [line]
          continue
        }
        // push之前判断
        if (isRefBreak(line.text)) {
          console.log("isRefBreak", line.text)
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
          if (isRefBreak(lines[i - 1].text)) {
            console.log("isRefBreak", lines[i - 1].text)
            refPart = donePart(part)
            break
          }
          donePart(part)
          part = []
          if (show) {
            console.log("break", line.text, " - ", lines[i - 1].text, this.copy(line), this.copy(lines[i - 1]))
          }
        }
      }
      if (refPart) {
        console.log("\n\n\nBreak by reference keyword\n\n\n")
        break
      }
    }
    popupWin.changeLine({ progress: 100});
    console.log("parts", this.copy(parts))
    if (!refPart) {
      let partRefNum = []
      for (let i = 0; i < parts.length; i++) {
        let isRefs = parts[i].map((line: PDFLine) => Number(this.getRefType(line.text) != -1))
        partRefNum.push([i, isRefs.reduce((a: number, b: number) => a + b)])
      }
      let i = partRefNum.sort((a, b) => b[1] - a[1])[0][0]
      refPart = parts[i]
    }
    console.log("refPart", this.copy(refPart))
    popupWin.changeHeadline("[Done] PDF");
    popupWin.changeLine({progress: 100});
    popupWin.startCloseTimer(3000)
    return refPart
  }

  private copy(obj: object) {
    try {
      return JSON.parse(JSON.stringify(obj))
    } catch (e) {
      console.log("Error copy", e, obj)
    }
  }

  private abs(v: number) {
    return v > 0 ? v : -v
  }
}

export default PDF;