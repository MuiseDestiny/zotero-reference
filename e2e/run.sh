#!/usr/bin/env bash
# E2E tests: builds the E2E variant of the plugin (in the build container), then runs it
# in real Zotero builds under Xvfb, one after the other. Headless, Docker only.
#
#   e2e/run.sh                     all versions of the matrix below
#   e2e/run.sh 10.0.3              only the given version(s)
#
# Output per version (results.json, zotero.log, screenshots) lands in e2e/out/<version>/.
set -uo pipefail
cd "$(dirname "$0")/.."

# Full output of every run goes to logs/e2e.log (line-buffered via tee).
mkdir -p logs
exec > >(tee logs/e2e.log) 2>&1
echo "== $(date -Is) $0 $*"

DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then DOCKER=(sudo docker); fi

# Latest downloadable build of each supported major version.
VERSIONS=("$@")
[ ${#VERSIONS[@]} -eq 0 ] && VERSIONS=(7.0.32 8.0.4 9.0.4 10.0.3)

./build.sh e2e || exit 1

summary=()
failed=0
for v in "${VERSIONS[@]}"; do
  echo "== Zotero $v"
  if ! "${DOCKER[@]}" build --progress=plain --build-arg ZOTERO_VERSION="$v" -t "zotero-reference-e2e:$v" e2e/; then
    summary+=("Zotero $v: image build failed"); failed=1; continue
  fi
  mkdir -p "e2e/out/$v"
  "${DOCKER[@]}" run --rm -u "$(id -u):$(id -g)" \
    -v "$PWD/dist":/dist:ro -v "$PWD/e2e/out/$v":/out \
    -e E2E_TIMEOUT="${E2E_TIMEOUT:-300}" \
    "zotero-reference-e2e:$v"
  status=$?
  [ $status -ne 0 ] && failed=1
  summary+=("Zotero $v: $(tail -1 "e2e/out/$v/summary.txt" 2>/dev/null || echo "no results (exit $status)")")
done

echo
echo "== Summary"
printf '%s\n' "${summary[@]}"
exit $failed
