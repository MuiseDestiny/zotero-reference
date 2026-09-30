// Writes the E2E fixture PDF into the given directory. No dependencies.
//   reference-paper.pdf  3 pages: title + body, body, "References" with 6 numbered entries
//                        (DOI, arXiv id and URL among them, one entry wrapped over two lines).
import fs from 'node:fs';
import path from 'node:path';

function writePdf(file, pages) {
  const esc = (s) => s.replace(/[\\()]/g, (c) => '\\' + c);
  const objects = [];
  const add = (body) => { objects.push(body); return objects.length; };
  const catalog = add(null);
  const pagesObj = add(null);
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const kids = [];
  for (const lines of pages) {
    const ops = ['BT', '/F1 10 Tf', '13 TL', '50 790 Td', ...lines.map((l) => `(${esc(l)}) Tj T*`), 'ET'].join('\n');
    const content = add(`<< /Length ${Buffer.byteLength(ops)} >>\nstream\n${ops}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  fs.writeFileSync(file, out, 'latin1');
}

const WORDS = ('city climate rain planning water soil area park tree street roof air wind measurement model data ' +
  'method result study district administration participation funding sealing runoff evaporation shade').split(' ');
let seed = 11;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
function prose(n) {
  const lines = [];
  for (let i = 0; i < n; i++) {
    const ws = Array.from({ length: 13 }, () => WORDS[rnd() % WORDS.length]);
    ws[0] = ws[0][0].toUpperCase() + ws[0].slice(1);
    lines.push(ws.join(' ') + '.');
  }
  return lines;
}

export const REFERENCES = [
  // Lines must fit the page width (about 100 characters), pdf.js drops text beyond the page edge.
  '[1] Smith, J., Miller, K. 2019. Urban heat islands in growing cities. J Urban Stud. doi:10.1000/jus.2019.12',
  '[2] Vaswani, A., Shazeer, N. 2017. Attention is all you need. arXiv:1706.03762',
  '[3] Doe, J. 2021. Mobility data for planning. https://www.ils-forschung.de/files/report.pdf',
  '[4] Brown, L., Green, P. 2015. Stormwater retention with green roofs in dense districts.',
  '    Water Research, 80, 1-12.',
  '[5] Weber, M. 2012. Participation and funding of neighbourhood parks. Planning Review, 7, 3-19.',
  '[6] Klein, S., Wolf, T. 2020. Tree canopy and street temperature at night. Urban Climate, 31.',
];

const dir = process.argv[2];
fs.mkdirSync(dir, { recursive: true });
writePdf(path.join(dir, 'reference-paper.pdf'), [
  ['Green infrastructure and urban climate', 'A test paper for Zotero Reference', '', ...prose(40)],
  prose(50),
  ['References', '', ...REFERENCES],
]);
