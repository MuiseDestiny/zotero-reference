import { PDFLine, PDFItem, PDFAnnotation, ItemInfo } from "./types";
import { addonName, addonID, addonRef } from "../package.json";
import Utils from "./utils";


/**
 * 解析PDF的参考文献
 * TODO - 加入解析图表的功能
 */
class PDF {
	public refRegex: RegExp[][];
	private progressWindow: any;
	private progressWindowIcon: object;
	public utils: Utils;
	constructor(utils) {
		this.utils = utils
		this.refRegex = [
			[/^[A-Z]\w.+?\(\d+[a-z]?\)/], // Polygon (2023a)
			[/^\[\d{0,3}\].+?[\,\.\uff0c\uff0e]?/], // [10] Polygon
			[/^\uff3b\d{0,3}\uff3d.+?[\,\.\uff0c\uff0e]?/],  // ［1］
			[/^\[.+?\].+?[\,\.\uff0c\uff0e]?/], // [RCK + 20] 
			[/^\d+[^\d]+?[\,\.\uff0c\uff0e]?/], // 1. Polygon
			[/^[A-Z][A-Za-z]+[\,\.\uff0c\uff0e]?/, /^.+?,.+.,/, /^[\u4e00-\u9fa5]{1,4}[\,\.\uff0c\uff0e]?/],  // 中文
		];
		this.progressWindowIcon = {
			success: "chrome://zotero/skin/tick.png",
			fail: "chrome://zotero/skin/cross.png",
			default: `chrome://${addonRef}/skin/favicon.png`,
		};
	}

	async getReferences(reader: _ZoteroReaderInstance): Promise<ItemInfo[]> {
		// try {
		let refLines = await this.getRefLines(reader)
		if (refLines.length == 0) {
			this.showProgressWindow("[Fail] Zotero Reference", "Function getRefLines: 0 refLines", "fail")
			return []
		}

		let references = this.mergeSameRef(refLines)

		if (references.length > 0) {
			this.showProgressWindow("[Done] Zotero Reference", `${references.length} references`, "success")
		} else {
			this.showProgressWindow("[Fail] Zotero Reference", "Function mergeSameRef: 0 reference", "fail")
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
				type: "journalArticle",
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
	private mergeSameLine(items) {
		let toLine = (item) => {
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
				lastLine.height = hh.sort((a, b) => a - b)[parseInt(String(hh.length / 2))]
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
	private getRefType(text): number {
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
	private mergeSameRef(refLines) {
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
			let line = refLines[i]
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
							this.abs(this.abs(line.x - _line.x) >= this.abs(indent)) &&
							this.abs(this.abs(line.x - _line.x) - this.abs(indent)) < 2 * line.height
							// this.abs(this.abs(line.x - _line.x) - this.abs(indent)) <= line.height
						)
						return flag
					}) !== undefined
				)
			) {
				ref = line
				console.log("->", line.text)
			} else {
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
	private isIntersect(A, B): boolean {
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
	private updateItemsAnnotions(items, annotations) {
		// annotations {rect: [416, 722, 454, 733]}
		// items {transform: [...x, y], width: 82}
		let toBox = (rect) => {
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
	private async readPdfPage(pdfPage) {
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

	private async getRefLines(reader) {
		const PDFViewerApplication = (reader._iframeWindow as any).wrappedJSObject.PDFViewerApplication;
		await PDFViewerApplication.pdfLoadingTask.promise;
		await PDFViewerApplication.pdfViewer.pagesPromise;
		let pages = PDFViewerApplication.pdfViewer._pages;
		// skip the pdf with page less than 3
		let pageLines = {};
		// read 2 page to remove head and tail
		let maxWidth, maxHeight
		
		const minPreLoadPageNum = parseInt(Zotero.ZoteroReference.prefs.get("preLoadingPageNum") as string)
		let preLoadPageNum = pages.length > minPreLoadPageNum ? minPreLoadPageNum : pages.length

		const progressWindow = this.showProgressWindow(
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
			if (lines.length == 0) { continue }
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
			if (show) { console.log("\n\n---------------------", "current page", pageNum + 1) }
			let pdfPage = pages[pageNum].pdfPage
			maxWidth = pdfPage._pageInfo.view[2];
			maxHeight = pdfPage._pageInfo.view[3];
			if (show) { console.log(maxWidth, maxHeight) }
			let lines
			if (pageNum in pageLines) {
				lines = [...pageLines[pageNum]]
			} else {
				lines = await this.readPdfPage(pdfPage);
				pageLines[pageNum] = [...lines]
			}
			if (lines.length == 0) { continue }
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
			if (lines.length == 0) { continue }
			if (show) { console.log("remove", [...removeLines]) }

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
						line["_x"] = line.x;
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
					console.log("Not start, skip", line.text, line.y)
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
					if (isRefBreak(lines[i - 1].text)) {
						refPart = donePart(part)
						break
					}
					donePart(part)
					part = []
					if (show) {
						console.log("break", line.text, " - ", lines[i - 1].text)
					}
				}
			}
			if (refPart) {
				console.log("\n\n\nBreak by reference keyword\n\n\n")
				break
			}
		}
		console.log("parts", this.copy(parts))
		if (!refPart) {
			let partRefNum = []
			for (let i = 0; i < parts.length; i++) {
				let isRefs = parts[i].map(line => Number(this.getRefType(line.text) != -1))
				partRefNum.push([i, isRefs.reduce((a, b) => a + b)])
			}
			let i = partRefNum.sort((a, b) => b[1] - a[1])[0][0]
			refPart = parts[i]
		}
		console.log("refPart", this.copy(refPart))
		progressWindow.changeHeadline("[Done] Zotero Reference");
		progressWindow.startCloseTimer(5000)
		return refPart
	}

	private copy(obj) {
		try {
			return JSON.parse(JSON.stringify(obj))
		} catch {
			console.log(obj)
		}
	}

	private abs(v) {
		return v > 0 ? v : -v
	}

	/**
	 * @param header 
	 * @param context 
	 * @param type 
	 * @param t 
	 * @param maxLength 
	 * @returns 
	 */
	private showProgressWindow(
		header: string,
		context: string,
		type: string = "default",
		time: number = 5000,
		maxLength: number = 100
	) {
		console.log(arguments)
		if (this.progressWindow) {
			this.progressWindow.close();
		}
		let progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
		this.progressWindow = progressWindow
		progressWindow.changeHeadline(header);
		progressWindow.progress = new progressWindow.ItemProgress(
			this.progressWindowIcon[type],
			(maxLength > 0 && context.length > maxLength) ? context.slice(0, maxLength) + "..." : context
		);
		progressWindow.show();
		if (time > 0) {
			progressWindow.startCloseTimer(time);
		}
		return progressWindow
	}
}

export default PDF;