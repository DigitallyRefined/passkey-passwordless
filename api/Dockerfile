# syntax=docker/dockerfile:1

FROM node:20

WORKDIR /app
COPY . .
RUN npm install
ENV RUNNING_IN_DOCKER=true
CMD npm start