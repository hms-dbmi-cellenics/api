# pull official base image
FROM node:14.18.1-alpine

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install app dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Install Helm
RUN apk add --no-cache bash curl openssl
RUN curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash

# add app
ARG READONLY_API_TOKEN_GITHUB
RUN echo "READONLY_API_TOKEN_GITHUB=$READONLY_API_TOKEN_GITHUB" > .env
COPY . ./

# run
EXPOSE 3000
CMD ["npm", "start"]