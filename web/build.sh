#!/usr/bin/env bash

rm -Rf dist

npx tsc
cp src/*.html dist/
cp src/*.css dist/

mkdir -p dist/webauthn/node_modules/@simplewebauthn/browser
cp -r node_modules/@simplewebauthn/browser/dist dist/webauthn/node_modules/@simplewebauthn/browser/

sed -i "s#'http://localhost:8000'#'$WEB_URL'#" dist/config.mjs
sed -i "s#'http://localhost:4000'#'$API_URL'#" dist/config.mjs
sed -i "s#'localhost'#'$WEB_HOSTNAME'#" dist/config.mjs
