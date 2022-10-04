const jwt = require("jsonwebtoken");
const C = require("./core");

async function bearerAuthentication(
  /** @type {Context} */ ctx,
  /** @type {Next}  */ next
) {
  const auth = ctx.request.headers.authorization;
  if (!auth) {
    ctx.status = 401;
    ctx.body = "Unauthorized";
    return;
  }

  const match = /^Bearer (.+)$/.exec(auth);
  if (!match) {
    ctx.status = 401;
    ctx.body = "Unauthorized";
    return;
  }

  const token = match[1];
  const user = jwt.verify(token, process.env.JWT_SECRET ?? "secret");
  ctx.state.user = user;

  await next();
}

function userPermissionGuard(/** @type {string} */ permissionName) {
  return async function userPermissionGuard(
    /** @type {Context} */ ctx,
    /** @type {Next} */ next
  ) {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = "Unauthorized";
      return;
    }

    const res = await C.pool.query(
      `select name from app.permission p
     inner join app.user u on u.id = p.uid
     where p.name = $1
     and u.id = $2`,
      [permissionName, ctx.state.user.id]
    );

    if (res.rowCount === 0) {
      ctx.status = 403;
      ctx.body = `you don't have the required permission: ${permissionName}`;
      return;
    }

    await next();
  };
}

module.exports = {
  bearerAuthentication,
  userPermissionGuard,
};
