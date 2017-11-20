'use strict';

const arns = require('./arns');
const getArnResources = arns.getArnResources;

const appErrors = require('core-functions/app-errors');

/**
 * Utilities for working with AWS Lambda:
 * - Enables extraction of function names, versions and, most importantly, aliases from AWS contexts and their invoked
 *   function ARNs.
 * - Utilities to fail Lambda callbacks with standard app errors to facilitate mapping of errors to HTTP status codes
 *   on API Gateway.
 * @module aws-core-utils/lambdas.js
 * @see core-functions/app-errors.js
 * @author Byron du Preez
 */
exports._$_ = '_$_'; //IDE workaround

// Functions to extract Lambda-related information from an AWS context
exports.getFunctionName = getFunctionName;
exports.getFunctionVersion = getFunctionVersion;
exports.getFunctionNameVersionAndAlias = getFunctionNameVersionAndAlias;
exports.getAlias = getAlias;
exports.getInvokedFunctionArn = getInvokedFunctionArn;
exports.getInvokedFunctionArnFunctionName = getInvokedFunctionArnFunctionName;
exports.getInvokedFunctionNameWithAliasOrVersion = getInvokedFunctionNameWithAliasOrVersion;

// Function to assist with failing the callback of an AWS Lambda (not exposed via API Gateway) and preserve the information of the error thrown
exports.failCallback = failCallback;

/**
 * Returns the function name from the given AWS context
 * @param {AWSContext|undefined} [awsContext] - the AWS context
 * @returns {string} the function name
 */
function getFunctionName(awsContext) {
  return process.env.AWS_LAMBDA_FUNCTION_NAME || (awsContext && awsContext.functionName) || '';
}

/**
 * Returns the function version from the given AWS context
 * @param {AWSContext|undefined} [awsContext] - the AWS context
 * @returns {string} the function version
 */
function getFunctionVersion(awsContext) {
  return process.env.AWS_LAMBDA_FUNCTION_VERSION || (awsContext && awsContext.functionVersion) || '';
}

/**
 * Returns the invokedFunctionArn of the given AWS context, which was passed to your Lambda function.
 * @param {AWSContext} awsContext - the AWS context
 * @returns {string} the invoked function ARN
 */
function getInvokedFunctionArn(awsContext) {
  return (awsContext && awsContext.invokedFunctionArn) || '';
}

/**
 * Extracts and returns the function name from the given AWS context's invokedFunctionArn.
 * @param {AWSContext} awsContext - the AWS context
 * @returns {string} the extracted function name
 */
function getInvokedFunctionArnFunctionName(awsContext) {
  const invokedFunctionArn = awsContext && awsContext.invokedFunctionArn;
  const resources = getArnResources(invokedFunctionArn);
  return resources.resource;
}

/**
 * Extracts and returns a concatenation of the invoked function name and the invoked alias or version (if any) separated
 * by a colon from the given AWS Lambda context's invokedFunctionArn.
 * @param {AWSContext} awsContext - the AWS context
 * @returns {string} the invoked function name with the invoked alias or version (if any); otherwise an empty string
 */
function getInvokedFunctionNameWithAliasOrVersion(awsContext) {
  const invokedFunctionArn = awsContext && awsContext.invokedFunctionArn;
  const resources = getArnResources(invokedFunctionArn);
  const functionName = resources.resource;
  const aliasOrVersion = resources.aliasOrVersion;
  return functionName ? aliasOrVersion ? `${functionName}:${aliasOrVersion}` : functionName : '';
}

/**
 * Returns the function name, version and alias (if any) from the given AWS context, which was passed to your Lambda
 * function.
 *
 * Notes:
 * - An invoked function ARN might be either an unqualified or qualified function ARN.
 * - A qualified function ARN has a version or alias suffix, and maps to that version or alias.
 * - An unqualified function ARN has NO version or alias suffix) and maps to the $LATEST version.
 *
 * @param {AWSContext} awsContext - the AWS context
 * @returns {LambdaFunctionNameVersionAndAlias}
 */
function getFunctionNameVersionAndAlias(awsContext) {
  const name = process.env.AWS_LAMBDA_FUNCTION_NAME;
  const version = process.env.AWS_LAMBDA_FUNCTION_VERSION;

  const nameFromContext = awsContext && awsContext.functionName;
  const versionFromContext = awsContext && awsContext.functionVersion;

  const invokedFunctionArn = awsContext && awsContext.invokedFunctionArn;
  const resources = getArnResources(invokedFunctionArn);
  const nameFromArn = resources.resource;

  if (nameFromContext && nameFromArn && nameFromArn !== nameFromContext) {
    console.warn(`Lambda context with function name (${nameFromContext}) has different name (${nameFromArn}) in invoked function ARN`);
  }

  const aliasOrVersion = resources.aliasOrVersion;
  const alias = aliasOrVersion && aliasOrVersion !== versionFromContext ? //&& aliasOrVersion !== version ?
    aliasOrVersion : '';

  const invokedFunctionNameWithAliasOrVersion = nameFromArn ? aliasOrVersion ?
    `${nameFromArn}:${aliasOrVersion}` : nameFromArn : '';

  return {
    functionName: name || nameFromContext || '',
    version: version || versionFromContext || '',
    alias: alias,
    invoked: invokedFunctionNameWithAliasOrVersion
  };
}

/**
 * Returns the alias (if any) from the given AWS context, which was passed to your Lambda function.
 *
 * Notes:
 * - An invoked function ARN might be either an unqualified or qualified function ARN.
 * - A qualified function ARN has a version or alias suffix, and maps to that version or alias.
 * - An unqualified function ARN has NO version or alias suffix) and maps to the $LATEST version.
 *
 * @param {AWSContext} awsContext - the AWS context
 * @returns {string} the alias (if any); otherwise an empty string
 */
function getAlias(awsContext) {
  const invokedFunctionArn = awsContext && awsContext.invokedFunctionArn;
  const resources = getArnResources(invokedFunctionArn);

  const versionFromContext = awsContext && awsContext.functionVersion;

  const aliasOrVersion = resources.aliasOrVersion;
  return aliasOrVersion && aliasOrVersion !== versionFromContext ? //&& aliasOrVersion !== version ?
    aliasOrVersion : '';
}

/**
 * Fails the given callback of an AWS Lambda, which is NOT exposed via API Gateway, with the given error, by first
 * attempting to convert the given error into one of the standard app errors (see {@linkcode core-functions/app-errors})
 * and then invoking the given lambdaCallback with a JSON stringified version of the converted error. The given AWS
 * context is used to add your Lambda's AWS request ID to the error.
 *
 * Note that this function must NOT be used for any Lambda invoked by API Gateway - for these you MUST instead use the
 * {@linkcode aws-core-utils/api-lambdas#failCallback} function.
 *
 * @see core-functions/app-errors.js
 *
 * @param {Function} lambdaCallback - the callback function passed as the last argument to your Lambda function on invocation.
 * @param {Error} error - the error with which you need to fail your Lambda
 * @param {AWSContext|undefined} [awsContext] - the AWS context passed as the second argument to your Lambda function on invocation
 * @param {string|undefined} [awsContext.awsRequestId] - the AWS context's request ID
 * @param {string|undefined} [message] - an optional message; will use error's message if not specified and needed
 * @param {string|undefined} [code] - an optional code; will use error's code if not specified and needed
 */
function failCallback(lambdaCallback, error, awsContext, message, code) {
  const appError = appErrors.toAppError(error, message, code);
  if (awsContext && !appError.awsRequestId) appError.awsRequestId = awsContext.awsRequestId;
  lambdaCallback(JSON.stringify(appError));
}