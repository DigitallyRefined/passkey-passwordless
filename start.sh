#!/usr/bin/env bash

cp -n .default.env .env

docker_available=false
if command -v docker &>/dev/null && (curl -s --unix-socket /var/run/docker.sock http/_ping 2>&1 >/dev/null || curl -s --unix-socket ~/.colima/docker.sock http/_ping 2>&1 >/dev/null); then
  docker_available=true
fi

if [[ $OSTYPE == 'darwin'* && ":$PATH:" != "/opt/homebrew/opt/gnu-sed"* ]]; then
  brew install gnu-sed
  export PATH="/opt/homebrew/opt/gnu-sed/libexec/gnubin:$PATH"
fi

if $docker_available; then
  sed -i -E 's/API_URL(.*):3000/API_URL\1:4000/' ./.env
else
  export DOCKER_AVAILABLE=$docker_available
  sed -i -E 's/API_URL(.*):4000/API_URL\1:3000/' ./.env
fi

source .env

if $docker_available; then
  docker compose build
  docker compose down
  docker compose up
else
  npm install
  cd web
  npm run dev &
  npm run build
  cd -
  npm --prefix ./api start
fi

wait
