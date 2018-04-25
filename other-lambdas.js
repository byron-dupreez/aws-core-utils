'use strict';

const contexts = require('./contexts');
const Promises = require('core-functions/promises');
const copying = require('core-functions/copying');
const copy = copying.copy;

const isInstanceOf = require('core-functions/objects').isInstanceOf;

const appErrors = require('core-functions/app-errors');
const AppError = appErrors.AppError;
const BadRequest = appErrors.BadRequest;

const strings = require('core-functions/strings');
const isNotBlank = strings.isNotBlank;
const trim = strings.trim;

const logging = require('logging-utils');
const LogLevel = logging.LogLevel;
const log = logging.log;

const deep = {deep: true};

const cycle = require('./_cycle');

/**
 * Utilities for generating `handler` functions for and for working with "other" AWS Lambdas that are NOT exposed via
 * API Gateway and IDEALLY NOT triggered by a Kinesis or DynamoDB stream event source mapping.
 * - For API Gateway exposed AWS Lambdas, instead use the `aws-core-utils/api-lambdas` module.
 * - For Kinesis triggered AWS Lambdas, instead consider using the `kinesis-stream-consumer` module.
 * - For DynamoDB triggered AWS Lambdas, instead consider using the `dynamodb-stream-consumer` module.
 *
 * These utilities include functions to:
 * - Configure a standard context for these Lambdas (re-exported from `contexts.js` module for convenience)
 * - Generate a `handler` function for your AWS Lambda function.
 *
 * @module aws-core-utils/other-lambdas.js
 * @see aws-core-utils/contexts#configureStandardContext
 * @see core-functions/app-errors.js#toAppError
 * @author Byron du Preez
 */
exports._$_ = '_$_'; //IDE workaround

// Configures a handler context for an AWS Lambda
exports.configureHandlerContext = configureHandlerContext;

exports.generateHandlerFunction = generateHandlerFunction;

exports.succeedLambdaCallback = succeedLambdaCallback;
exports.failLambdaCallback = failLambdaCallback;

/**
 * Generates a handler function for your "other" AWS Lambda that are NOT exposed via API Gateway and IDEALLY NOT
 * triggered by a Kinesis or DynamoDB stream event source mapping.
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
 * @param {HandlerOpts|Object|undefined} [opts] - optional opts to use
 * @returns {AwsLambdaHandlerFunction} a handler function for your API Gateway exposed Lambda
 */
function generateHandlerFunction(createContext, createSettings, createOptions, fn, opts) {
  if (!opts) opts = {};

  /**
   * An AWS Lambda handler function.
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
 * Succeeds the given callback of an AWS Lambda, by invoking the given callback with the given response.
 * @param {Function} callback - the callback function passed as the last argument to your Lambda function on invocation.
 * @param {Object} response - a normal or Lambda Proxy integration response to be returned
 * @param {AWSEvent} event - the AWS event passed to your handler
 * @param {StandardHandlerContext} context - the context to use
 */
function succeedLambdaCallback(callback, response, event, context) {
  return executePreSuccessCallback(response, event, context)
    .then(() => callback(null, response))
    .catch(err => {
      console.error(`Unexpected failure after executePreSuccessCallback`, err);
      return callback(null, response);
    });
}

/**
 * Fails the given callback of an AWS Lambda, which is NOT exposed via API Gateway, with the given error, by first
 * attempting to convert the given error into one of the standard app errors (see {@linkcode core-functions/app-errors})
 * and then invoking the given callback with a JSON stringified version of the converted app error.
 *
 * @see module:core-functions/app-errors#toAppError
 *
 * @param {Function} callback - the callback function passed as the last argument to your Lambda function on invocation
 * @param {Error} error - the error with which you need to fail your Lambda
 * @param {string|undefined} [error.auditRef] - an optional audit reference
 * @param {string|undefined} [error.awsRequestId] - an optional AWS request ID
 * @param {AWSEvent} event - the AWS event passed to your handler
 * @param {StandardHandlerContext} context - the context being used
 */
function failLambdaCallback(callback, error, event, context) {
  return Promises.try(() => {
    // Convert the error into an "API" error with an HTTP status code
    const apiError = appErrors.toAppError(error);

    // Resolve the AWS request id (if available)
    apiError.awsRequestId = trim(apiError.awsRequestId) || trim(error.awsRequestId) ||
      (context && (trim(context.awsRequestId) || (context.awsContext && trim(context.awsContext.awsRequestId)))) ||
      undefined;

    // Resolve the audit reference (if available)
    apiError.auditRef = trim(apiError.auditRef) || trim(error.auditRef) || undefined;

    const errorResponse = toCustomOrDefaultErrorResponse(apiError, event, context);
    return executePreFailureCallback(apiError, errorResponse, event, context)
      .then(() => callback(stringify(errorResponse), null))
      .catch(err => {
        console.error(`Unexpected failure after executePreFailureCallback`, err);
        return callback(stringify(errorResponse), null);
      });
  }).catch(err => {
    console.error(`Unexpected failure during failLambdaCallback`, err);
    return callback(stringify(error), null);
  });
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