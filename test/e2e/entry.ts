/**
 * Entry point of the E2E build: the normal plugin plus the harness. When the
 * pref zoteroreference.e2e.resultsPath is set (only in the E2E profile), the harness
 * runs all scenarios after the first startup, writes the results and quits Zotero.
 */
import '../../src/index';
import { runAll } from './harness';

// A scenario restarts the plugin, which loads this bundle again; the harness runs once.
if (!(Zotero as any)._zoteroReferenceE2E) {
  (Zotero as any)._zoteroReferenceE2E = true;
  const results = Zotero.Prefs.get('zoteroreference.e2e.resultsPath');
  Zotero.debug(`[Reference E2E] harness installed, resultsPath=${results}`);
  if (results) void runAll();
}
