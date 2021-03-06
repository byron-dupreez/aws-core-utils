'use strict';

const contexts = require('./contexts');
const Promises = require('core-functions/promises');
const copying = require('core-functions/copying');
const copy = copying.copy;
const merging = require('core-functions/merging');
const merge = merging.merge;

const isInstanceOf = require('core-functions/objects').isInstanceOf;

const appErrors = require('core-functions/app-errors');
const AppError = appErrors.AppError;
const BadRequest = appErrors.BadRequest;

const strings = require('core-functions/strings');
const isString = strings.isString;
const isNotBlank = strings.isNotBlank;
const trim = strings.trim;

const logging = require('logging-utils');
const LogLevel = logging.LogLevel;
const log = logging.log;

const deep = {deep: true};
const noReplace = {deep: false, replace: false};

const cycle = require('./_cycle');

/**
 * Utilities for generating `handler` functions for and for working with AWS Lambdas that are exposed via API Gateway.
 * - For Kinesis stream triggered AWS Lambdas, instead consider using the `kinesis-stream-consumer` module.
 * - For DynamoDB stream triggered AWS Lambdas, instead consider using the `dynamodb-stream-consumer` module.
 * - For other AWS Lambdas that are NOT exposed via API Gateway, instead use the `aws-core-utils/other-lambdas` module.
 *
 * These utilities include functions to:
 * - Configure a standard context for AWS Gateway exposed Lambdas (re-exported from contexts.js module)
 * - Fail Lambda callbacks with standard `AppError` errors to facilitate mapping of errors to HTTP status
 *   codes on API Gateway.
 *
 * @module aws-core-utils/api-lambdas.js
 * @see aws-core-utils/contexts#configureStandardContext
 * @see core-functions/app-errors.js#toAppErrorForApiGateway
 * @author Byron du Preez
 */
exports._$_ = '_$_'; //IDE workaround

// Configures a handler context for an API Gateway exposed AWS Lambda
exports.configureHandlerContext = configureHandlerContext;

// Configures a standard context (re-exported from contexts module for convenience)
exports.configureStandardContext = contexts.configureStandardContext;

exports.generateHandlerFunction = generateHandlerFunction;

exports.succeedLambdaCallback = succeedLambdaCallback;
exports.failLambdaCallback = failLambdaCallback;

/**
 * Generates a handler function for your API Gateway exposed Lambda. This function still supports some of the legacy 5th
 * to 9th parameters (logRequestResponseAtLogLevel, allowedHttpStatusCodes, invalidRequestMsg, failureMsg & successMsg)
 * by adding them to an `opts` object. Note that any legacy 6th allowedHttpStatusCodes argument is no longer supported
 * and will be ignored.
 *
 * @param {(function(): (Object|StandardHandlerContext))|undefined|Object|StandardHandlerContext} [createContext] - an
 *        optional function that will be used to create the initial context to be configured & used (OR or an optional
 *        LEGACY module-scope context from which to copy an initial standard context)
 * @param {(function(): (Object|StandardHandlerSettings))|undefined|Object|StandardHandlerSettings} [createSettings] -
 *        an optional function that will be used to create the initial standard handler settings to use (OR optional
 *        LEGACY module-scoped settings from which to copy initial settings to use)
 * @param {(function(): (Object|StandardHandlerOptions))|undefined|Object|StandardHandlerOptions} [createOptions] -  an
 *        optional function that will be used to create the initial standard options to use (OR optional LEGACY module-
 *        scoped options from which to copy initial options to use)
 * @param {function(event: AWSEvent, context: StandardHandlerContext)} fn - your function that must accept the AWS event
 *        and a standard context and ideally return a Promise
 * @param {HandlerOpts|LogLevel|string|undefined} [opts] - optional opts to use (or a legacy LogLevel/string
 *        `logRequestResponseAtLogLevel` parameter)
 * @returns {AwsLambdaHandlerFunction} a handler function for your API Gateway exposed Lambda
 */
function generateHandlerFunction(createContext, createSettings, createOptions, fn, opts) {
  // Check for Legacy 5th to 9th parameters: logRequestResponseAtLogLevel, allowedHttpStatusCodes, invalidRequestMsg, failureMsg, successMsg
  if (!opts || typeof opts !== 'object') {
    const newOpts = {};
    newOpts.logRequestResponseAtLogLevel = isString(opts) ? opts : undefined;
    // newOpts.allowedHttpStatusCodes = arguments[5]; // no longer supported
    newOpts.invalidRequestMsg = arguments[6];
    newOpts.failureMsg = arguments[7];
    newOpts.successMsg = arguments[8];
    opts = newOpts;
  }

  /**
   * An API-Gateway exposed AWS Lambda handler function.
   * @param {Object} event - the AWS event passed to your handler
   * @param {Object} awsContext - the AWS context passed to your handler
   * @param {Callback} callback - the AWS Lambda callback function passed to your handler
   */
  function handler(event, awsContext, callback) {
    let context;
    try {
      context = configureHandlerContext(createContext, createSettings, createOptions, event, awsContext);

      // Optionally log the request
      const logLevel = opts.logRequestResponseAtLogLevel;
      if (logLevel && logging.isValidLogLevel(logLevel)) {
        log(context, logLevel, 'Request:', stringify(event));
      }

      // If a `postConfigure` function was configured then execute it now, BEFORE executing the given function
      return executePostConfigure(event, context)
        .then(c => {
          context = c || context;

          // Execute the given function
          return fn(event, context);
        })
        .then(response => {
          // Optionally log the response
          if (logLevel && logging.isValidLogLevel(logLevel)) {
            log(context, logLevel, 'Response:', stringify(response));
          }

          // Log the given success message (if any)
          if (isNotBlank(opts.successMsg)) log(context, LogLevel.INFO, opts.successMsg);

          return succeedLambdaCallback(callback, response, event, context);
        })
        .catch(err => {
          // Fail the Lambda callback
          if (isInstanceOf(err, BadRequest) || appErrors.getHttpStatus(err) === 400) {
            // Log the invalid request
            log(context, LogLevel.WARN, isNotBlank(opts.invalidRequestMsg) ? opts.invalidRequestMsg : 'Invalid request', '-', err.message);
            return failLambdaCallback(callback, err, event, context);
          } else {
            // Log the error encountered
            log(context, LogLevel.ERROR, isNotBlank(opts.failureMsg) ? opts.failureMsg : 'Failed to execute Lambda', err);
            return failLambdaCallback(callback, err, event, context);
          }
        });

    } catch (err) {
      log(context, LogLevel.ERROR, isNotBlank(opts.failureMsg) ? opts.failureMsg : 'Failed to execute Lambda', err);
      // Fail the Lambda callback
      return failLambdaCallback(callback, err, event, context);
    }
  }

  return handler;
}

/**
 * Configures a standard handler context to use.
 * @param {(function(): (Object|HandlerContext))|undefined|Object|HandlerContext} [createContext] - an optional function
 *        that will be used to create the initial context to be configured & used (OR or an optional LEGACY module-scope
 *        context from which to copy an initial standard context)
 * @param {(function(): (Object|HandlerSettings))|undefined|Object|HandlerSettings} [createSettings] - an optional
 *        function that will be used to create the initial standard settings to use (OR optional LEGACY module-scoped
 *        settings from which to copy initial settings to use)
 * @param {(function(): (Object|HandlerOptions))|undefined|Object|HandlerOptions} [createOptions] -  an optional
 *        function that will be used to create the initial standard options to use (OR optional LEGACY module-scoped
 *        options from which to copy initial options to use)
 * @param {Object} event - the AWS event passed to your handler
 * @param {Object} awsContext - the AWS context passed to your handler
 * @return {StandardHandlerContext} the handler context to use
 */
function configureHandlerContext(createContext, createSettings, createOptions, event, awsContext) {
  // Configure the context as a standard context
  let context = typeof createContext === 'function' ? createContext() :
    createContext && typeof createContext === 'object' ? copy(createContext, deep) : {};
  if (!context) context = {};

  const settings = typeof createSettings === 'function' ? copy(createSettings(), deep) :
    createSettings && typeof createSettings === 'object' ? copy(createSettings, deep) : undefined;

  const options = typeof createOptions === 'function' ? copy(createOptions(), deep) :
    createOptions && typeof createOptions === 'object' ? copy(createOptions, deep) : undefined;

  // Configure the context as a standard context
  contexts.configureStandardContext(context, settings, options, event, awsContext, false);

  // Merge the handler options into the handler settings and finally merge their result into context.handler
  const handlerOptions = (options && options.handler) || {};
  const handlerSettings = settings && settings.handler ?
    mergeHandlerOpts(handlerOptions, settings.handler) : handlerOptions;
  context.handler = context.handler ? mergeHandlerOpts(handlerSettings, context.handler) : handlerSettings;

  return context;
}

/**
 * Copies the relevant handler-related values from the given `from` handler opts to the given `to` handler opts, but
 * ONLY if the same options or settings do NOT already exist in the `to` handler opts.
 * @param {HandlerSettings|HandlerOptions|Object|undefined} [from] - the source handler configuration
 * @param {HandlerSettings|HandlerOptions} to - the destination handler configuration
 */
function mergeHandlerOpts(from, to) {
  if (from) {
    if ((from.useLambdaProxy === true || from.useLambdaProxy === false) &&
      to.useLambdaProxy !== true && to.useLambdaProxy !== false) {
      to.useLambdaProxy = from.useLambdaProxy;
    }
    if (from.defaultHeaders) {
      to.defaultHeaders = to.defaultHeaders ?
        merge(from.defaultHeaders, to.defaultHeaders, noReplace) :
        copy(from.defaultHeaders, deep);
    }
    if (from.allowedHttpStatusCodes && !to.allowedHttpStatusCodes) {
      to.allowedHttpStatusCodes = from.allowedHttpStatusCodes;
    }
    if (from.toErrorResponse && !to.toErrorResponse) {
      to.toErrorResponse = from.toErrorResponse;
    }
    if (from.postConfigure && !to.postConfigure) {
      to.postConfigure = from.postConfigure;
    }
    if (from.preSuccessCallback && !to.preSuccessCallback) {
      to.preSuccessCallback = from.preSuccessCallback;
    }
    if (from.preFailureCallback && !to.preFailureCallback) {
      to.preFailureCallback = from.preFailureCallback;
    }
  }
  return to;
}

/**
 * Executes the custom configured `postConfigure` function (if any).
 * @param {AWSEvent} event - the AWS event passed to your handler
 * @param {StandardHandlerContext} context - the context to use
 * @param {PostConfigure|undefined} [context.handler.postConfigure] - an optional function to be used by an AWS Lambda
 *        `handler` to add any additional configuration needed to the context AFTER the primary configuration of the
 *        context has completed and BEFORE the main function is executed
 * @return {Promise.<*>} a promise of anything - any errors are logged and result in rejections
 */
function executePostConfigure(event, context) {
  const handler = context && context.handler;
  const postConfigure = handler && handler.postConfigure;
  return typeof postConfigure === 'function' ?
    Promises.try(() => postConfigure(event, context))
      .then(c => c || context)
      .catch(err => {
        log(context, LogLevel.ERROR, err);
        throw err;
      }) :
    Promise.resolve(context);
}

/**
 * Executes the custom configured `preSuccessCallback` function (if any).
 * @param {Object} response - a normal or Lambda Proxy integration response to be returned
 * @param {AWSEvent} event - the AWS event passed to your handler
 * @param {StandardHandlerContext} context - the context to use
 * @param {PreSuccessCallback|undefined} [context.handler.preSuccessCallback] - an optional function to be used by an
 *        AWS Lambda `handler` to run any needed shutdown logic immediately before succeeding the Lambda callback
 * @return {Promise.<*>} a promise of anything - any errors are logged, but no rejections can escape
 */
function executePreSuccessCallback(response, event, context) {
  const handler = context && context.handler;
  const preSuccessCallback = handler && handler.preSuccessCallback;
  return typeof preSuccessCallback === 'function' ?
    Promises.try(() => preSuccessCallback(response, event, context))
      .catch(err => log(context, LogLevel.ERROR, err)) :
    Promise.resolve();
}

/**
 * Executes the custom configured `preSuccessCallback` function (if any).
 * @param {AppError} error - the error with which your Lambda was failed
 * @param {Object} errorResponse - the error response derived from the error with which your Lambda was failed
 * @param {AWSEvent} event - the AWS event passed to your handler
 * @param {StandardHandlerContext} context - the context being used
 * @param {PreFailureCallback|undefined} [context.handler.preFailureCallback] - an optional function to be used by an
 *        AWS Lambda `handler` to run any needed shutdown logic immediately before failing the Lambda callback
 * @return {Promise.<*>} a promise of anything - any errors are logged, but no rejections can escape
 */
function executePreFailureCallback(error, errorResponse, event, context) {
  const handler = context && context.handler;
  const preFailureCallback = handler && handler.preFailureCallback;
  return typeof preFailureCallback === 'function' ?
    Promises.try(() => preFailureCallback(error, errorResponse, event, context))
      .catch(err => log(context, LogLevel.ERROR, err)) :
    Promise.resolve();
}

/**
 * Succeeds the given callback of an API Gateway exposed AWS Lambda, by invoking the given callback with the given
 * response.
 * @param {Function} callback - the callback function passed as the last argument to your Lambda function on invocation.
 * @param {Object} response - a normal or Lambda Proxy integration response to be returned
 * @param {AWSEvent} event - the AWS event passed to your handler
 * @param {StandardHandlerContext} context - the context to use
 */
function succeedLambdaCallback(callback, response, event, context) {
  return Promises.try(() => {
    const handler = context && context.handler;
    if (handler && handler.useLambdaProxy) {
      const statusCode = response && isNotBlank(response.statusCode) ? response.statusCode : 200;
      const body = (response && response.body) || response || {};
      const proxyResponse = toLambdaProxyResponse(statusCode, response && response.headers, body, handler.defaultHeaders);
      return executePreSuccessCallback(proxyResponse, event, context)
        .then(() => callback(null, proxyResponse))
        .catch(err => {
          console.error(`Unexpected failure after executePreSuccessCallback`, err);
          return callback(null, proxyResponse);
        });
    } else {
      return executePreSuccessCallback(response, event, context)
        .then(() => callback(null, response))
        .catch(err => {
          console.error(`Unexpected failure after executePreSuccessCallback`, err);
          return callback(null, response);
        });
    }
  }).catch(err => {
    console.error(`Unexpected failure during succeedLambdaCallback`, err);
    return callback(null, response);
  });
}

/**
 * Fails the given callback of an AWS Lambda, which is exposed via API Gateway, with the given error, by first
 * attempting to convert the given error into one of the standard app errors (see {@linkcode core-functions/app-errors})
 * that will be mappable on API Gateway, and then invoking the given callback with a JSON stringified version of
 * the converted app error.
 *
 * @see module:core-functions/app-errors#toAppErrorForApiGateway
 *
 * @param {Function} callback - the callback function passed as the last argument to your Lambda function on invocation.
 * @param {Error} error - the error with which you need to fail your Lambda
 * @param {Object|undefined} [error.headers] - optional headers to include in a Lambda Proxy integration error response
 * @param {string|undefined} [error.auditRef] - an optional audit reference
 * @param {string|undefined} [error.awsRequestId] - an optional AWS request ID
 * @param {AWSEvent} event - the AWS event passed to your handler
 * @param {StandardHandlerContext} context - the context being used
 */
function failLambdaCallback(callback, error, event, context) {
  return Promises.try(() => {
    // Convert the error into an "API" error
    const handler = context && context.handler;
    const allowedHttpStatusCodes = handler && handler.allowedHttpStatusCodes;
    const apiError = appErrors.toAppErrorForApiGateway(error, undefined, undefined, allowedHttpStatusCodes);

    // Resolve the AWS request id (if available)
    apiError.awsRequestId = trim(apiError.awsRequestId) || trim(error.awsRequestId) ||
      (context && (trim(context.awsRequestId) || (context.awsContext && trim(context.awsContext.awsRequestId)))) ||
      undefined;

    // Resolve the audit reference (if available)
    apiError.auditRef = trim(apiError.auditRef) || trim(error.auditRef) || undefined;

    if (handler && handler.useLambdaProxy) {
      const statusCode = apiError.httpStatus;
      const body = toCustomOrDefaultErrorResponseBody(apiError, event, context);
      const defaultHeaders = handler.defaultHeaders;
      const proxyResponse = toLambdaProxyResponse(statusCode, error.headers, body, defaultHeaders);
      return executePreFailureCallback(apiError, proxyResponse, event, context)
        .then(() => callback(null, proxyResponse))
        .catch(err => {
          console.error(`Unexpected failure after executePreFailureCallback`, err);
          return callback(null, proxyResponse);
        });
    } else {
      const errorResponse = toCustomOrDefaultErrorResponse(apiError, event, context);
      return executePreFailureCallback(apiError, errorResponse, event, context)
        .then(() => callback(stringify(errorResponse), null))
        .catch(err => {
          console.error(`Unexpected failure after executePreFailureCallback`, err);
          return callback(stringify(errorResponse), null);
        });
    }
  }).catch(err => {
    console.error(`Unexpected failure during failLambdaCallback`, err);
    return callback(stringify(error), null);
  });
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

  proxyResponse.body = isString(body) ? body : stringify(body);

  return proxyResponse;
}

/**
 * Resolves the error response body of a Lambda Proxy error response to be returned for the given AppError and event and
 * using the configured `toErrorResponse` function (if any); otherwise the `defaultToErrorResponse` function.
 * @param {AppError} error - the error with which your Lambda was failed
 * @param {Object} event - the AWS event passed to your handler
 * @param {StandardHandlerContext} context - the context being used
 * @param {ToErrorResponse|undefined} [context.handler.toErrorResponse] - an optional function to be used by an AWS
 *        Lambda `handler` function to convert an AppError into an appropriate error response object
 * @return {Object} the error response (to be subsequently stringified & returned)
 */
function toCustomOrDefaultErrorResponseBody(error, event, context) {
  try {
    const handler = context && context.handler;
    const toErrorResponse = handler && handler.toErrorResponse;
    return typeof toErrorResponse === 'function' ?
      toErrorResponse(error, event, context) || toDefaultErrorResponseBody(error) :
      toDefaultErrorResponseBody(error);
  } catch (err) {
    log(context, LogLevel.ERROR, err);
    // fallback to default function if given function fails
    return toDefaultErrorResponseBody(error);
  }
}

/**
 * Resolves the error response to be returned for the given AppError and event, using the configured `toErrorResponse`
 * function (if any); otherwise using the `toDefaultErrorResponse` function.
 * @param {AppError} error - the error with which your Lambda was failed
 * @param {Object} event - the AWS event passed to your handler
 * @param {StandardHandlerContext} context - the context being used
 * @param {ToErrorResponse|undefined} [context.handler.toErrorResponse] - an optional function to be used by an AWS
 *        Lambda `handler` function to convert an AppError into an appropriate error response object
 * @return {Object} the error response (to be subsequently stringified & returned)
 */
function toCustomOrDefaultErrorResponse(error, event, context) {
  try {
    const handler = context && context.handler;
    const toErrorResponse = handler && handler.toErrorResponse;
    return typeof toErrorResponse === 'function' ?
      toErrorResponse(error, event, context) || toDefaultErrorResponse(error) :
      toDefaultErrorResponse(error);
  } catch (err) {
    log(context, LogLevel.ERROR, err);
    // fallback to default function if given function fails
    return toDefaultErrorResponse(error);
  }
}

/**
 * A default conversion from an error to an error response body for a Lambda Proxy error response
 * @param {AppError} error - an error to convert
 * @return {Object} an error response body
 */
function toDefaultErrorResponseBody(error) {
  const json = error && error.toJSON();
  if (json) {
    if (json.httpStatus) {
      delete json.httpStatus; // don't really need `httpStatus` inside `body` too, since have it in response as `statusCode`
    }
    if (json.headers) {
      delete json.headers; // don't want error's `headers` inside `body`, since have more comprehensive `headers` in response
    }
  }
  return json;
}

/**
 * A default conversion from an error to an error response
 * @param {AppError} error - an error to convert
 * @return {Object} an error response
 */
function toDefaultErrorResponse(error) {
  return error && error.toJSON();
}

function stringify(o) {
  try {
    return JSON.stringify(o);
  }
  catch (err) {
    log(context, LogLevel.ERROR, err);

    try {
      // First replace any circular references with path references & then retry JSON.stringify again
      const decycled = cycle.decycle(o);
      return JSON.stringify(decycled);
    }
    catch (err) {
      // Give up and use strings.stringify, which will at least show structure, but may NOT be parseable
      log(context, LogLevel.ERROR, err);
      return strings.stringify(o);
    }
  }
}