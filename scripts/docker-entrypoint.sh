#!/bin/sh
set -eu

cd /misskey

echo '[startup] Validating configuration and waiting for dependencies'
node ./scripts/wait-for-dependencies.mjs

echo '[startup] Running database migrations'
cd /misskey/packages/backend
./node_modules/.bin/typeorm migration:run -d ormconfig.js

echo '[startup] Starting yoiyami'
cd /misskey
exec node --experimental-json-modules ./packages/backend/built/index.js
