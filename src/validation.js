const j = require("joi");
const U = require("./util");

const userCredentialsSchema = j
  .object()
  .keys({
    email: j.string().email().required(),
    password: j.string().min(8).required(),
  })
  .required();

const questionSchema = j
  .object()
  .keys({
    kind: j.string().valid("yes_no", "text", "number").required(),
    content: j.string().required(),
    options: j.object().default({}),
    perPerson: j.boolean().default(false),
    firstTimeOnly: j.boolean().default(false),
  })
  .required();

const submissionSchema = j
  .object()
  .keys({
    firstTimeOnly: j.boolean().default(false),
    familyId: j.string().required(),
    geoData: j.object().required(),
    answers: j
      .array()
      .items(
        j
          .object()
          .keys({
            questionId: j.number().required(),
            personNumber: j.number().default(null),
            content: j
              .object()
              .keys({
                yesNo: j.boolean(),
                text: j.string(),
                number: j.number(),
              })
              .required(),
          })
      )
      .default([]),
  })
  .required();

function validateUserCredentials(
  /** @type {Context} */ ctx,
  /** @type {Next} */ next
) {
  return U.validate(userCredentialsSchema)(ctx, next);
}

function validateQuestion(
  /** @type {Context} */ ctx,
  /** @type {Next} */ next
) {
  return U.validate(questionSchema)(ctx, next);
}

function validateSubmission(
  /** @type {Context} */ ctx,
  /** @type {Next} */ next
) {
  return U.validate(submissionSchema)(ctx, next);
}

module.exports = {
  validateUserCredentials,
  validateQuestion,
  validateSubmission,
};
