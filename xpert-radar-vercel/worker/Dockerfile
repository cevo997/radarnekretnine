FROM node:22-bookworm-slim
WORKDIR /app
COPY worker/package*.json ./worker/
RUN cd worker && npm ci && npx playwright install --with-deps chromium && chmod -R a+rX /root/.cache/ms-playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/browsers
RUN mv /root/.cache/ms-playwright /opt/browsers
COPY lib/*.mjs ./lib/
COPY worker/*.mjs ./worker/
RUN mkdir -p /app/worker/data && chown -R node:node /app
USER node
WORKDIR /app/worker
CMD ["node", "index.mjs"]
