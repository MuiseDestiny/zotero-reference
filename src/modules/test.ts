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




// 统计与参考文献数量一致的引文
let dests = {
  "af0005": [
    {
      "num": 511,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    522,
    545,
    522
  ],
  "af0010": [
    {
      "num": 511,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    513,
    545,
    513
  ],
  "bb0005": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0010": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0015": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0020": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0025": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0030": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0035": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0040": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0045": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0050": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0055": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0060": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    365,
    545,
    365
  ],
  "bb0065": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    333,
    545,
    333
  ],
  "bb0070": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    310,
    545,
    310
  ],
  "bb0075": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    294,
    545,
    294
  ],
  "bb0080": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    254,
    545,
    254
  ],
  "bb0085": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    230,
    545,
    230
  ],
  "bb0090": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    198,
    545,
    198
  ],
  "bb0095": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    166,
    545,
    166
  ],
  "bb0100": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    142,
    545,
    142
  ],
  "bb0105": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    118,
    545,
    118
  ],
  "bb0110": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    86,
    545,
    86
  ],
  "bb0115": [
    {
      "num": 42,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0120": [
    {
      "num": 42,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0125": [
    {
      "num": 42,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0130": [
    {
      "num": 42,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0135": [
    {
      "num": 42,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0140": [
    {
      "num": 42,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0145": [
    {
      "num": 42,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0150": [
    {
      "num": 42,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0160": [
    {
      "num": 42,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0165": [
    {
      "num": 42,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0170": [
    {
      "num": 42,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb0175": [
    {
      "num": 42,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb9000": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "bb9900": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    278,
    545,
    278
  ],
  "cr0005": [
    {
      "num": 511,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    142,
    545,
    142
  ],
  "f0005": [
    {
      "num": 4,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    63,
    545,
    63
  ],
  "f0010": [
    {
      "num": 8,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    369,
    545,
    369
  ],
  "f0015": [
    {
      "num": 15,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "f0020": [
    {
      "num": 15,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    63,
    545,
    63
  ],
  "f0025": [
    {
      "num": 20,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    692,
    545,
    692
  ],
  "f0030": [
    {
      "num": 24,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "f0035": [
    {
      "num": 24,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    63,
    545,
    63
  ],
  "f0040": [
    {
      "num": 34,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    693,
    545,
    693
  ],
  "fo0005": [
    {
      "num": 4,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "fo0010": [
    {
      "num": 4,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    346,
    545,
    346
  ],
  "fo0015": [
    {
      "num": 8,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    292,
    545,
    292
  ],
  "fo0020": [
    {
      "num": 8,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    221,
    545,
    221
  ],
  "fo0025": [
    {
      "num": 8,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    147,
    545,
    147
  ],
  "fo0030": [
    {
      "num": 8,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    335,
    545,
    335
  ],
  "fo0035": [
    {
      "num": 8,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    195,
    545,
    195
  ],
  "fo0040": [
    {
      "num": 12,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "fo0045": [
    {
      "num": 12,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "fo0050": [
    {
      "num": 12,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "fo0055": [
    {
      "num": 12,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "fo0060": [
    {
      "num": 12,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "fo0065": [
    {
      "num": 12,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    362,
    545,
    362
  ],
  "fo0070": [
    {
      "num": 12,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    302,
    545,
    302
  ],
  "fo0075": [
    {
      "num": 12,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    231,
    545,
    231
  ],
  "fo0080": [
    {
      "num": 12,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    173,
    545,
    173
  ],
  "fo0085": [
    {
      "num": 12,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "fo0090": [
    {
      "num": 29,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "maintitle": [
    {
      "num": 511,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "s0005": [
    {
      "num": 511,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    239,
    545,
    239
  ],
  "s0010": [
    {
      "num": 1,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "s0015": [
    {
      "num": 1,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "s0020": [
    {
      "num": 1,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "s0025": [
    {
      "num": 4,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "s0030": [
    {
      "num": 4,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "s0035": [
    {
      "num": 12,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "s0040": [
    {
      "num": 15,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "s0045": [
    {
      "num": 24,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "s0050": [
    {
      "num": 29,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "s0055": [
    {
      "num": 29,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    354,
    545,
    354
  ],
  "s0060": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "s0065": [
    {
      "num": 12,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "section14": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    201,
    545,
    201
  ],
  "section15": [
    {
      "num": 38,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "t0005": [
    {
      "num": 1,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    288,
    545,
    288
  ],
  "t0010": [
    {
      "num": 29,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    743,
    545,
    743
  ],
  "t0015": [
    {
      "num": 29,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    155,
    545,
    155
  ],
  "tf0005": [
    {
      "num": 1,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    63,
    545,
    63
  ],
  "tf0010": [
    {
      "num": 29,
      "gen": 0
    },
    {
      "name": "FitR"
    },
    0,
    63,
    545,
    63
  ]
}
const statistics: any = {}
Object.keys(dests).forEach(key => {
  let _key = key.replace(/\d/g, "")
  statistics[_key] ??= 0
  statistics[_key] += 1
})
const totalNum = 36
let refKey = Object.keys(statistics).find(k => statistics[k] == totalNum)
let refKeys: any = []
Object.keys(dests).forEach(key => {
  if (key.replace(/\d/g, "") == refKey) {
    refKeys.push(key)
  }
})
console.log(refKeys)











