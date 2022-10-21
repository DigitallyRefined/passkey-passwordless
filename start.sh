#! /bin/bash

cp -n apps.default.env apps.env

npm install
npm run build
cp ./config.ts ./api/

docker compose down
docker compose up
