# pull official base image
FROM node:14.18.1-alpine

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install app dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production \
    apk add --no-cache bash curl openssl \
    curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash

COPY . ./

# run
EXPOSE 3000
CMD ["npm", "start"]