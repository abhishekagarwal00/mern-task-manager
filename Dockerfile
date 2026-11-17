# ---- Stage 1: build the React app ----
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Stage 2: production image (Express serves API + built React files) ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server/package*.json ./server/
RUN npm ci --omit=dev --prefix server
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

# Cloud Run injects PORT (default 8080); server.js reads process.env.PORT
EXPOSE 8080
CMD ["node", "server/server.js"]
