/**
 * @typedef {{ id: number, email: string }} User
 * @typedef {Koa.ParameterizedContext<Koa.DefaultState & { user?: User }, Koa.DefaultContext & { continue: boolean }, any>} Context
 * @typedef {Koa.Next} Next
 * */

async function continueMiddleware(
  /** @type {Context} */ ctx,
  /** @type {Next} */ next
) {
  ctx.continue = true;
  await next();
}

async function errorHandler(
  /** @type {Context} */ ctx,
  /** @type {Next} */ next
) {
  try {
    await next();
  } catch (/** @type {Error} */ err) {
    ctx.log.error(`${ctx.method} ${ctx.url} ${err.message}`);
    ctx.body = "Internal Server Error";
    ctx.status = 500;
  }
}

async function logRequestBasic(
  /** @type {Context} */ ctx,
  /** @type {Next} */ next
) {
  const start = Date.now();
  await next();
  const end = Date.now();
  const ms = end - start;
  ctx.log.info(`${ctx.method} ${ctx.url} - ${ms}ms`);
}

module.exports = {
  continueMiddleware,
  errorHandler,
  logRequestBasic,
};
