#!/usr/bin/env bash
#
# Package the whole Outline project into a .zip archive.
#
# Keeps source, config, and the .git history; excludes dependencies, build
# output, caches, logs, local secrets, and runtime data.
#
# Usage:
#   scripts/package-project.sh [output.zip]
#
# If no output path is given, the archive is written to
#   ../outline-<git-short-sha-or-date>.zip

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_NAME="$(basename "$PROJECT_ROOT")"

if [[ $# -ge 1 ]]; then
  OUTPUT="$1"
else
  if git -C "$PROJECT_ROOT" rev-parse --short HEAD >/dev/null 2>&1; then
    TAG="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)"
  else
    TAG="$(date +%Y%m%d-%H%M%S)"
  fi
  OUTPUT="$(dirname "$PROJECT_ROOT")/${PROJECT_NAME}-${TAG}.zip"
fi

case "$OUTPUT" in
  /*) ;;
  *) OUTPUT="$PWD/$OUTPUT" ;;
esac

# Patterns match paths inside the zip, which are prefixed by PROJECT_NAME.
# .git is intentionally not excluded so the archive includes repository history.
EXCLUDES=(
  "$PROJECT_NAME/node_modules/*"
  "$PROJECT_NAME/*/node_modules/*"
  "$PROJECT_NAME/.yarn/install-state.gz"
  "$PROJECT_NAME/.yarn/cache/*"
  "$PROJECT_NAME/.pnp.*"
  "$PROJECT_NAME/.env"
  "$PROJECT_NAME/.env.local"
  "$PROJECT_NAME/.env.production"
  "$PROJECT_NAME/.env.*.local"
  "$PROJECT_NAME/*.pem"
  "$PROJECT_NAME/*.key"
  "$PROJECT_NAME/*.cert"
  "$PROJECT_NAME/build/*"
  "$PROJECT_NAME/dist/*"
  "$PROJECT_NAME/coverage/*"
  "$PROJECT_NAME/.cache/*"
  "$PROJECT_NAME/.turbo/*"
  "$PROJECT_NAME/.vite/*"
  "$PROJECT_NAME/data/*"
  "$PROJECT_NAME/plugins/storage/*"
  "$PROJECT_NAME/public/uploads/*"
  "$PROJECT_NAME/tmp/*"
  "$PROJECT_NAME/temp/*"
  "$PROJECT_NAME/logs/*"
  "$PROJECT_NAME/.history/*"
  "$PROJECT_NAME/.idea/*"
  "$PROJECT_NAME/*.log"
  "$PROJECT_NAME/*.tsbuildinfo"
  "$PROJECT_NAME/*/*.tsbuildinfo"
  "$PROJECT_NAME/.DS_Store"
  "$PROJECT_NAME/*/.DS_Store"
  "$PROJECT_NAME/*/*/.DS_Store"
  "$PROJECT_NAME/._*"
  "$PROJECT_NAME/*/._*"
  "$PROJECT_NAME/__MACOSX/*"
)

echo "Project : $PROJECT_ROOT"
echo "Archive : $OUTPUT"
echo "Excludes: ${EXCLUDES[*]}"
echo

rm -f "$OUTPUT"

cd "$(dirname "$PROJECT_ROOT")"
zip -ryqX "$OUTPUT" "$PROJECT_NAME" -x "${EXCLUDES[@]}"

SIZE="$(du -h "$OUTPUT" | cut -f1)"
echo "Done. ${SIZE}  ->  $OUTPUT"
