#!/bin/zsh

set -e

cd "${0:A:h}"

LOCAL_URL="http://127.0.0.1:3000"

is_current_ugbz() {
  local url="$1"
  local expected_build_id="$2"
  node --input-type=module -e "
    const base = '${url}';
    const expectedBuildId = '${expected_build_id}';
    const [home, imposter, kniffel, buildInfoResponse] = await Promise.all([
      fetch(base).catch(() => null),
      fetch(base + '/imposter').catch(() => null),
      fetch(base + '/kniffel').catch(() => null),
      fetch(base + '/build-info.json', { cache: 'no-store' }).catch(() => null),
    ]);
    const html = home?.ok ? await home.text() : '';
    const buildInfo = buildInfoResponse?.ok ? await buildInfoResponse.json().catch(() => null) : null;
    process.exit(home?.ok && imposter?.ok && kniffel?.ok && html.includes('Kniffel') && buildInfo?.buildId === expectedBuildId ? 0 : 1);
  "
}

port_is_free() {
  local port="$1"
  ! lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
}

if [[ ! -d node_modules ]]; then
  npm install
fi

npm run build
UGBZ_BUILD_ID=$(node -p "JSON.parse(require('node:fs').readFileSync('dist/client/build-info.json', 'utf8')).buildId")

if is_current_ugbz "${LOCAL_URL}" "${UGBZ_BUILD_ID}"; then
  open "${LOCAL_URL}"
  echo "Der aktuelle UGBZ-Stand läuft bereits unter ${LOCAL_URL}"
  exit 0
fi

UGBZ_PORT=3000
if ! port_is_free "${UGBZ_PORT}"; then
  for candidate in {3001..3010}; do
    if port_is_free "${candidate}"; then
      UGBZ_PORT="${candidate}"
      break
    fi
  done
fi

if ! port_is_free "${UGBZ_PORT}"; then
  echo "UGBZ konnte keinen freien Port zwischen 3000 und 3010 finden."
  exit 1
fi

LOCAL_URL="http://127.0.0.1:${UGBZ_PORT}"
npm start -- --hostname 127.0.0.1 --port "${UGBZ_PORT}" &
UGBZ_SERVER_PID=$!

cleanup() {
  kill "${UGBZ_SERVER_PID}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

for attempt in {1..40}; do
  if is_current_ugbz "${LOCAL_URL}" "${UGBZ_BUILD_ID}"; then
    open "${LOCAL_URL}"
    echo "UGBZ läuft unter ${LOCAL_URL}"
    echo "Dieses Terminalfenster offen lassen. Mit Ctrl+C wird der Server beendet."
    wait "${UGBZ_SERVER_PID}"
    exit $?
  fi
  sleep 0.25
done

echo "UGBZ konnte nicht unter ${LOCAL_URL} gestartet werden."
exit 1
