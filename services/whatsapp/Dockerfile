FROM node:20-slim

# git + ca-certs for GitHub deps, build-essential + python3 for native addons (libsignal-node)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git ca-certificates build-essential python3-minimal make \
 && rm -rf /var/lib/apt/lists/* \
 && git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"

WORKDIR /app
COPY package*.json ./
# No --ignore-scripts: needed for libsignal-node prebuilt binary download
RUN npm install
COPY tsconfig.json ./
COPY server.ts ./
RUN npx tsc && npm prune --omit=dev

CMD ["node", "dist/server.js"]
