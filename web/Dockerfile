# syntax=docker/dockerfile:1

FROM node:20 AS builder

WORKDIR /app/build
COPY . .
RUN npm install

ARG WEB_HOSTNAME
ARG WEB_URL
ARG API_URL

ENV WEB_HOSTNAME $WEB_HOSTNAME
ENV WEB_URL $WEB_URL
ENV API_URL $API_URL

RUN npm run build

FROM nginx:1-alpine

COPY --from=builder /app/build/dist /usr/share/nginx/html
COPY --from=builder /app/build/node_modules/@simplewebauthn/browser/dist /usr/share/nginx/html/node_modules/@simplewebauthn/browser/dist
COPY ./etc/nginx/conf.d/mjs.conf /etc/nginx/conf.d/mjs.conf