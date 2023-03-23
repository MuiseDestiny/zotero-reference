let text = `Müller,  D.,  Ansmann,  A.,  Mattis,  I.,  Tesche,  M.,  Wandinger,  U.,  Althausen,  D.,  et  al.,  2007.  Aerosol-type-dependent  lidar  ratios  observed  with  Raman  lidar.  J. Geophys.  Res.-Atmos.  112  (D16)  https://doi.org/10.1029/2006JD008292.`

// text = `J. L. Deuzé et al. , “Remote sensing of aerosols over land surfaces from POLDER-ADEOS-1 polarized measurements,” J. Geophys. Res., Atmos. , vol. 106, no. D5, pp. 4913–4926, 2001.`

// text = `Liu  Zhao,  Xie  Meihui,  Tian   Kun,  et  al.  GIS-based   analysis of population exposure to PM 2.5  air pollution  — a  case  study  of  Beijing.  Journal  of  Environmental   Sciences, 2017, 9(3): 35–47`

text = `Tang, J.K., Xue, Y., Yu, T., Guan, Y.N., 2005. Aerosol optical thickness determination by exploiting the synergy of Terra and Aqua MODIS (SYNTAM). Remote Sens. Environ. 94 (3), 327 – 334.`

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
  console.log(
    ((text.indexOf(". ") != -1 && text.match(/\.\s/g)!.length >= 2) && text.split(". ") || text.split("."))
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
      }).filter((s: any) => s[1].indexOf(" ") != -1).sort((a: any, b: any) => a[0] - b[0])
  )
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
      return [count/s.length, s]
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
let res = text.match(/[^\d]\d{4}[^\d-]/g)?.map(s=>s.match(/\d+/)![0])
console.log(res)
let year = res?.find(s => {
  return Number(s) <= Number(currentYear) + 1
})!
authorInfo = authorInfo.replace(`${year}.`, "").replace(year, "").trim()

console.log({ year, title, authors: [authorInfo], publicationVenue })


let url: string
// 海外下载连接
url = "https://chn.oversea.cnki.net/kns/download?filename=aNHeqhkRDdzMvw2UTFnUQZTc1MkUFlTSwc0dYRVdjVTUrMTaGNXVqFDaQlDMxtSUJxWcFN1d0l3ZLFVbudTZ0cUM10UTxZ1MNJnQwgVMTt2LtRkRCdTdxgzNKh3LnV3a2t2LFd2M3Y2NwV0LDJ2NHZ1Q2Vldrs2Z&dflag=pdfdown&tablename=CMFD202301&uid=WEEvREcwSlJHSldSdmVqelcxWUtqSW5leXZkMlVEVmNvQkRLdzNrZlVlWT0=$9A4hF_YAuvQ5obgVAqNKPCYcEjKensW4IQMovwHtwkF4VYPoHbKxJw!!"

// 国内
url = "https://bar.cnki.net/bar/download/order?id=jBGETXBNdPImvx70aLAuJFo8d3crjALHLDOld0RphO1bXiEqLBxcsVRf8IXEghKYRsbAoyvB4t8pFeksLzfjVvLa1qBQDpNYd39QPsqTRck%2BAdZ3mr8KIdmg%2BFAvNJen2kxbbswKxAZ3OUWg%2FfUv0bmbWHgJC%2F%2FYG46PfNdNNrZWupFStSD8yjcf03O2VMLLls9vM69aHP0%2BxI6NJPhsdRjnnX8yi%2FIGEuzb3mrPMk8%3D"

url = "https://bar.cnki.net/bar/download/order?id=jBGETXBNdPImvx70aLAuJFo8d3crjALHLDOld0RphO1bXiEqLBxcsVRf8IXEghKYRsbAoyvB4t8pFeksLzfjVvLa1qBQDpNYd39QPsqTRck%2BAdZ3mr8KIdmg%2BFAvNJen2kxbbswKxAZ3OUWg%2FfUv0bmbWHgJC%2F%2FYG46PfNdNNrZWupFStSD8yjcf03O2VMLLls9vM69aHP0%2BxI6NJPhsdRjnnX8yi%2FIGEuzb3mrPMk8%3D"

url = "https://bar.cnki.net/bar/download/order?id=jBGETXBNdPImvx70aLAuJFo8d3crjALHLDOld0RphO0KhyPF734saLzIB+EF6RKqRsbAoyvB4t8pFeksLzfjVsxwPp4K+66uDnLl3DLldtyWe2B4bzlShB9aiSprM3iHDDclC8kkzF6Zx/8reCznd6MyOKG6TRFsYxhPzREhEyjyAn7s65pJLGTvBiTAVoevX7NKt3gfqsfSLnNkOF24VwfJ7N/Wrhd6gC1DFIaoUog="

url = "https://bar.cnki.net/bar/download/order?id=jBGETXBNdPImvx70aLAuJFo8d3crjALHLDOld0RphO0M1VkagSb5x7GcASwxx0iiRsbAoyvB4t8pFeksLzfjVi5SM7s/86mTvAXHrnC8ed0+AdZ3mr8KIdmg+FAvNJen2kxbbswKxAZ3OUWg/fUv0bmbWHgJC//YG46PfNdNNrZWupFStSD8yjcf03O2VMLLfJb8xBGjujueyLqrZI1seNkmcPwzObtshd7+5QKKdUU="

url = "https://bar.cnki.net/bar/download/order?id=jBGETXBNdPImvx70aLAuJFo8d3crjALHLDOld0RphO0KhyPF734saLzIB+EF6RKqRsbAoyvB4t8pFeksLzfjVsxwPp4K+66uDnLl3DLldtyWe2B4bzlShB9aiSprM3iHAbvcFAjVH/7AxWdCESGtoqMyOKG6TRFsYxhPzREhEyjyAn7s65pJLGTvBiTAVoevX7NKt3gfqsfSLnNkOF24VwfJ7N/Wrhd6gC1DFIaoUog="