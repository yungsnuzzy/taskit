FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tzdata
ENV TZ=UTC

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY public/ ./public/

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
