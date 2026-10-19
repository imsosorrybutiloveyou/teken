FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
# Optional trusted enterprise proxy CA, never copied into the resulting image.
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -s /run/secrets/proxy_ca ]; then NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca npm ci; else npm ci; fi
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
COPY server ./server
RUN npm run build
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8787
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/src/characters.js ./src/characters.js
COPY --chown=node:node package.json ./
USER node
EXPOSE 8787
CMD ["node", "server/start.js"]
