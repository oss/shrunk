FROM node:20

WORKDIR /usr/shrunk/frontend/

# Copy frontend dependencies list
COPY package.json package-lock.json ./

# Install and run the frontend
CMD [ "sh", "-c", "npm install && npm run dev" ]