FROM docker.io/timbru31/node-chrome@sha256:8bf8949f7f14851e274a6ef7d3e214b6a6610c57fc7cc31635521879aa00a5f4

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

ENV PA11Y_URL=localhost:3000
ENV PA11Y_THEME=light

COPY package.json package-lock.json /opt/shrunk-pa11y-ci/
RUN cd /opt/shrunk-pa11y-ci && npm ci --omit=dev --ignore-scripts

RUN mkdir workspace
COPY . .
COPY entrypoint.sh /opt/shrunk-pa11y-ci/entrypoint.sh
COPY combine-reports.js /opt/shrunk-pa11y-ci/combine-reports.js
RUN chmod +x /opt/shrunk-pa11y-ci/entrypoint.sh

ENTRYPOINT ["/opt/shrunk-pa11y-ci/entrypoint.sh"]
