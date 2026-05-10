FROM node:20-slim


RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app


COPY package.json package-lock.json* ./
RUN npm install


COPY prisma ./prisma
RUN npx prisma generate


COPY src ./src
COPY .env .env


RUN mkdir -p uploads

EXPOSE 4000

CMD ["node", "src/server.js"]
