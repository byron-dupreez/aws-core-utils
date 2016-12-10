'use strict';

const contexts = require('./contexts');
const appErrors = require('core-functions/app-errors');

/**
 * Utilities for working with Lambdas exposed to AWS API Gateway, including functions to:
 * - Configure a standard context for AWS Gateway exposed Lambdas (re-exported from contexts.js module)
 * - Fail Lambda callbacks with standard AppError errors to facilitate mapping of errors to HTTP status
 *   codes on API Gateway.
 * @module aws-core-utils/api-lambdas.js
 * @see aws-core-utils/contexts#configureStandardContext
 * @see core-functions/app-errors.js#toAppErrorForApiGateway
 * @author Byron du Preez
 */
module.exports = {
  /** Configures a standard context for an API Gateway exposed Lambda (re-exported from std-contexts module for convenience) */
  configureStandardContext: contexts.configureStandardContext,

  // Functions to assist with failing an AWS Gateway exposed Lambda callback and preserve the information of the error thrown
  failCallback: failCallback,
  failCallbackForApiGateway: failCallback // Synonym for failCallback
};

/**
 * Fails the given callback of an AWS Lambda, which is exposed via API Gateway, with the given error, by first
 * attempting to convert the given error into one of the standard app errors (see {@linkcode core-functions/app-errors})
 * that will be mappable on API Gateway, and then invoking the given lambdaCallback with a JSON stringified version of
 * the converted app error. The given AWS context is used to add your Lambda's AWS request ID to the error.
 *
 * @see module:core-functions/app-errors#toAppErrorForApiGateway
 *
 * @param {Function} lambdaCallback - the callback function passed as the last argument to your Lambda function on invocation.
 * @param {Error} error - the error with which you need to fail your Lambda
 * @param {Object|undefined} [awsContext] - the AWS context passed as the second argument to your Lambda function on invocation
 * @param {string|undefined} [awsContext.awsRequestId] - the AWS context's request ID
 * @param {string|undefined} [message] - an optional message (will use error's message if not specified)
 * @param {string|undefined} [code] - an optional code (will use error's code if not specified)
 * @param {number[]|undefined} [allowedHttpStatusCodes] - an optional array of HTTP status codes that are allowed to be
 * returned directly to API Gateway (without conversion to either 400 or 500). NB: 400 and 500 CANNOT be excluded and
 * are assumed to be present if omitted! If not defined, the app-errors module's list of supported HTTP status codes
 * will be used as the allowed HTTP status codes
 */
function failCallback(lambdaCallback, error, awsContext, message, code, allowedHttpStatusCodes) {
  const appError = appErrors.toAppErrorForApiGateway(error, message, code, allowedHttpStatusCodes);
  if (awsContext && !appError.awsRequestId) appError.awsRequestId = awsContext.awsRequestId;
  lambdaCallback(JSON.stringify(appError));
}
