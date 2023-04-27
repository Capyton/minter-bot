# Specify a base image
FROM node:19-bullseye-slim

# Specify a working directory
WORKDIR /usr/src/app

# Copy the dependencies file
COPY ./package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy project dir
COPY ./ ./

# Launch app
CMD ["npm", "start"]