#! /bin/bash

cp -n apps.default.env apps.env

docker compose down -v
