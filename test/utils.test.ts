// Pure parsing helpers (no Zotero needed): identifiers, reference text, PDF line merging.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../src/modules/utils';

const utils = new Utils();

test('getIdentifiers finds DOI and arXiv id', () => {
  assert.equal(utils.getIdentifiers('J. Doe. A title. Nature 1, 2 (2020). doi:10.1038/s41586-020-2649-2.').DOI,
    '10.1038/s41586-020-2649-2');
  assert.equal(utils.getIdentifiers('A. Vaswani et al. Attention is all you need. arXiv:1706.03762, 2017').arXiv,
    '1706.03762');
  assert.deepEqual(utils.getIdentifiers('No identifier here'), {});
});

test('refText2Info splits authors, title, year and builds the URL', () => {
  const info = utils.refText2Info(
    'Smith, J., Miller, K. 2019. Urban heat islands in growing cities of the Ruhr area. Journal of Urban Studies, 12(3), 45-67. https://doi.org/10.1000/xyz123');
  assert.equal(info.year, '2019');
  assert.match(info.title, /Urban heat islands in growing cities/);
  assert.equal(info.identifiers.DOI, '10.1000/xyz123');
  assert.equal(info.type, 'journalArticle');
  assert.ok(info.url?.startsWith('https://doi.org/'));
});

test('refText2Info takes a quoted title and marks arXiv references as preprint', () => {
  const info = utils.refText2Info('A. Vaswani, N. Shazeer, “Attention is all you need,” arXiv:1706.03762, 2017.');
  assert.equal(info.title, 'Attention is all you need');
  assert.equal(info.type, 'preprint');
  assert.equal(info.url, 'https://arxiv.org/abs/1706.03762');
});

test('mergeSameLine joins text items on one baseline, including superscripts', () => {
  const item = (str: string, x: number, y: number, height = 10) =>
    ({ str, transform: [1, 0, 0, 1, x, y], width: str.length * 5, height, chars: [], dir: 'ltr', fontName: 'f' });
  const lines = utils.PDF.mergeSameLine([
    item('[1] Smith, J.', 50, 700), item('2019.', 120, 700), item('a', 150, 704, 5),
    item('[2] Miller, K.', 50, 680),
  ]);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].text, '[1] Smith, J. 2019. a');
  assert.equal(lines[0].height, 10);
  assert.equal(lines[1].text, '[2] Miller, K.');
});

test('refText2Info keeps the full URL of a reference', () => {
  const info = utils.refText2Info('Doe, J. 2021. Mobility data for planning practice. Available at https://www.ils-forschung.de/files/report.pdf.');
  assert.equal(info.url, 'https://www.ils-forschung.de/files/report.pdf');
});
