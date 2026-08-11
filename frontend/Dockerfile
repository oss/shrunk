# Build base for production
FROM node:24 as base

WORKDIR /usr/shrunk/frontend/

# Install dependencies
COPY package.json ./
RUN npm install --frozen-lockfile

# TODO: Openshift does not like --exclude, find out why
COPY . .

RUN npm run build

# Development target, runs node server for hot reloading
# TODO: can we do 'FROM base as dev' instead
FROM node:24 as dev

WORKDIR /usr/shrunk/frontend/
EXPOSE 3000

# Redownload dependencies since it is a new container
COPY package.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]

# Production target, strips nodejs out and serve files directly using proxy
FROM debian:bookworm-slim as prod

ENV BACKEND_URL backend

# Install apache httpd and its shibboleth module
RUN apt-get update && apt-get install -y apache2 libapache2-mod-shib ca-certificates
# Enable some modules (some of these are already enabled)
RUN a2enmod alias authz_core dir headers mime mpm_event proxy proxy_http proxy_ftp proxy_balancer proxy_wstunnel proxy_uwsgi rewrite slotmem_shm

# Also ouput logs to stdout and stderr
RUN touch /var/log/apache2/custom.log /var/log/apache2/error.log && \
    ln -sf /dev/stdout /var/log/apache2/custom.log && \
    ln -sf /dev/stderr /var/log/apache2/error.log

# Permission fix for running in kubernetes (locked down like with Openshift)
RUN mkdir -p /var/run/apache2 /var/lock/apache2 /var/log/apache2 && \
    chmod -R g=u /var/run/apache2 /var/lock/apache2 /var/log/apache2 /etc/apache2 /var/log/apache2/custom.log /var/log/apache2/error.log && \
    chown -R 1001:0 /var/run/apache2 /var/lock/apache2 /var/log/apache2 /etc/apache2 /var/log/apache2/custom.log /var/log/apache2/error.log

# Listen on port 4343 instead of 80
RUN sed -i "s/Listen 80/Listen 4343/g" /etc/apache2/ports.conf

COPY --chown=1001:0 --from=base /usr/shrunk/frontend/dist /var/www/html
COPY --chown=1001:0 --from=base /usr/shrunk/frontend/dist /etc/apache2/htdocs
COPY --chown=1001:0 ./httpd/403.html /var/www/html/403.html
COPY --chown=1001:0 ./httpd/httpd.conf /etc/apache2/conf-enabled/shrunk.conf

USER 1001
EXPOSE 4343

CMD [ "apachectl", "-D", "FOREGROUND" ]
