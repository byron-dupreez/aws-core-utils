'use strict';

const contexts = require('./contexts');
const Promises = require('core-functions/promises');
const copying = require('core-functions/copying');
const copy = copying.copy;
const merging = require('core-functions/merging');
const merge = merging.merge;
const isInstanceOf = require('core-functions/objects').isInstanceOf;

const appErrors = require('core-functions/app-errors');
const BadRequest = appErrors.BadRequest;
const strings = require('core-functions/strings');
const isString = strings.isString;
const isBlank = strings.isBlank;
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
exports._$_ = '_$_'; //IDE workaround

// Configures a standard context for an API Gateway exposed Lambda (re-exported from contexts module for convenience)
exports.configureStandardContext = contexts.configureStandardContext;

// Functions to assist with failing an AWS Gateway exposed Lambda callback and preserve the information of the error thrown
exports.failCallback = failCallback;
exports.succeedCallback = succeedCallback;
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
 * @param {Object|undefined} [error.headers] - optional headers to include in a Lambda Proxy integration error response
 * @param {string|undefined} [error.auditRef] - an optional audit reference
 * @param {string|undefined} [error.awsRequestId] - an optional AWS request ID
 * @param {Object|undefined} [awsContext] - the AWS context passed as the second argument to your Lambda function on invocation
 * @param {string|undefined} [awsContext.awsRequestId] - the AWS context's request ID
 * @param {string|undefined} [message] - an optional message (will use error's message if not specified)
 * @param {string|undefined} [code] - an optional code (will use error's code if not specified)
 * @param {Object|number[]|undefined} [opts] - optional opts to use (OR a legacy array of numeric `allowedHttpStatusCodes` parameter)
 * @param {number[]|undefined} [opts.allowedHttpStatusCodes] - an optional array of HTTP status codes that are allowed to be returned directly to API Gateway (without conversion to either 400 or 500). NB: 400 and 500 CANNOT be excluded and are assumed to be present if omitted! If not defined, the app-errors module's list of supported HTTP status codes will be used as the allowed HTTP status codes
 * @param {boolean|undefined} [opts.useLambdaProxy] - whether your Lambda is using Lambda Proxy Integration or not (defaults to false for backward compatibility)
 * @param {Object|undefined} [opts.defaultHeaders] - default custom headers to be included (if any) in a Lambda Proxy response
 * @param {undefined|function(error: AppError, auditRef: string|undefined): Object} [opts.toErrorResponse] - an optional function to use to convert the given error into an appropriate error response object to stringify & return or body to include in a Lambda Proxy response to return
 */
function failCallback(lambdaCallback, error, awsContext, message, code, opts) {
  // Check if still using legacy `allowedHttpStatusCodes` as 6th parameter
  if (!opts || typeof opts !== 'object') {
    opts = {allowedHttpStatusCodes: Array.isArray(opts) ? opts : undefined};
  }

  // Convert the error into an "API" error
  const apiError = appErrors.toAppErrorForApiGateway(error, message, code, opts.allowedHttpStatusCodes);

  // Resolve the AWS request id (if available)
  const awsRequestId = isNotBlank(error.awsRequestId) ? error.awsRequestId :
    awsContext ? awsContext.awsRequestId : undefined;
  if (awsRequestId && isBlank(apiError.awsRequestId)) apiError.awsRequestId = awsRequestId;

  // Resolve the audit reference (if available) - falling back to AWS request ID (if available)
  const auditRef = isNotBlank(error.auditRef) ? error.auditRef : awsRequestId;


  if (opts.useLambdaProxy) {
    const statusCode = apiError.httpStatus;
    const body = resolveErrorResponseBody(apiError, auditRef, opts && opts.toErrorResponse);
    const proxyResponse = toLambdaProxyResponse(statusCode, error.headers, body, opts.defaultHeaders);
    lambdaCallback(null, proxyResponse);
  } else {
    const errorResponse = resolveErrorResponse(apiError, auditRef, opts && opts.toErrorResponse);
    lambdaCallback(JSON.stringify(errorResponse), null);
  }
}

/**
 * Resolves the body of a Lambda Proxy error response to be returned, using the given `toErrorResponse` function (if any)
 * or the default `toErrorResponseBody` function (if none).
 * @param {AppError} apiError - the error with which your Lambda was failed
 * @param {string|undefined} auditRef - the audit reference to include
 * @param {undefined|function(error: AppError, auditRef: string|undefined): Object} [toErrorResponse] - an optional
 * function to use to convert the given error into an appropriate error response object to stringify & return or body to
 * include in a Lambda Proxy response to return
 * @return {Object} the body to include in the Lambda Proxy response
 */
function resolveErrorResponseBody(apiError, auditRef, toErrorResponse) {
  try {
    return typeof toErrorResponse === 'function' ? toErrorResponse(apiError, auditRef) :
      toErrorResponseBody(apiError, auditRef);
  } catch (err) {
    console.error('ERROR', err);
    // fallback to default function if given function fails
    return toErrorResponseBody(apiError, auditRef);
  }
}

/**
 * Resolves the error response to be returned, using the given `toErrorResponse` function (if any) or the given
 * `apiError` (if none).
 * @param {AppError} apiError - the error with which your Lambda was failed
 * @param {string|undefined} auditRef - the audit reference to include
 * @param {undefined|function(error: AppError, auditRef: string|undefined): Object} [toErrorResponse] - an optional
 * function to use to convert the given error into an appropriate error response object to stringify & return or body to
 * include in a Lambda Proxy response to return
 * @return {Object} the body to include in the Lambda Proxy response
 */
function resolveErrorResponse(apiError, auditRef, toErrorResponse) {
  try {
    return typeof toErrorResponse === 'function' ? toErrorResponse(apiError, auditRef) : apiError;
  } catch (err) {
    console.error('ERROR', err);
    // fallback to apiError if given function fails
    return apiError;
  }
}

/**
 * Succeeds the given callback of an AWS Lambda, which is exposed via API Gateway, with the given response or body, by
 * invoking the given lambdaCallback with a JSON stringified version of the converted app error. The given AWS context
 * is used to add your Lambda's AWS request ID to the error.
 *
 * @param {Function} callback - the callback function passed as the last argument to your Lambda function on invocation.
 * @param {Object} response - a normal or Lambda Proxy integration response to be returned
 * @param {Object|undefined} [opts] - optional opts to use
 * @param {boolean|undefined} [opts.useLambdaProxy] - whether your Lambda is using Lambda Proxy Integration or not (defaults to false for backward compatibility)
 * @param {Object|undefined} [opts.defaultHeaders] - default custom headers to be included (if any) in a Lambda Proxy response
 */
function succeedCallback(callback, response, opts) {
  if (!opts || typeof opts !== 'object') opts = {};

  if (opts.useLambdaProxy) {
    const statusCode = response && isNotBlank(response.statusCode) ? response.statusCode : 200;
    const body = (response && response.body) || response || {};
    const proxyResponse = toLambdaProxyResponse(statusCode, response && response.headers, body, opts.defaultHeaders);
    callback(null, proxyResponse);
  } else {
    callback(null, response);
  }
}

function toErrorResponseBody(apiError, auditReference) {
  const body = {code: apiError.code, message: apiError.message};
  if (apiError.cause) body.cause = apiError.cause;
  const auditRef = auditReference || apiError.auditRef;
  if (auditRef) body.auditRef = auditRef;
  if (apiError.awsRequestId) body.awsRequestId = apiError.awsRequestId;
  return body;
}

/**
 * Builds & returns a Lambda Proxy integration compatible response.
 * @param {number|string} statusCode - the HTTP status code to return
 * @param {Object|undefined} [headers] - optional response headers to use
 * @param {Object|string|undefined} [body] - an optional response body to use
 * @param {Object|undefined} [defaultHeaders] - optional default custom headers to be included in the Lambda Proxy response
 * @return {{statusCode: (number|string), headers: (Object|undefined), body: (string|undefined)}} a Lambda Proxy response
 */
function toLambdaProxyResponse(statusCode, headers, body, defaultHeaders) {
  const proxyResponse = {statusCode: statusCode};

  const headersWithDefaults = headers && defaultHeaders ? merge(defaultHeaders, copy(headers)) :
    headers || (defaultHeaders && copy(defaultHeaders));
  if (headersWithDefaults) {
    proxyResponse.headers = headersWithDefaults;
  }

  proxyResponse.body = isString(body) ? body : JSON.stringify(body);

  return proxyResponse;
}

/**
 * Generates a handler function for your API Gateway exposed Lambda. This function still supports the legacy 5th to 9th
 * parameters (logRequestResponseAtLogLevel, allowedHttpStatusCodes, invalidRequestMsg, failureMsg & successMsg) by
 * adding them to an `opts` object.
 *
 * @param {(function(): (Object|StandardContext))|undefined|Object|StandardContext} [createContext] - an optional function that will be used to create the initial context to be configured & used (OR or an optional LEGACY module-scope context from which to copy an initial standard context)
 * @param {(function(): (Object|StandardSettings))|undefined|Object|StandardSettings} [createSettings] - an optional function that will be used to create the initial standard settings to use (OR optional LEGACY module-scoped settings from which to copy initial settings to use)
 * @param {(function(): (Object|StandardOptions))|undefined|Object|StandardOptions} [createOptions] -  an optional function that will be used to create the initial standard options to use (OR optional LEGACY module-scoped options from which to copy initial options to use)
 * @param {function(event: AWSEvent, context: StandardContext)} fn - your function that must accept the AWS event and a standard context and ideally return a Promise
 * @param {Object|LogLevel|string|undefined} [opts] - optional opts to use (or legacy LogLevel/string `logRequestResponseAtLogLevel` parameter)
 * @param {boolean|undefined} [opts.useLambdaProxy] - whether your Lambda is using Lambda Proxy Integration or not (defaults to false for backward compatibility)
 * @param {Object|undefined} [opts.defaultHeaders] - default custom headers (if any) to be included in a Lambda Proxy response
 * @param {number[]|undefined} [opts.allowedHttpStatusCodes] - an optional array of HTTP status codes that are allowed to be returned directly to API Gateway (without conversion to either 400 or 500). NB: 400 and 500 CANNOT be excluded and are assumed to be present if omitted! If not defined, the app-errors module's list of supported HTTP status codes will be used as the allowed HTTP status codes
 * @param {LogLevel|string|undefined} [opts.logRequestResponseAtLogLevel] - an optional log level at which to log the request (i.e. AWS event) and response; if log level is undefined or invalid, then logs neither
 * @param {string|undefined} [opts.invalidRequestMsg] - an optional message to log at warn level if your given function (fn) throws a BadRequest
 * @param {string|undefined} [opts.failureMsg] - an optional message to log at error level on failure
 * @param {string|undefined} [opts.successMsg] an optional message to log at info level on success
 * @param {undefined|function(error: AppError, auditRef: string|undefined): Object} [opts.toErrorResponse] - an optional function to use to convert the given error into an appropriate error response object to stringify & return or body to include in a Lambda Proxy response to return
 * @returns {AwsLambdaHandlerFunction} a handler function for your API Gateway exposed Lambda
 */
function generateHandlerFunction(createContext, createSettings, createOptions, fn, opts) {
  // Check for Legacy 5th to 9th parameters: logRequestResponseAtLogLevel, allowedHttpStatusCodes, invalidRequestMsg, failureMsg, successMsg
  if (!opts || typeof opts !== 'object') {
    const newOpts = {};
    newOpts.logRequestResponseAtLogLevel = isString(opts) ? opts : undefined;
    newOpts.allowedHttpStatusCodes = arguments[5];
    newOpts.invalidRequestMsg = arguments[6];
    newOpts.failureMsg = arguments[7];
    newOpts.successMsg = arguments[8];
    opts = newOpts;
  }

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
      context = typeof createContext === 'function' ? createContext() :
        createContext && typeof createContext === 'object' ? copy(createContext, deep) : {};
      if (!context) context = {};

      const settings = typeof createSettings === 'function' ? copy(createSettings(), deep) :
        createSettings && typeof createSettings === 'object' ? copy(createSettings, deep) : undefined;

      const options = typeof createOptions === 'function' ? copy(createOptions(), deep) :
        createOptions && typeof createOptions === 'object' ? copy(createOptions, deep) : undefined;

      // Configure the context as a standard context
      contexts.configureStandardContext(context, settings, options, event, awsContext, false);

      // Optionally log the request
      const logLevel = opts.logRequestResponseAtLogLevel;
      if (logLevel && logging.isValidLogLevel(logLevel)) {
        context.log(logLevel, 'Request:', JSON.stringify(event));
      }

      // Execute the given function
      Promises.try(() => fn(event, context))
        .then(response => {
          // Optionally log the response
          if (logLevel && logging.isValidLogLevel(logLevel)) {
            context.log(logLevel, 'Response:', JSON.stringify(response));
          }

          // Log the given success message (if any)
          if (isNotBlank(opts.successMsg)) context.info(opts.successMsg);

          succeedCallback(callback, response, opts);
        })
        .catch(err => {
          // Fail the Lambda callback
          if (isInstanceOf(err, BadRequest) || appErrors.getHttpStatus(err) === 400) {
            // Log the invalid request
            context.warn(isNotBlank(opts.invalidRequestMsg) ? opts.invalidRequestMsg : 'Invalid request', '-', err.message);
            failCallback(callback, err, awsContext, undefined, undefined, opts);
          } else {
            // Log the error encountered
            context.error(isNotBlank(opts.failureMsg) ? opts.failureMsg : 'Failed to execute Lambda', err);
            failCallback(callback, err, awsContext, undefined, undefined, opts);
          }
        });

    } catch (err) {
      log(context, LogLevel.ERROR, isNotBlank(opts.failureMsg) ? opts.failureMsg : 'Failed to execute Lambda', err);
      // Fail the Lambda callback
      failCallback(callback, err, awsContext, undefined, undefined, opts);
    }
  }

  return handler;
}