const Koa = require("koa");
const { Pool } = require("pg");
const Router = require("@koa/router");
const pretty = require("pino-pretty");
const Pino = require("koa-pino-logger");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = new Koa();
const router = new Router();
const stream = pretty({});
const pino = Pino({
  stream,
  autoLogging: false,
  serializers: {
    req: (_) => undefined,
  },
});

module.exports = {
  app,
  pool,
  router,
  pino,
};
