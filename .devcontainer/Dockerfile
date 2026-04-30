FROM node:22-alpine

WORKDIR /workspace

RUN apk add --no-cache git bash curl

COPY dms_backend/package*.json ./dms_backend/
COPY frontend/package*.json ./frontend/

RUN cd dms_backend && npm ci
RUN cd frontend && npm ci

COPY . .

CMD ["/bin/sh"]