'use strict';

/**
 * Utilities for resolving or deriving the current stage (e.g. dev, qa, prod) from various sources (primarily for AWS Lambda usage).
 * @module aws-core-utils/stages
 * @author Byron du Preez
 */

module.exports = {
  resolveStage: resolveStage,
  resolveRawStage: resolveRawStage,
  resolveStageUsingDefaultFunctions: resolveStageUsingDefaultFunctions,
  appendStage: appendStage,
  convertAliasToStage: convertAliasToStage,
  convertStreamNameSuffixToStage: convertStreamNameSuffixToStage
};

const config = require('./config');

const Strings = require('core-functions/strings');
const trim = Strings.trim;
const trimOrEmpty = Strings.trimOrEmpty;
//const isBlank = Strings.isBlank;
const isNotBlank = Strings.isNotBlank;

const arns = require('./arns');
const getArnResources = arns.getArnResources;

const lambdas = require('./lambdas');
const getAlias = lambdas.getAlias;

const Functions = require('core-functions/functions');
const isFunction = Functions.isFunction;

/**
 * Attempts to resolve the raw stage (see {@linkcode resolveRawStage}) and then converts the resolved raw stage into
 * lowercase or uppercase (if context.useUpperCaseForStages is true).
 *
 * @param {Object} event - the AWS event
 * @param {Object} awsContext - the AWS context, which was passed to your lambda
 * @param {Function|undefined} convertAliasToStage - an optional function that accepts: the extracted alias (if any); the
 * AWS event; the AWS context; and the context, and converts the alias into a stage or returns an empty string
 * @param {Function|undefined} convertStreamNameToStage - an optional function that accepts: the stream name; the AWS
 * event; the AWS context; and the context, and extracts a stage from the stream name or returns an empty string
 * @param {Object} context - the context, which can be used to pass additional configuration through to the given functions
 * @param {string|undefined} [context.stage] - an optional stage on the given context
 * @param {string|undefined} [context.defaultStage] - an optional default stage on the given context
 * @param {boolean|undefined} [context.useUpperCaseForStages] - an optional flag on the given context, which if present
 * indicates whether to convert the resolved stage to uppercase rather than to lowercase
 * @returns {string} the resolved stage (if non-blank) in lowercase or uppercase; otherwise an empty string
 */
function resolveStage(event, awsContext, convertAliasToStage, convertStreamNameToStage, context) {
  // Resolve the raw stage
  const stage = resolveRawStage(event, awsContext, convertAliasToStage, convertStreamNameToStage, context);

  // Convert the raw stage (if any) to lowercase or uppercase (if context.useUpperCaseForStages is true)
  return toLowerOrUpperCase(trimOrEmpty(stage), context && context.useUpperCaseForStages);
}

/**
 * Attempts to resolve the raw stage from the following resources in the following order:
 * 1. Uses context.stage (if non-blank).
 *
 * 2. Uses the AWS event's stage (if non-blank).
 *
 * 3. Extracts the alias from the AWS context's invokedFunctionArn (if any) and then uses the given convertAliasToStage
 *    function (if provided) to convert the extracted alias (if any) into a stage.
 *
 * 4. Extracts the stream name from the AWS event's eventSourceARN (if any) and then uses the given convertStreamNameToStage
 *    function (if provided) to convert the extracted stream name (if any) into a stage.
 *    NB: This step relies on a convention of qualifying stream names with a stage and, hence, should be skipped, if you
 *    are NOT using such a convention, by simply NOT providing a convertStreamNameToStage function.
 *
 * 5. Uses context.defaultStage (if non-blank).
 *
 * 6. Gives up and returns an empty string.
 *
 * @param {Object} event - the AWS event
 * @param {Object} awsContext - the AWS context, which was passed to your lambda
 * @param {Function|undefined} convertAliasToStage - an optional function that accepts: the extracted alias (if any); the
 * AWS event; the AWS context; and the context, and converts the alias into a stage or returns an empty string
 * @param {Function|undefined} convertStreamNameToStage - an optional function that accepts: the stream name; the AWS
 * event; the AWS context; and the context, and extracts a stage from the stream name or returns an empty string
 * @param {Object} context - the context, which can be used to pass additional configuration through to the given functions
 * @param {string|undefined} [context.stage] - an optional stage on the given context
 * @param {string|undefined} [context.defaultStage] - an optional default stage on the given context
 * @returns {string} the resolved raw stage (if non-blank); otherwise an empty string
 */
function resolveRawStage(event, awsContext, convertAliasToStage, convertStreamNameToStage, context) {
  // Attempt 1
  if (context && isNotBlank(context.stage)) {
    return context.stage;
  }

  // Attempt 2
  if (event && isNotBlank(event.stage)) {
    return event.stage;
  }

  // Attempt 3
  // Check have all the pieces needed to extract an alias and apply the given convertAliasToStage function to it
  if (awsContext && isNotBlank(awsContext.functionVersion) && isNotBlank(awsContext.invokedFunctionArn) &&
    isFunction(convertAliasToStage)) {
    // Extract the alias
    const alias = getAlias(awsContext);

    // If the alias is not blank, apply the convertAliasToStage function to it to derive a stage
    const stage = isNotBlank(alias) ? convertAliasToStage(alias, event, awsContext, context) : '';
    if (isNotBlank(stage)) {
      return stage;
    }
  }

  // Attempt 4
  // Check have all the pieces needed to extract a stream name and apply the given convertStreamNameToStage function to it
  if (event && isNotBlank(event.eventSourceARN) && isFunction(convertStreamNameToStage)) {
    // Extract the stream name
    const streamName = getArnResources(event.eventSourceARN).resource;

    // If the stream name is not blank, apply the convertStreamNameToStage function to it to derive a stage
    const stage = isNotBlank(streamName) ? convertStreamNameToStage(streamName, event, awsContext, context) : '';
    if (isNotBlank(stage)) {
      return stage;
    }
  }

  // Attempt 5
  if (context && isNotBlank(context.defaultStage)) {
    return context.defaultStage;
  }

  // Give up
  return '';
}

/**
 * A short-cut to resolving the stage, which uses the default {@linkcode convertAliasToStage} and
 * {@linkcode convertStreamNameSuffixToStage} functions.
 * @param {Object} event - the AWS event
 * @param {Object} awsContext - the AWS context
 * @param {Object} context - the context
 * @returns {string} the resolved stage (if non-blank); otherwise an empty string
 */
function resolveStageUsingDefaultFunctions(event, awsContext, context) {
  return resolveStage(event, awsContext, convertAliasToStage, convertStreamNameSuffixToStage, context);
}

/**
 * A default convertAliasToStage function that simply returns the given alias (if any) exactly as it is as the stage.
 * @param {string} [alias] the alias (if any) previously extracted from the AWS context's invokedFunctionArn
 * @param {Object} event - the AWS event
 * @param {Object} awsContext - the AWS context
 * @param {Object} context - the context
 * @returns {string} the resolved stage (if non-blank); otherwise an empty string
 */
function convertAliasToStage(alias, event, awsContext, context) {
  return isNotBlank(alias) ? trim(alias) : '';
}

/**
 * A default convertStreamNameToStage function that extracts and returns the "stage" suffix of the given event source
 * stream name. The suffix is extracted from the given stream name by taking everything after the last occurrence of
 * the context.streamNameStageSeparator (if any) or the default ('_') separator.
 * @param {string} streamName the name of the source stream (originally extracted from the AWS event's eventSourceArn)
 * @param {Object} event the AWS event
 * @param {Object} awsContext the AWS context
 * @param {Object} context the context
 * @param {string|undefined} [context.streamNameStageSeparator] - an optional separator to use instead of '_'
 * @returns {string} the stage or an empty string
 */
function convertStreamNameSuffixToStage(streamName, event, awsContext, context) {
  if (isNotBlank(streamName)) {
    const separator = context && context.streamNameStageSeparator ? context.streamNameStageSeparator : '_';
    const suffixStartPos = streamName.lastIndexOf(separator);
    return suffixStartPos !== -1 ? trimOrEmpty(streamName.substring(suffixStartPos + 1)) : '';
  }
  return '';
}

/**
 * Converts the given string to uppercase, if toUpper is true; otherwise to lowercase.
 * @param {string} s - the string to convert
 * @param {boolean|*} toUpper - if true, convert to uppercase; otherwise to lowercase
 * @returns {string} the upper or lowercase version of the string
 */
function toLowerOrUpperCase(s, toUpper) {
  return s ? toUpper === true ? s.toUpperCase() : s.toLowerCase() : '';
}

/**
 * Returns a stage-qualified version of the given base resource name with an appended "stage" suffix, which will contain
 * the given separator followed by the given stage, which will be appended in uppercase, lowercase or as is according to
 * the given inCase. If the given stage is blank, then the given resource name will be returned as is.
 *
 * @param {string} resourceName - the unqualified name of the resource (e.g. an unqualified DynamoDB table name or a
 * Kinesis stream name)
 * @param {string} separator - the separator to use to separate the resource name from the stage
 * @param {string} stage - the stage to append
 * @param {string} inCase - specifies whether to convert the stage to uppercase (if 'uppercase' or 'upper') or to
 * lowercase (if 'lowercase' or 'lower') or keep it as provided (if anything else)
 * @return {string} a "stage"-qualified resource name with an appended stage suffix
 */
function appendStage(resourceName, separator, stage, inCase) {
  if (isNotBlank(stage)) {
    // Convert the given inCase argument to lowercase to facilitate matching
    const inCaseToUse = trimOrEmpty(inCase && inCase.toLowerCase ? inCase.toLowerCase() : inCase);

    // Convert the given stage into the requested case
    const stageInRightCase = trim(inCaseToUse === 'lowercase' || inCaseToUse === 'lower' ? stage.toLowerCase() :
      inCaseToUse === 'uppercase' || inCaseToUse === 'upper' ? stage.toUpperCase() : stage);

    return`${resourceName}${trimOrEmpty(separator)}${stageInRightCase}`;
  }
  return resourceName;
}
