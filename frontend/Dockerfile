# ── Stage 1: Build React Frontend ─────────────────────
FROM node:20-alpine AS build-stage

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files & build static dist
COPY . .
RUN npm run build

# ── Stage 2: Serve via High-Performance Nginx ──────────
FROM nginx:alpine AS production-stage

# Copy Nginx custom configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from build-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
