FROM node:24-bookworm-slim

ENV NODE_ENV=development \
    R_BRIDGE_PYTHON=/app/.venv/bin/python \
    R_BRIDGE_SCRIPT=/app/scripts/r_bridge.py \
    VITE_EVE_TARGET=http://127.0.0.1:4274

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    git \
    python3 \
    python3-pip \
    python3-venv \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN python3 -m venv .venv \
  && .venv/bin/pip install --upgrade pip \
  && .venv/bin/pip install -e ./r \
  && .venv/bin/python scripts/r_bridge.py export-catalog --output public/r-catalog.json \
  && npm run web:build \
  && npm run build

EXPOSE 4274 5173

CMD ["sh", "-lc", "npm run start:local & npm run web:docker"]
