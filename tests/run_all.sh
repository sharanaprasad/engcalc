#!/usr/bin/env bash
# Runs every engine + UI test and reports a pass/fail summary.
# Requires Node.js 18+ and the jsdom package (installed in this folder).

set -u
cd "$(dirname "$0")"

if [ ! -d node_modules/jsdom ]; then
  echo "Installing jsdom for UI tests..."
  npm init -y >/dev/null 2>&1
  npm install jsdom >/dev/null 2>&1
fi

OK=0
FAIL=0
run() {
  local name="$1"
  local path="$2"
  local out
  out=$(node "$path" 2>&1)
  local tail
  tail=$(echo "$out" | tail -n 1)
  if echo "$tail" | grep -qiE "^(all .* passed|UI smoke test passed|all passed)$"; then
    echo "  OK   $name   -   $tail"
    OK=$((OK+1))
  else
    echo "  FAIL $name"
    echo "$out" | tail -n 20 | sed 's/^/       /'
    FAIL=$((FAIL+1))
  fi
}

echo "=== Engine tests ==="
for f in engine/test_*.js; do
  run "$f" "$f"
done

echo
echo "=== UI tests ==="
for f in ui/test_*.js; do
  run "$f" "$f"
done

echo
echo "=== Summary ==="
echo "  $OK suite(s) OK, $FAIL suite(s) failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
