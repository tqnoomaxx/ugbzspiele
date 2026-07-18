#!/bin/zsh

set -e

cd "${0:A:h}"

LOCAL_URL="http://127.0.0.1:3000"

if node --input-type=module -e "const response = await fetch('${LOCAL_URL}').catch(() => null); process.exit(response?.ok ? 0 : 1)"; then
  open "${LOCAL_URL}"
  echo "UGBZ läuft bereits unter ${LOCAL_URL}"
  exit 0
fi

if [[ ! -d node_modules ]]; then
  npm install
fi

npm run build
npm start -- --hostname 127.0.0.1 --port 3000 &
UGBZ_SERVER_PID=$!

cleanup() {
  kill "${UGBZ_SERVER_PID}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

for attempt in {1..40}; do
  if node --input-type=module -e "const response = await fetch('${LOCAL_URL}').catch(() => null); process.exit(response?.ok ? 0 : 1)"; then
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
