#!/usr/bin/env bash

npx tsc
cp src/*.html dist/
cp src/*.css dist/

mkdir -p dist/node_modules/@simplewebauthn/browser
cp -r node_modules/@simplewebauthn/browser/dist dist/node_modules/@simplewebauthn/browser/

sed -i "s#'http://localhost:3000'#'$WEB_URL'#" dist/config.mjs
sed -i "s#'http://localhost:4000'#'$API_URL'#" dist/config.mjs
sed -i "s#'localhost'#'$WEB_HOSTNAME'#" dist/config.mjs
