FROM docker.io/timbru31/node-chrome:24-slim

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

ENV PA11Y_URL=localhost:3000
ENV PA11Y_THEME=light

RUN npm install -g pa11y-ci
RUN mkdir workspace
COPY . .

ENTRYPOINT ["pa11y-ci"]
