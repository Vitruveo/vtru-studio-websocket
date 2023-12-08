FROM node:16

WORKDIR /app
COPY package*.json /app/

RUN npm install

COPY build ./
COPY entrypoint.sh ./

ENTRYPOINT [ "/app/entrypoint.sh" ]
CMD [ "wait" ]
