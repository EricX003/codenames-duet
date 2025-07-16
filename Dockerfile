############ 1️⃣  Build React bundle ############
FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client .
RUN npm run build      # outputs to client/dist

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
