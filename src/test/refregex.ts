
let refRegex = [
  [/^\(\d+\)\s/], // (1)
  [/^\[\d{0,3}\].+?[\,\.\uff0c\uff0e]?/], // [10] Polygon
  [/^\uff3b\d{0,3}\uff3d.+?[\,\.\uff0c\uff0e]?/],  // ［1］
  [/^\[.+?\].+?[\,\.\uff0c\uff0e]?/], // [RCK + 20] 
  [/^\d+[^\d]+?[\,\.\uff0c\uff0e]?/], // 1. Polygon
  [/^\d+\s+/], // 1 Polygon
  [/^[A-Z]\w.+?\(\d+[a-z]?\)/, /^[A-Z][A-Za-z]+[\,\.\uff0c\uff0e]?/, /^.+?,.+.,/, /^[\u4e00-\u9fa5]{1,4}[\,\.\uff0c\uff0e]?/],  // 中文
];

let f = (text: string) => {
  for (let i = 0; i < refRegex.length; i++) {
    console.log(refRegex[i].map(regex => regex.test(text.replace(/\s+/g, ""))), i)
    let flags = new Set(refRegex[i].map(regex => regex.test(text.trim())))
    console.log(flags, i)
    if (flags.has(true)) {
      console.log(text, i)
      return i
    }
  }
  return -1
}

let text = "(1) Wang, L.; Wei, Z.; Yang, J.; Zhang, Y.; Zhang, F.; Su, J.; Meng"
console.log(f(
  text
),
  /^\(\d+\)\s/.test(text)
)