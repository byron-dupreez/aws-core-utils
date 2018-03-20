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

/** Deprecated - use `succeedLambdaCallback` instead */
exports.succeedCallback = succeedCallback;
/** Deprecated - use `failLambdaCallback` instead */
exports.failCallback = failCallback;
/** Deprecated - use `failLambdaCallback` instead */
exports.failCallbackForApiGateway = failCallback; // Synonym for failCallback

/**
 * Generates a handler function for your API Gateway exposed Lambda. This function still supports the legacy 5th to 9th
 * parameters (logRequestResponseAtLogLevel, allowedHttpStatusCodes, invalidRequestMsg, failureMsg & successMsg) by
 * adding them to an `opts` object.
 *
 * @param {(function(): (Object|StandardHandlerContext))|undefined|Object|StandardHandlerContext} [createContext] - an
 *        optional function that will be used to create the initial context to be configured & used (OR or an optional
 *        LEGACY module-scope context from which to copy an initial standard context)
 * @param {(function(): (Object|StandardHandlerSettings))|undefined|Object|StandardHandlerSettings} [createSettings] - an optional
 *        function that will be used to create the initial standard handler settings to use (OR optional LEGACY module-scoped
 *        settings from which to copy initial settings to use)
 * @param {(function(): (Object|StandardHandlerOptions))|undefined|Object|StandardHandlerOptions} [createOptions] -  an optional
 *        function that will be used to create the initial standard options to use (OR optional LEGACY module-scoped
 *        options from which to copy initial options to use)
 * @param {function(event: AWSEvent, context: StandardHandlerContext)} fn - your function that must accept the AWS event and a
 *        standard context and ideally return a Promise
 * @param {Object|LogLevel|string|undefined} [opts] - optional opts to use (or legacy LogLevel/string
 *        `logRequestResponseAtLogLevel` parameter)
 * @param {boolean|undefined} [opts.useLambdaProxy] - whether your Lambda is using Lambda Proxy Integration or not
 *        (defaults to false for backward compatibility)
 * @param {Object|undefined} [opts.defaultHeaders] - default custom headers (if any) to be included in a Lambda Proxy
 *        response
 * @param {number[]|undefined} [opts.allowedHttpStatusCodes] - an optional array of HTTP status codes that are allowed
 *        to be returned directly to API Gateway (without conversion to either 400 or 500). NB: 400 and 500 CANNOT be
 *        excluded and are assumed to be present if omitted! If not defined, the app-errors module's list of supported
 *        HTTP status codes will be used as the allowed HTTP status codes
 * @param {LogLevel|string|undefined} [opts.logRequestResponseAtLogLevel] - an optional log level at which to log the
 *        request (i.e. AWS event) and response; if log level is undefined or invalid, then logs neither
 * @param {string|undefined} [opts.invalidRequestMsg] - an optional message to log at warn level if your given function
 *        (fn) throws a BadRequest
 * @param {string|undefined} [opts.failureMsg] - an optional message to log at error level on failure
 * @param {string|undefined} [opts.successMsg] an optional message to log at info level on success
 * @param {ToErrorResponse|undefined} [opts.toErrorResponse] - an optional function to use to convert an AppError into
 *        an appropriate error response object (to be subsequently stringified & returned) or error response body (to be
 *        subsequently included in a Lambda Proxy error response to be returned)
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
   * An API-Gateway exposed AWS Lambda handler function.
   * @param {Object} event - the AWS event passed to your handler
   * @param {Object} awsContext - the AWS context passed to your handler
   * @param {Callback} callback - the AWS Lambda callback function passed to your handler
   */
  function handler(event, awsContext, callback) {
    let context;
    try {
      context = configureHandlerContext(createContext, createSettings, createOptions, event, awsContext, opts);

      // Optionally log the request
      const logLevel = opts.logRequestResponseAtLogLevel;
      if (logLevel && logging.isValidLogLevel(logLevel)) {
        context.log(logLevel, 'Request:', JSON.stringify(event));
      }

      // Execute the given function
      return Promises.try(() => fn(event, context))
        .then(response => {
          // Optionally log the response
          if (logLevel && logging.isValidLogLevel(logLevel)) {
            context.log(logLevel, 'Response:', JSON.stringify(response));
          }

          // Log the given success message (if any)
          if (isNotBlank(opts.successMsg)) context.info(opts.successMsg);

          succeedLambdaCallback(callback, response, event, context);
        })
        .catch(err => {
          // Fail the Lambda callback
          if (isInstanceOf(err, BadRequest) || appErrors.getHttpStatus(err) === 400) {
            // Log the invalid request
            context.warn(isNotBlank(opts.invalidRequestMsg) ? opts.invalidRequestMsg : 'Invalid request', '-', err.message);
            failLambdaCallback(callback, err, event, context);
          } else {
            // Log the error encountered
            context.error(isNotBlank(opts.failureMsg) ? opts.failureMsg : 'Failed to execute Lambda', err);
            failLambdaCallback(callback, err, event, context);
          }
        });

    } catch (err) {
      log(context, LogLevel.ERROR, isNotBlank(opts.failureMsg) ? opts.failureMsg : 'Failed to execute Lambda', err);
      // Fail the Lambda callback
      failLambdaCallback(callback, err, event, context);
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
 * @param {HandlerSettings|HandlerOptions|undefined} [opts] - optional opts to use
 * @return {StandardHandlerContext} the handler context to use
 */
function configureHandlerContext(createContext, createSettings, createOptions, event, awsContext, opts) {
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

  // Merge the relevant opts into handler options, then merge handler options into handler settings and finally merge
  // the result into context.handler
  const handlerOptions = mergeHandlerOpts(opts, (options && options.handler) || {});
  const handlerSettings = settings && settings.handler ?
    mergeHandlerOpts(handlerOptions, settings.handler) : handlerOptions;
  context.handler = context.handler ? mergeHandlerOpts(handlerSettings, context.handler) : handlerSettings;

  return context;
}

/**
 * Copies the relevant handler-related values from the given `from` handler opts to the given `to` handler opts, but
 * ONLY if the same options or settings do NOT already exist in the `to` handler opts.
 * @param {HandlerSettings|HandlerOptions|Object} from - the source handler configuration
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
 * Executes the custom configured `preSuccessCallback` function (if any).
 * @param {Object} response - a normal or Lambda Proxy integration response to be returned
 * @param {AWSEvent} event - the AWS event passed to your handler
 * @param {StandardHandlerContext} context - the context to use
 * @param {PreSuccessCallback|undefined} [context.handler.preSuccessCallback] - an optional function to be used by an
 *        AWS Lambda `handler` to run any needed shutdown logic immediately before succeeding the Lambda callback
 * @return {Promise.<*>} a promise of anything - any errors are logged, but no rejections can escape
 */
function executePreSuccessCallback(response, event, context) {
  const preSuccessCallback = context.handler && context.handler.preSuccessCallback;
  return typeof preSuccessCallback === 'function' ?
    Promises.try(() => preSuccessCallback(response, event, context)).catch(err => context.error(err)) :
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
  const preFailureCallback = context.handler && context.handler.preFailureCallback;
  return typeof preFailureCallback === 'function' ?
    Promises.try(() => preFailureCallback(error, errorResponse, event, context)).catch(err => context.error(err)) :
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
  if (context.handler && context.handler.useLambdaProxy) {
    const statusCode = response && isNotBlank(response.statusCode) ? response.statusCode : 200;
    const body = (response && response.body) || response || {};
    const proxyResponse = toLambdaProxyResponse(statusCode, response && response.headers, body, context.handler.defaultHeaders);
    executePreSuccessCallback(proxyResponse, event, context)
      .then(() => callback(null, proxyResponse));
  } else {
    executePreSuccessCallback(response, event, context)
      .then(() => callback(null, response));
  }
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
  // Convert the error into an "API" error
  const allowedHttpStatusCodes = context.handler && context.handler.allowedHttpStatusCodes;
  const apiError = appErrors.toAppErrorForApiGateway(error, undefined, undefined, allowedHttpStatusCodes);

  // Resolve the AWS request id (if available)
  apiError.awsRequestId = trim(apiError.awsRequestId) || trim(error.awsRequestId) || trim(context.awsRequestId) ||
    (context.awsContext && trim(context.awsContext.awsRequestId)) || undefined;

  // Resolve the audit reference (if available)
  apiError.auditRef = trim(apiError.auditRef) || trim(error.auditRef) || undefined;

  if (context.handler && context.handler.useLambdaProxy) {
    const statusCode = apiError.httpStatus;
    const body = toCustomOrDefaultErrorResponseBody(apiError, event, context);
    const defaultHeaders = context.handler && context.handler.defaultHeaders;
    const proxyResponse = toLambdaProxyResponse(statusCode, error.headers, body, defaultHeaders);
    executePreFailureCallback(apiError, proxyResponse, event, context)
      .then(() => callback(null, proxyResponse));
  } else {
    const errorResponse = toCustomOrDefaultErrorResponse(apiError, event, context);
    executePreFailureCallback(apiError, errorResponse, event, context)
      .then(() => callback(JSON.stringify(errorResponse), null));
  }
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
    const toErrorResponse = context.handler && context.handler.toErrorResponse;
    return typeof toErrorResponse === 'function' ?
      toErrorResponse(error, event, context) || toDefaultErrorResponseBody(error) :
      toDefaultErrorResponseBody(error);
  } catch (err) {
    console.error('ERROR', err);
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
    const toErrorResponse = context.handler && context.handler.toErrorResponse;
    return typeof toErrorResponse === 'function' ?
      toErrorResponse(error, event, context) || toDefaultErrorResponse(error) :
      toDefaultErrorResponse(error);
  } catch (err) {
    console.error('ERROR', err);
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
  if (json.httpStatus) {
    delete json.httpStatus; // don't really need `httpStatus` inside `body` too, since have it in response as `statusCode`
  }
  if (json.headers) {
    delete json.headers; // don't want error's `headers` inside `body`, since have more comprehensive `headers` in response
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

/**
 * @deprecated Use `succeedLambdaCallback` instead
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

/**
 * @deprecated Use `failLambdaCallback` instead
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
 */
function failCallback(lambdaCallback, error, awsContext, message, code, opts) {
  // Check if still using legacy `allowedHttpStatusCodes` as 6th parameter
  if (!opts || typeof opts !== 'object') {
    opts = {allowedHttpStatusCodes: Array.isArray(opts) ? opts : undefined};
  }

  // Convert the error into an "API" error
  const apiError = appErrors.toAppErrorForApiGateway(error, message, code, opts.allowedHttpStatusCodes);

  // Resolve the AWS request id (if available)
  apiError.awsRequestId = trim(apiError.awsRequestId) || trim(error.awsRequestId) ||
    (awsContext && trim(awsContext.awsRequestId)) || undefined;

  // Resolve the audit reference (if available) - falling back to AWS request ID (if available)
  apiError.auditRef = trim(apiError.auditRef) || trim(error.auditRef) || apiError.awsRequestId;

  if (opts.useLambdaProxy) {
    const statusCode = apiError.httpStatus;
    const body = toDefaultErrorResponseBody(apiError);
    const proxyResponse = toLambdaProxyResponse(statusCode, error.headers, body, opts.defaultHeaders);
    lambdaCallback(null, proxyResponse);
  } else {
    const errorResponse = toDefaultErrorResponse(apiError);
    lambdaCallback(JSON.stringify(errorResponse), null);
  }
}