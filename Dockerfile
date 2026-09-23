# Glama builds this image and checks that the server starts and answers an introspection
# request, which is the listing requirement punkpeye/awesome-mcp-servers enforces via its bot.
# Two stages so the shipped image carries no TypeScript toolchain.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# --ignore-scripts matters: `prepare` runs `tsc`, which is a devDependency and absent here.
# Without it this layer fails on an image that has nothing to build.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist
# The bundled snapshot. The server prefers the live dataset and falls back to this, so the
# image answers correctly even with no network — which is the state introspection runs in.
COPY data ./data

ENTRYPOINT ["node", "dist/index.js"]
