FROM node:20

WORKDIR /usr/shrunk/frontend/

COPY package.json package-lock.json ./

# Source: https://stackoverflow.com/a/71867505
RUN npm install -g react-scripts

CMD [ "sh", "-c", "npm install && npm run dev" ]