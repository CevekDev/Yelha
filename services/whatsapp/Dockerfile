FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts
COPY tsconfig.json ./
COPY server.ts ./
RUN npx tsc && npm prune --omit=dev

CMD ["node", "dist/server.js"]
