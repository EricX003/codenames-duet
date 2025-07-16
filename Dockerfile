############ 1️⃣  Build React bundle ############
FROM node:20-alpine AS client-build

WORKDIR /app/client

# Copy package.json (not package-lock.json to force fresh install)
COPY client/package.json ./
RUN npm install

# Copy source files and configuration (excluding node_modules and dist via .dockerignore)
COPY client/src ./src
COPY client/index.html ./
COPY client/vite.config.js ./
COPY client/tailwind.config.cjs ./
COPY client/postcss.config.cjs ./

# Build the client
RUN npm run build

############ 2️⃣  Build server & final runtime ############
FROM node:20-alpine AS runtime

# System-wide dependencies (none needed—alpine image already small)
WORKDIR /app

# ---- server ----
COPY server/package*.json ./server/
RUN npm --prefix server ci --production

# ---- bring in server code and pre-built React bundle ----
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production \
    PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]
