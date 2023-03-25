#! /bin/bash

cp -n apps.default.env apps.env

npm install

if command -v docker &>/dev/null && curl -s --unix-socket /var/run/docker.sock http/_ping 2>&1 >/dev/null; then
  sed -i -E 's/apiUrl:(.*):3000/apiUrl:\1:4000/' ./config.ts
  npm run build
  cp ./config.ts ./api/

  docker compose pull
  docker compose down
  docker compose up
else
  sed -i -E 's/apiUrl:(.*):4000/apiUrl:\1:3000/' ./config.ts
  npm run build
  cp ./config.ts ./api/

  npm --prefix ./api start
fi
