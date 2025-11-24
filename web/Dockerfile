# syntax=docker/dockerfile:1

FROM node:24.11.1 AS builder

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
CMD npm start
