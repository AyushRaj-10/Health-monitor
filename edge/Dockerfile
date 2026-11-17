FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./
RUN npm install --omit=dev

COPY config ./config
COPY src ./src

ENV NODE_ENV=production
ENV EDGE_PORT=5005
ENV BACKEND_URL=http://backend:5001/api

EXPOSE 5005

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5005/api/status || exit 1

CMD ["node", "src/simulator.js"]
