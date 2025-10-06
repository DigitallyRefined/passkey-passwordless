#!/usr/bin/env bash

cp -n .default.env .env

if command -v docker &>/dev/null && (curl -s --unix-socket /var/run/docker.sock http/_ping 2>&1 >/dev/null || curl -s --unix-socket /run/user/$(id -u)/docker.sock http/_ping 2>&1 >/dev/null || curl -s --unix-socket ~/.colima/docker.sock http/_ping 2>&1 >/dev/null); then
  container_runner=docker
fi
if command -v podman &>/dev/null; then
  container_runner=podman
fi

if [[ $OSTYPE == 'darwin'* && ":$PATH:" != "/opt/homebrew/opt/gnu-sed"* ]]; then
  brew install gnu-sed
  export PATH="/opt/homebrew/opt/gnu-sed/libexec/gnubin:$PATH"
fi

source .env

if [ ${container_runner} ]; then
  $container_runner compose build
  $container_runner compose down
  $container_runner compose up
else
  npm install

  npm --prefix ./web run build
  npm --prefix ./web start &

  npm --prefix ./api run build
  npm --prefix ./api start
fi

wait
