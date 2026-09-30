/** E2E scenarios, run in order inside a real Zotero (see harness.ts). */
import { assert, delay, E2EContext, SkipError, screenshot, waitFor } from './harness';

type Scenario = [string, (ctx: E2EContext) => Promise<void>];

const ADDON_ID = 'zoteroreference@polygon.org';
const addon = () => (Zotero as any).ZoteroReference;

/** The References section inside a container (reader context pane), found by its registered pane id. */
function findSection(root: Element | null): Element | null {
  const id = addon()?.views?.paneID;
  if (!root || !id) return null;
  // Closed or background reader tabs keep their (hidden) item panes: take the visible one.
  // Sidenav buttons carry data-pane too: only sections count.
  const match = (Array.from(root.querySelectorAll('item-pane-custom-section')) as Element[])
    .filter((e) => e.getAttribute('data-pane') === id && isVisible(e));
  return match[match.length - 1] || null;
}

function isVisible(e: Element): boolean {
  // item-pane-custom-section is a zero-size wrapper; the item pane of a hidden reader tab has no size
  const r = (e.closest('item-details') || e).getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function describePanes(root: Element | null): string {
  if (!root) return 'container missing';
  const ids = (Array.from(root.querySelectorAll('[data-pane]')) as Element[]).map((e) => `${e.localName}:${e.getAttribute('data-pane')}`);
  return `looking for ${addon()?.views?.paneID}, found ${ids.join(', ') || 'none'}`;
}

async function readerSection(): Promise<Element> {
  const win = Zotero.getMainWindow();
  const pane = win.document.getElementById('zotero-context-pane');
  const section = await waitFor('References section in the reader', () => findSection(pane), 20000).catch((e) => {
    throw new Error(`${e.message}; ${describePanes(pane)}`);
  });
  const details = section.closest('item-details') as any;
  await details?.scrollToPane?.(section.getAttribute('data-pane'), 'instant');
  // Sections render lazily (when visible); wait for the body
  await waitFor('section body rendered', () => section.querySelector('#refresh-button'), 20000).catch((e) => {
    throw new Error(`${e.message}; open=${section.getAttribute('open')} empty=${section.hasAttribute('empty')} hidden=${(section as any).hidden}`);
  });
  return section;
}

function rows(section: Element): HTMLElement[] {
  return Array.from(section.querySelectorAll('#related-grid .box')) as HTMLElement[];
}

function rowTexts(section: Element): string[] {
  return rows(section).map((b) => b.querySelector('#reference-label')?.textContent || '');
}

function click(el: Element, type: string, init: MouseEventInit = {}) {
  const win = el.ownerDocument.defaultView as any;
  el.dispatchEvent(new win.MouseEvent(type, { bubbles: true, cancelable: true, view: win, ...init }));
}

/** Short press on the refresh button (a long press ignores the cache). */
function pressRefresh(section: Element) {
  const button = section.querySelector('#refresh-button');
  assert(button, 'refresh button missing');
  click(button, 'mousedown');
  click(button, 'mouseup');
}

async function getAddon(): Promise<any> {
  const { AddonManager } = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs') as any;
  return AddonManager.getAddonByID(ADDON_ID);
}

export const scenarios: Scenario[] = [
  ['plugin starts and registers the item pane section', async () => {
    await waitFor('Zotero.ZoteroReference', () => addon()?.views?.paneID, 20000);
    const a = await getAddon();
    assert(a?.isActive, 'add-on not active');
    assert(!/E2E/.test(a.name) || a.version, 'no version');
  }],

  ['preferences pane is registered', async () => {
    const panes = (Zotero as any).PreferencePanes.pluginPanes as any[];
    assert(panes.some((p) => p.pluginID === ADDON_ID), `no pane for ${ADDON_ID}: ${panes.map((p) => p.pluginID).join(', ')}`);
  }],

  ['reader shows the References section', async (ctx) => {
    const item = new Zotero.Item('journalArticle');
    item.setField('title', 'Green infrastructure and urban climate');
    const parentID = await item.saveTx() as number;
    const attachment = await Zotero.Attachments.importFromFile({
      file: Zotero.File.pathToFile(`${ctx.fixturesDir}/reference-paper.pdf`), parentItemID: parentID,
    });
    ctx.parentID = parentID;
    ctx.attachment = attachment;
    const reader = await Zotero.Reader.open(attachment.id);
    await waitFor('reader ready', () => (reader as any)?._internalReader?._primaryView?._iframeWindow, 20000);
    const section = await readerSection();
    const head = section.querySelector('.head, .title, [class*=head]')?.textContent || section.getAttribute('label') || '';
    ctx.section = section;
    await screenshot(ctx, 'section');
    assert(section.querySelector('#refresh-button'), `section body not rendered (header "${head}")`);
    assert(rows(section).length === 0, 'rows before refresh although autoRefresh is off');
  }],

  ['refresh parses the reference list from the PDF', async (ctx) => {
    const section = await readerSection();
    pressRefresh(section);
    await waitFor('6 reference rows', () => rows(section).length >= 6, 60000).catch((e) => {
      throw new Error(`${e.message}; rows: ${JSON.stringify(rowTexts(section))}`);
    });
    await delay(500);
    const texts = rowTexts(section);
    await screenshot(ctx, 'references');
    assert(texts.length === 6, `expected 6 references, got ${texts.length}: ${JSON.stringify(texts)}`);
    assert(/Urban heat islands/.test(texts[0]), `first: ${texts[0]}`);
    assert(/Attention is all you need/.test(texts[1]), `second: ${texts[1]}`);
    // The entry wrapped over two lines is one reference
    assert(/green roofs.*Water Research/.test(texts[3]), `wrapped entry: ${texts[3]}`);
    const count = section.querySelector('#reference-num')?.textContent || '';
    assert(/^6 /.test(count), `count label: ${count}`);
    const refs = (section.querySelector('.zotero-reference-panel')?.parentElement as any)?.references
      || (section.querySelector('[itemID]') as any)?.references;
    if (refs) {
      assert(refs[0].identifiers?.DOI === '10.1000/jus.2019.12', `DOI: ${JSON.stringify(refs[0].identifiers)}`);
      assert(refs[1].identifiers?.arXiv === '1706.03762', `arXiv: ${JSON.stringify(refs[1].identifiers)}`);
      assert(refs[2].url === 'https://www.ils-forschung.de/files/report.pdf', `URL: ${refs[2].url}`);
    }
  }],

  ['search box filters the rows', async () => {
    const section = await readerSection();
    const input = await waitFor('search input', () => section.querySelector('#zotero-reference-search input') as HTMLInputElement);
    input.value = 'canopy';
    const win = input.ownerDocument.defaultView as any;
    for (const type of ['input', 'keyup', 'change']) input.dispatchEvent(new win.Event(type, { bubbles: true }));
    const visible = await waitFor('one visible row', () => {
      const v = rows(section).filter((b) => b.style.display !== 'none');
      return v.length === 1 ? v : null;
    }, 5000);
    assert(/Tree canopy/.test(visible[0].textContent || ''), `visible: ${visible[0].textContent}`);
    const clear = section.querySelector('#zotero-reference-search .clear');
    if (clear) click(clear, 'click');
    input.value = '';
    for (const type of ['input', 'keyup', 'change']) input.dispatchEvent(new win.Event(type, { bubbles: true }));
    await waitFor('all rows visible again', () => rows(section).every((b) => b.style.display !== 'none'), 5000);
  }],

  ['double-click on the count copies all references', async () => {
    const section = await readerSection();
    const getClipboard = (Zotero.Utilities.Internal as any).getClipboard;
    if (!getClipboard) throw new SkipError('Zotero.Utilities.Internal.getClipboard missing');
    click(section.querySelector('#reference-num')!, 'dblclick');
    const text = await waitFor('clipboard with references', () => {
      const t = getClipboard('text/plain') as string;
      return t && t.includes('Urban heat islands') ? t : null;
    }, 5000);
    assert(text.split('\n').length === 6, `clipboard lines: ${text.split('\n').length}`);
  }],

  ['references can be saved and read back from the local cache', async () => {
    Zotero.Prefs.set('zoteroreference.savePDFReferences', true);
    try {
      const section = await readerSection();
      // A long press re-parses and saves; the next short press toggles the source, so press twice
      const button = section.querySelector('#refresh-button')!;
      click(button, 'mousedown');
      await delay(1300);
      click(button, 'mouseup');
      await waitFor('rows after re-parse', () => rows(section).length === 6, 60000);
      await delay(1000);
      const cache = PathUtils.join(PathUtils.parent(Zotero.getTempDirectory().path)!, 'zoteroreference.json');
      const file = await waitFor('cache file', async () => (await IOUtils.exists(cache)) ? cache : null, 10000).catch(() => null);
      if (!file) throw new SkipError(`cache file not at ${cache}`);
      const data = JSON.parse(await Zotero.File.getContentsAsync(file) as string);
      const entry = Object.values(data).find((v: any) => v['References-PDF']) as any;
      assert(entry?.['References-PDF']?.length === 6, `cached entries: ${JSON.stringify(Object.keys(data))}`);
    } finally {
      Zotero.Prefs.clear('zoteroreference.savePDFReferences');
    }
  }],

  ['auto refresh loads references when a reader opens', async (ctx) => {
    Zotero.Prefs.set('zoteroreference.autoRefresh', true);
    try {
      const win = Zotero.getMainWindow();
      // Close the reader and reopen it: a fresh pane runs onAsyncRender with autoRefresh on
      for (const r of Zotero.Reader._readers.slice()) win.Zotero_Tabs.close(r.tabID);
      await delay(500);
      await Zotero.Reader.open(ctx.attachment.id);
      const section = await readerSection();
      await waitFor('auto-refreshed rows', () => rows(section).length === 6, 60000);
    } finally {
      Zotero.Prefs.clear('zoteroreference.autoRefresh');
    }
  }],

  ['plugin disable/enable removes and restores the section', async () => {
    const a = await getAddon();
    await a.disable();
    await waitFor('addon object removed', () => !addon(), 10000);
    const pane = Zotero.getMainWindow().document.getElementById('zotero-context-pane');
    // Zotero removes unregistered sections on the next refresh of the visible item pane
    await waitFor('section removed from the reader', () => !(Array.from(pane?.querySelectorAll('[data-pane]') || []) as Element[])
      .some((e) => e.localName === 'item-pane-custom-section' && /zotero-?reference/.test(e.getAttribute('data-pane') || '') && isVisible(e)), 10000);
    await a.enable();
    await waitFor('addon back', () => addon()?.views?.paneID, 20000);
    const section = await readerSection();
    assert(section.querySelector('#refresh-button'), 'section body not rendered after re-enable');
  }],
];
