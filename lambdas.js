'use strict';

module.exports = {
  getFunctionName: getFunctionName,
  getFunctionVersion: getFunctionVersion,
  getFunctionNameVersionAndAlias: getFunctionNameVersionAndAlias,
  getAlias: getAlias,
  getInvokedFunctionArn: getInvokedFunctionArn,
  getInvokedFunctionArnFunctionName: getInvokedFunctionArnFunctionName
};

//const LATEST_VERSION = '$LATEST';

const arns = require('./arns');
const getArnResources = arns.getArnResources;

const Strings = require('core-functions/strings');
//const trim = Strings.trim;
const trimOrEmpty = Strings.trimOrEmpty;
//const isBlank = Strings.isBlank;
const isNotBlank = Strings.isNotBlank;

/**
 * Returns the function name from the given AWS context
 * @param awsContext the AWS context
 * @returns {string} the function name
 */
function getFunctionName(awsContext) {
  return awsContext && awsContext.functionName ? trimOrEmpty(awsContext.functionName) : '';
}

/**
 * Returns the function version from the given AWS context
 * @param awsContext the AWS context
 * @returns {string} the function version
 */
function getFunctionVersion(awsContext) {
  return awsContext && awsContext.functionVersion ? trimOrEmpty(awsContext.functionVersion) : '';
}

/**
 * Returns the invokedFunctionArn of the given AWS context, which was passed to your Lambda function.
 * @param awsContext the AWS context
 * @returns {string} the invoked function ARN
 */
function getInvokedFunctionArn(awsContext) {
  return awsContext && awsContext.invokedFunctionArn ? trimOrEmpty(awsContext.invokedFunctionArn) : '';
}

/**
 * Extracts and returns the function name from the given AWS context's invokedFunctionArn.
 * @param awsContext the AWS context
 * @returns {string} the extracted function name
 */
function getInvokedFunctionArnFunctionName(awsContext) {
  const invokedFunctionArn = getInvokedFunctionArn(awsContext);
  const resources = getArnResources(invokedFunctionArn);
  return resources.resource;
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
 * @param awsContext the AWS context
 * @returns {{functionName: string, version: string, alias: string}}
 */
function getFunctionNameVersionAndAlias(awsContext) {
  const functionName = getFunctionName(awsContext);
  const version = getFunctionVersion(awsContext);

  const invokedFunctionArn = getInvokedFunctionArn(awsContext);
  const resources = getArnResources(invokedFunctionArn);
  const functionNameFromArn = resources.resource;
  if (functionName !== functionNameFromArn) {
    console.error(`Lambda context with function name (${functionName}) has different name (${functionNameFromArn}) in invoked function ARN`);
  }
  const aliasOrVersion = resources.aliasOrVersion;
  const alias = isNotBlank(aliasOrVersion) && aliasOrVersion !== version ? aliasOrVersion : '';

  return {functionName: functionName, version: version, alias: alias};
}

/**
 * Returns the alias (if any) from the given AWS context, which was passed to your Lambda function.
 *
 * Notes:
 * - An invoked function ARN might be either an unqualified or qualified function ARN.
 * - A qualified function ARN has a version or alias suffix, and maps to that version or alias.
 * - An unqualified function ARN has NO version or alias suffix) and maps to the $LATEST version.
 *
 * @param awsContext the AWS context
 * @returns {string} the alias (if any); otherwise an empty string
 */
function getAlias(awsContext) {
  return getFunctionNameVersionAndAlias(awsContext).alias;
}
