#!/usr/bin/env bash
# Runs inside the E2E image: fresh profile with the E2E build of the plugin, Zotero under Xvfb.
# The harness in the plugin runs the scenarios, writes /out/results.json and quits Zotero.
set -uo pipefail

XPI=$(ls -t /dist/zotero-reference-*-e2e.xpi | head -1)
WORK=$(mktemp -d)
export HOME=$WORK/home
PROFILE=$WORK/profile
mkdir -p "$HOME" "$PROFILE/extensions" "$WORK/data" /out
rm -f /out/results.json /out/summary.txt /out/screenshot-*.png
cp "$XPI" "$PROFILE/extensions/zoteroreference@polygon.org.xpi"

cat > "$PROFILE/user.js" <<PREFS
user_pref("extensions.autoDisableScopes", 0);
user_pref("extensions.enabledScopes", 15);
user_pref("xpinstall.signatures.required", false);
user_pref("app.update.enabled", false);
user_pref("extensions.update.enabled", false);
user_pref("extensions.zotero.dataDir", "$WORK/data");
user_pref("extensions.zotero.useDataDir", true);
user_pref("extensions.zotero.sync.autoSync", false);
user_pref("extensions.zotero.zoteroreference.e2e.resultsPath", "/out/results.json");
user_pref("extensions.zotero.zoteroreference.e2e.outDir", "/out");
user_pref("extensions.zotero.zoteroreference.e2e.fixturesDir", "/fixtures");
PREFS

# Trust the in-house CAs in Zotero (NSS database of the profile).
certutil -N -d "sql:$PROFILE" --empty-password
for crt in /usr/local/share/ca-certificates/inhouse/*.crt; do
  [ -f "$crt" ] && certutil -A -d "sql:$PROFILE" -n "$(basename "$crt" .crt)" -t "C,," -i "$crt"
done

timeout "${E2E_TIMEOUT:-300}" xvfb-run -a -s "-screen 0 1600x1000x24" \
  /opt/zotero/zotero -profile "$PROFILE" -ZoteroDebugText > /out/zotero.log 2>&1
status=$?

if [ ! -f /out/results.json ]; then
  echo "E2E: no results (Zotero exit $status). See e2e/out/<version>/zotero.log" >&2
  grep -i "reference" /out/zotero.log | tail -20 >&2
  echo "no results (Zotero exit $status)" > /out/summary.txt
  exit 1
fi

node -e '
const r = require("/out/results.json");
for (const t of r.results) console.log(`${t.skipped ? "skip" : t.ok ? "ok  " : "FAIL"} ${t.name} (${t.ms} ms)${t.skipped ? " - " + t.skipped : t.ok ? "" : "\n     " + t.error}`);
const failed = r.results.filter((t) => !t.ok).length;
const line = `${r.results.length - failed}/${r.results.length} passed (Zotero ${r.zoteroVersion})`;
console.log(`\n${line}`);
require("fs").writeFileSync("/out/summary.txt", line + "\n");
process.exit(failed ? 1 : 0);
'
