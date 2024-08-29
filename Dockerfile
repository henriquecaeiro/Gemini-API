# Imagem base
FROM node:18

# Define o diretório de trabalho no container
WORKDIR /usr/src/app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia os arquivos locais para o diretório de trabalho do container
COPY . .

# Compila o código TypeScript para JavaScript
RUN npm run build

# Listar os arquivos em dist para depuração
RUN ls -al ./dist

# Expõe a porta que o app vai rodar
EXPOSE 80

# Comando para rodar a aplicação
CMD [ "node", "dist/app.js" ]
