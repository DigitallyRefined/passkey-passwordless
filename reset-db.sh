#!/usr/bin/env bash

cp -n .default.env .env

docker compose down -v
