#!/usr/bin/env bash

cp -n .default.env .env

if command -v docker &>/dev/null && (curl -s --unix-socket /var/run/docker.sock http/_ping 2>&1 >/dev/null || curl -s --unix-socket ~/.colima/docker.sock http/_ping 2>&1 >/dev/null); then
  docker compose down -v
fi
if command -v podman &>/dev/null; then
  podman compose down -v
fi
