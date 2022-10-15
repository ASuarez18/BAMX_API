function duplicateKeyHandler(/** @type {Context}  */ ctx) {
  return async function (/** @type {Error} */ err) {
    if (err.code === "23505") {
      const detail = err.detail;
      const match = /^Key \((.+)\)=\((.+)\) already exists\.$/.exec(detail);
      const key = match[1];
      const value = match[2];

      ctx.status = 409;
      ctx.body = `${key} ${value} already exists`;
      ctx.continue = false;
      return;
    }

    throw err;
  };
}

function validate(schema) {
  return async function (/** @type {Context} */ ctx, /** @type {Next} */ next) {
    const { value, error } = schema.validate(ctx.request.body, {
      abortEarly: false,
    });

    if (error) {
      ctx.status = 400;
      ctx.body = error.message;
      return;
    }

    ctx.request.body = value;
    return await next();
  };
}

function validateQuery(schema) {
  return async function (/** @type {Context} */ ctx, /** @type {Next} */ next) {
    const { value, error } = schema.validate(ctx.query, {
      abortEarly: false,
    });

    if (error) {
      ctx.status = 400;
      ctx.body = error.message;
      return;
    }

    ctx.query = value;
    return await next();
  };
}

module.exports = {
  validate,
  validateQuery,
  duplicateKeyHandler,
};
