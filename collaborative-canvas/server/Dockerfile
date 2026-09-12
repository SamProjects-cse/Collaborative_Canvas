FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm exec tsc
EXPOSE 8080
CMD ["node", "dist/index.js"]