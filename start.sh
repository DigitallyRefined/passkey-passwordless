#!/usr/bin/env bash

docker_available=false
if command -v docker &>/dev/null && curl -s --unix-socket /var/run/docker.sock http/_ping 2>&1 >/dev/null; then
  docker_available=true
fi

cp -n .default.env .env

if $docker_available; then
  sed -i -E 's/API_URL(.*):3000/API_URL\1:4000/' ./.env
else
  export DOCKER_AVAILABLE=$docker_available
  sed -i -E 's/API_URL(.*):4000/API_URL\1:3000/' ./.env
fi

if $docker_available; then
  docker compose build
  docker compose down
  docker compose up
else
  npm install
  cd web
  npm run dev &
  cd -
  npm --prefix ./api start
fi

wait
