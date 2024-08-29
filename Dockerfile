FROM node:14

WORKDIR /app

COPY package*.json ./

# Limpar o cache do npm e reinstalar as dependências para garantir que tudo está atualizado
RUN npm cache clean --force && npm install
RUN npm install -g ts-node typescript @types/node

COPY . .

EXPOSE 80

CMD ["ts-node", "server.ts"]
