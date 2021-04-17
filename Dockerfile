FROM node:15.14.0
#RUN apk add --no-cache python g++ make
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install
ENV NODE_ENV=production
COPY . .
RUN npm install -g typescript
RUN tsc
CMD ["npm", "start"]