require("dotenv").config();
const bodyParser = require("koa-bodyparser");
const jwt = require("jsonwebtoken");
// ===========================================================================
const C = require("./core");
const U = require("./util");
const M = require("./middleware");
const V = require("./validation");
const A = require("./auth");

C.router
  .post("/signup", V.validateUserCredentials, addUser)
  .post("/login", V.validateUserCredentials, loginUser)
  .get(
    "/time",
    A.bearerAuthentication,
    A.userPermissionGuard("get_time"),
    getTime
  )
  .get(
    "/data/form",
    A.bearerAuthentication,
    getQuestion({ firstTimeOnly: false })
  )
  .get(
    "/data/first-time-form",
    A.bearerAuthentication,
    getQuestion({ firstTimeOnly: true })
  )
  .post(
    "/data/question",
    A.bearerAuthentication,
    A.userPermissionGuard("add_question"),
    V.validateQuestion,
    addQuestion
  )
  .delete(
    "/data/question/:id",
    A.bearerAuthentication,
    A.userPermissionGuard("delete_question"),
    deleteQuestion,
  )
  .post(
    "/data/submission",
    A.bearerAuthentication,
    V.validateSubmission,
    addSubmission
  )
  .get(
    "/data/submission",
    A.bearerAuthentication,
    A.userPermissionGuard("get_submission"),
    getSubmission
  );

C.app
  .use(C.pino)
  .use(bodyParser())
  .use(M.continueMiddleware)
  .use(M.errorHandler)
  .use(M.logRequestBasic)
  .use(C.router.routes())
  .use(C.router.allowedMethods())
  .listen(3000);

// ===========================================================================
/**
 * @typedef {{ id: number, email: string }} User
 * @typedef {Koa.ParameterizedContext<Koa.DefaultState & { user?: User }, Koa.DefaultContext & { continue: boolean }, any>} Context
 * @typedef {Koa.Next} Next
 * */

async function addUser(/** @type {Context} */ ctx) {
  const { email, password } = ctx.request.body;
  const res = await C.pool
    .query(
      `insert into app.user (email, password)
     values ($1, crypt($2, gen_salt('bf', 8)))`,
      [email, password]
    )
    .catch(U.duplicateKeyHandler(ctx));
  if (!ctx.continue) return;

  ctx.body = "OK";
  ctx.status = 201;
}

async function loginUser(/** @type {Context} */ ctx) {
  const { email, password } = ctx.request.body;
  const res = await C.pool.query(
    `select id, email from app.user
     where email = $1 and password = crypt($2, password)`,
    [email, password]
  );

  if (res.rowCount === 0) {
    ctx.status = 401;
    ctx.body = "Unauthorized";
    return;
  }

  const user = res.rows[0];

  const token = jwt.sign(user, process.env.JWT_SECRET ?? "secret");

  ctx.body = { token };
}

async function getTime(/** @type {Context} */ ctx) {
  const res = await C.pool.query("select now()");
  ctx.body = res.rows[0];
  ctx.status = 200;
}

function getQuestion({ firstTimeOnly = null } = {}) {
  return async function (/** @type {Context} */ ctx) {
    const res = await queryQuestion({ firstTimeOnly });
    ctx.body = res.rows;
    ctx.status = 200;
  };
}

async function queryQuestion({ firstTimeOnly = null } = {}) {
  return await C.pool.query(
    `select
     id, kind, content, options, per_person, first_time_only
     from app.question
     ${firstTimeOnly === null ? "" : "where first_time_only = $1"}`,
    [].concat(firstTimeOnly === null ? [] : [firstTimeOnly])
  );
}

async function addQuestion(/** @type {Context} */ ctx) {
  ctx.log.info(ctx.request.body);
  const { kind, content, options, perPerson, firstTimeOnly } = ctx.request.body;

  const res = await C.pool.query(
    `insert into
     app.question
     (kind, content, options, per_person, first_time_only)
     values ($1, $2, $3, $4, $5)`,
    [kind, content, options, perPerson, firstTimeOnly]
  );

  ctx.body = "OK";
  ctx.status = 201;
}

async function deleteQuestion(/** @type {Context} */ ctx) {
  const { id } = ctx.params;
  const res = await C.pool.query(
    `delete from app.question where id = $1`,
    [id]
  );

  ctx.body = "OK";
  ctx.status = 200;
}

async function addSubmission(/** @type {Context} */ ctx) {
  const { familyId, geoData, answers, firstTimeOnly } = ctx.request.body;
  const questions = await C.pool.query(
    `select id, kind, options
     from app.question`
  );

  ctx.log.info(questions.rows);

  // validate answers
  for (const answer of answers) {
    if (!questions.rows.find((q) => q.id == answer.questionId)) {
      ctx.status = 404;
      ctx.body = `Question ${answer.questionId} not found`;
      return;
    }

    // TODO: validate answer kind
  }

  const submission = await C.pool.query(
    `insert into app.submission
     (family_id, geo_data, submitter)
     values ($1, $2, $3)
     returning id`,
    [familyId, geoData, ctx.state.user.id]
  );

  for (const answer of answers) {
    await C.pool.query(
      `
      insert into app.answer
      (submission, question, content, person_number)
      values ($1, $2, $3, $4)
    `,
      [
        submission.rows[0].id,
        answer.questionId,
        answer.content,
        answer.personNumber,
      ]
    );
  }

  ctx.body = "OK";
  ctx.status = 201;
}

async function getSubmission(/** @type {Context} */ ctx) {
  const res = await C.pool.query(
    `select
     s.id,
     s.family_id,
     s.geo_data as "geoData",
     sub.email as submitter,
     array_agg(json_build_object(
        'answerId', a.id,
        'questionId', a.question,
        'question', q.content,
        'answer', a.content,
        'personNumber', a.person_number
      )) as answers
     from app.submission s
     left join app.user sub on s.submitter = sub.id
     inner join app.answer a on a.submission = s.id
     left join app.question q on a.question = q.id
     group by s.id, sub.email`
  );

  ctx.body = res.rows;
  ctx.status = 200;
}
