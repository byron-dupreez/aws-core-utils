'use strict';

const contexts = require('./contexts');
const Promises = require('core-functions/promises');
const copying = require('core-functions/copying');
const copy = copying.copy;

const appErrors = require('core-functions/app-errors');
const BadRequest = appErrors.BadRequest;
const strings = require('core-functions/strings');
const isNotBlank = strings.isNotBlank;

const logging = require('logging-utils');
const LogLevel = logging.LogLevel;
const log = logging.log;

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
exports._ = '_'; //IDE workaround

// Configures a standard context for an API Gateway exposed Lambda (re-exported from contexts module for convenience)
exports.configureStandardContext = contexts.configureStandardContext;

  // Functions to assist with failing an AWS Gateway exposed Lambda callback and preserve the information of the error thrown
exports.failCallback = failCallback;
exports.failCallbackForApiGateway = failCallback; // Synonym for failCallback

exports.generateHandlerFunction = generateHandlerFunction;

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
 * @param {(function(): (Object|StandardContext))|undefined|Object|StandardContext} [generateContext] - an optional function that will be used to generate the initial context to be configured & used (OR or an optional LEGACY module-scope context from which to copy an initial standard context)
 * @param {(function(): (Object|StandardSettings))|undefined|Object|StandardSettings} [generateSettings] - an optional function that will be used to generate initial standard settings to use (OR optional LEGACY module-scoped settings from which to copy initial settings to use)
 * @param {(function(): (Object|StandardOptions))|undefined|Object|StandardOptions} [generateOptions] -  an optional function that will be used to generate initial standard options to use (OR optional LEGACY module-scoped options from which to copy initial options to use)
 * @param {function(event: AWSEvent, context: StandardContext)} fn - your function that must accept the AWS event and a standard context and ideally return a Promise
 * @param {LogLevel|string|undefined} [logRequestResponseAtLogLevel] - an optional log level at which to log the request (i.e.
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
function generateHandlerFunction(generateContext, generateSettings, generateOptions, fn,
  logRequestResponseAtLogLevel, allowedHttpStatusCodes, invalidRequestMsg, failureMsg, successMsg) {
  /**
   * An API-Gateway exposed Lambda handler function.
   * @param {Object} event - the AWS event passed to your handler
   * @param {Object} awsContext - the AWS context passed to your handler
   * @param {Callback} callback - the AWS Lambda callback function passed to your handler
   */
  function handler(event, awsContext, callback) {
    let context = undefined;
    const deep = {deep: true};
    try {
      // Configure the context as a standard context
      context = typeof generateContext === 'function' ? generateContext() :
        generateContext && typeof generateContext === 'object' ? copy(generateContext, deep) : {};
      if (!context) context = {};

      const settings = typeof generateSettings === 'function' ? copy(generateSettings(), deep) :
        generateSettings && typeof generateSettings === 'object' ? copy(generateSettings, deep) : undefined;

      const options = typeof generateOptions === 'function' ? copy(generateOptions(), deep) :
        generateOptions && typeof generateOptions === 'object' ? copy(generateOptions, deep) : undefined;

      // Configure the context as a standard context
      contexts.configureStandardContext(context, settings, options, event, awsContext, false);

      // Optionally log the request
      if (logRequestResponseAtLogLevel && logging.isValidLogLevel(logRequestResponseAtLogLevel)) {
        context.log(logRequestResponseAtLogLevel, 'Request:', JSON.stringify(event));
      }

      // Execute the given function
      Promises.try(() => fn(event, context))
        .then(response => {
          // Optionally log the response
          if (logRequestResponseAtLogLevel && logging.isValidLogLevel(logRequestResponseAtLogLevel)) {
            context.log(logRequestResponseAtLogLevel, 'Response:', JSON.stringify(response));
          }

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
            context.error(isNotBlank(failureMsg) ? failureMsg : 'Failed to execute Lambda', err);
            failCallback(callback, err, awsContext, undefined, undefined, allowedHttpStatusCodes);
          }
        });

    } catch (err) {
      log(context, LogLevel.ERROR, isNotBlank(failureMsg) ? failureMsg : 'Failed to execute Lambda', err);
      // Fail the Lambda callback
      failCallback(callback, err, awsContext, undefined, undefined, allowedHttpStatusCodes);
    }
  }

  return handler;
}