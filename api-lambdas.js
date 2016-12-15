'use strict';

const contexts = require('./contexts');
const appErrors = require('core-functions/app-errors');
const BadRequest = appErrors.BadRequest;
const strings = require('core-functions/strings');
const isNotBlank = strings.isNotBlank;

const logging = require('logging-utils');

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
  failCallbackForApiGateway: failCallback, // Synonym for failCallback

  generateHandlerFunction: generateHandlerFunction
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

/**
 * Generates a handler function for your API Gateway exposed Lambda.
 *
 * @param {StandardSettings} settings - optional settings to use to configure a standard context
 * @param {StandardOptions} options - optional options to use to configure a standard context
 * @param {function(event: AwsEvent, context: StandardContext)} fn - your function that must accept the AWS event
 * and a standard context and ideally return a Promise
 * @param {string|undefined} [logRequestResponseAtLogLevel] - an optional log level at which to log the request (i.e.
 * AWS event) and response; if log level is undefined or invalid, then logs neither
 * @param {number[]|undefined} [allowedHttpStatusCodes] - an optional array of HTTP status codes that are allowed to be
 * returned directly to API Gateway (without conversion to either 400 or 500). NB: 400 and 500 CANNOT be excluded and
 * are assumed to be present if omitted! If not defined, the app-errors module's list of supported HTTP status codes
 * will be used as the allowed HTTP status codes
 * @param {string|undefined} [invalidRequestMsg] - an optional message to log at warn level if your given function (fn) throws a BadRequest
 * @param {string|undefined} [failureMsg] - an optional message to log at error level on failure
 * @param {string|undefined} [successMsg] an optional message to log at info level on success
 * @returns {AwsLambdaHandlerFunction} a handler function for your API Gateway exposed Lambda
 */
function generateHandlerFunction(settings, options, fn, logRequestResponseAtLogLevel, allowedHttpStatusCodes, invalidRequestMsg, failureMsg, successMsg) {
  /**
   * An API-Gateway exposed Lambda handler function.
   * @param {Object} event - the AWS event passed to your handler
   * @param {Object} awsContext - the AWS context passed to your handler
   * @param {Callback} callback - the AWS Lambda callback function passed to your handler
   */
  function handler(event, awsContext, callback) {
    const context = {};
    try {
      // Configure the context as a standard context
      contexts.configureStandardContext(context, settings, options, event, awsContext, false);

      // Optionally log the request
      log('Request: ', event, logRequestResponseAtLogLevel, context);

      // Execute the given function
      Promise.try(() => fn(event, context))
        .then(response => {
          // Optionally log the response
          log('Response: ', response, logRequestResponseAtLogLevel, context);

          // Log the given success message (if any)
          if (isNotBlank(successMsg)) context.info(successMsg);

          // Succeed the Lambda callback
          callback(null, response);
        })
        .catch(err => {
          // Fail the Lambda callback
          if (err instanceof BadRequest || appErrors.getHttpStatus(err) === 400) {
            // Log the invalid request
            context.warn((isNotBlank(invalidRequestMsg) ? invalidRequestMsg : 'Invalid request') + ` - ${err.message}`);
            failCallback(callback, err, awsContext, undefined, undefined, allowedHttpStatusCodes);
          } else {
            // Log the error encountered
            context.error(isNotBlank(failureMsg) ? failureMsg : 'Failed to execute Lambda', err.stack);
            failCallback(callback, err, awsContext, undefined, undefined, allowedHttpStatusCodes);
          }
        });

    } catch (err) {
      (context.error ? context.error : console.error)(isNotBlank(failureMsg) ? failureMsg : 'Failed to execute Lambda', err.stack);
      // Fail the Lambda callback
      failCallback(callback, err, awsContext, failureMsg, failureCode, allowedHttpStatusCodes);
    }
  }

  return handler;
}

function log(prefix, object, logLevel, context) {
  if (isNotBlank(logLevel)) {
    const msg = `${isNotBlank(prefix) ? prefix : ''}${JSON.stringify(object)}`;
    switch (logLevel.toLowerCase()) {
      case logging.INFO:
        context.info(msg);
        break;
      case logging.DEBUG:
        context.debug(msg);
        break;
      case logging.TRACE:
        context.trace(msg);
        break;
      case logging.WARN:
        context.warn(msg);
        break;
      case logging.ERROR:
        context.error(msg);
        break;
      default:
        context.warn(`Unexpected log level (${logLevel})`);
        break;
    }
  }
}
