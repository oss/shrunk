# Build base for production
FROM node:20 as base

WORKDIR /usr/shrunk/frontend/

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

RUN npm run build

# Development target, runs node server for hot reloading
# TODO: can we do 'FROM base as dev' instead
FROM node:20 as dev

WORKDIR /usr/shrunk/frontend/
EXPOSE 3000

# Redownload dependencies since it is a new container
COPY package.json package-lock.json ./
RUN npm install

COPY --exclude=.npm --exclude=node_modules . .

CMD ["npm", "run", "dev"]

# Production target, strips nodejs out and serve files directly using proxy
FROM httpd:2.4 as prod

EXPOSE 4343

COPY --from=build /usr/shrunk/frontend/dist /var/www/html
COPY --from=build /usr/shrunk/frontend/dist /usr/local/apache2/htdocs
COPY ./httpd/httpd.conf usr/local/apache2/conf/httpd.conf

# Install and run the frontend
CMD [ "sh", "-c", "npm install && npm run dev" ]
