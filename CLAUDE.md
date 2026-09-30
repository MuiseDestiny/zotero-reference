# Zotero Reference – ILS fork (Zotero plugin)

Fork of MuiseDestiny/zotero-reference ("Crush Reference"): reference list of the PDF open in the reader as an item
pane section, one-click import, bidirectional "related" links. Branch `ils`; this fork targets Zotero 7–10.
Plan and status: `../ideas-zotero-reference.md` (German) — keep it updated.

## Commands

The host has no usable Node. **Everything runs in Docker** via the scripts.

| Task | Command | Log |
|---|---|---|
| Deps, unit tests, typecheck, build, `dist/zotero-reference-<v>.xpi` | `./build.sh` | `logs/build.log` |
| Unit tests only | `./build.sh test` | `logs/build.log` |
| E2E matrix (Zotero 7.0.32, 8.0.4, 9.0.4, 10.0.3 under Xvfb) | `e2e/run.sh [version…]` | `logs/e2e.log`, `e2e/out/<version>/` |

- Run long scripts in the background and wait for `== Summary` in `logs/e2e.log`; one version takes ~2–4 min.
- Version only in `package.json` (`config` holds addon id/ref/instance); `addon/` files use `__placeholders__`,
  replaced by `scripts/build.mjs`. Fluent ids get the `zoteroreference-` prefix at build time.
- `update_url` → `https://zotero.ils.local/downloads/zotero-reference/updates.json`.
- Bug fixes go into their own commits, separate from port/feature work (upstream-PR material).

## Layout

| Path | Purpose |
|---|---|
| `addon/bootstrap.js`, `src/index.ts`, `src/hooks.ts` | Bootstrap → `Zotero.ZoteroReference` (`addon`), startup/shutdown hooks |
| `src/modules/views.ts` | Item pane section (`Zotero.ItemPaneManager.registerSection`), rows, add/remove, search, tip popup |
| `src/modules/pdf.ts` | Reference parsing from pdf.js text of the reader (`getPDFViewerApplication`) |
| `src/modules/utils.ts`, `api.ts`, `requests.ts` | Identifier/text parsing; Crossref, Semantic Scholar, arXiv, readpaper, CNKI lookups |
| `src/modules/localStorage.ts` | Reference cache `<Zotero temp dir>/../zoteroreference.json` |
| `test/*.test.ts` | Unit tests (Node runner) |
| `test/e2e/`, `e2e/` | Harness + scenarios inside Zotero; `e2e/make-pdf.mjs` builds the fixture PDF |

## Pitfalls

- Sections render lazily (`onRender`/`onAsyncRender` only once visible): the body is built in `onInit`, reset and
  auto-refreshed in `onItemChange`. Zotero reuses a pane per item.
- `item-pane-custom-section` is a zero-size wrapper; sidenav buttons also carry `data-pane`.
- `Cu.unload` and `OS.File` are gone in newer Firefox; use `IOUtils`/`PathUtils`.
- pdf.js in Zotero 7 sets `pdfLoadingTask` to null once loaded; wait for `pdfDocument`.
- Fixture lines must fit the page width: pdf.js drops text beyond the page edge.
- zotero-plugin-toolkit 5: `ZoteroToolkit` comes from `zotero-plugin-toolkit/ztoolkit`; no `getDOMParser`/`patch`.
- Removed (depended on the Zotero 6 UI): Connected Papers graph view, recommended related items.
