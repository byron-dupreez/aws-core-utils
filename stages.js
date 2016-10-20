'use strict';

/**
 * Utilities for resolving or deriving the current stage (e.g. dev, qa, prod) from various sources (primarily for AWS Lambda usage).
 * @module aws-core-utils/stages
 * @author Byron du Preez
 */

module.exports = {
  isResolveStageConfigured: isResolveStageConfigured,
  configureResolveStage: configureResolveStage,
  configureResolveStageWithDefaults: configureResolveStageWithDefaults,
  resolveStage: resolveStage,
  getResolveStageSetting: getResolveStageSetting,
  appendStage: appendStage,
  convertAliasToStage: convertAliasToStage,
  convertStreamNameSuffixToStage: convertStreamNameSuffixToStage,
  FOR_TESTING_ONLY: {
    toCase: toCase
  }
};

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

const DEFAULT_STREAM_NAME_STAGE_SEPARATOR = '_';
const DEFAULT_IN_CASE = 'lowercase';

/**
 * Returns true if resolve stage settings are already configured on the given context; false otherwise.
 * @param context the context to check
 * @returns {boolean} true if configured; false otherwise
 */
function isResolveStageConfigured(context) {
  return context && typeof context.resolveStageConfig === 'object';
}

/**
 * Configures the given context with the given resolve stage settings, but only if there are no resolve stage settings
 * already configured on the given context OR if forceConfiguration is true. The resolve stage settings determine how
 * {@linkcode resolveStage} will behave when invoked.
 *
 * @param {Object} context the context onto which to configure resolve stage settings
 * @param {Function|undefined} convertAliasToStage - an optional function that accepts: an extracted alias (if any);
 * an AWS event; an AWS context; and a context, and converts the alias into a stage or returns an empty string
 * @param {Function|undefined} convertStreamNameToStage - an optional function that accepts: a stream name; an AWS
 * event; an AWS context; and a context, and extracts a stage from the stream name or returns an empty string
 * @param {string|undefined} streamNameStageSeparator - an optional non-blank separator to use instead of '_' to
 * extract a stage from a stream name
 * @param {string|undefined} defaultStage - an optional default stage to use as a last resort if all other attempts fail
 * @param {string|undefined} inCase - specifies whether to convert a resolved stage to uppercase (if 'uppercase' or
 * 'upper') or to lowercase (if 'lowercase' or 'lower') or keep it as resolved (if anything else)
 * @param {boolean|undefined} forceConfiguration whether or not to force configuration of the given settings, which will
 * override any previously configured resolve stage settings on the given context
 * @return {Object} the updated context object
 */
function configureResolveStage(context, convertAliasToStage, convertStreamNameToStage, streamNameStageSeparator,
    defaultStage, inCase, forceConfiguration) {

  // If forceConfiguration is false check if the given context already has stage resolution configured on it
  // and, if so, do nothing more and simply return the context as is (to prevent overriding an earlier configuration)
  if (!forceConfiguration && isResolveStageConfigured(context)) {
    return context;
  }
  // Configure the resolve stage settings
  context.resolveStageConfig = {
    convertAliasToStage: convertAliasToStage,
    convertStreamNameToStage: convertStreamNameToStage,
    streamNameStageSeparator: streamNameStageSeparator,
    defaultStage: defaultStage,
    inCase: inCase
  };
  return context;
}

/**
 * Configures the given context with the default resolve stage settings, but only if there are no resolve stage settings
 * already configured on the given context OR if forceConfiguration is true. The resolve stage settings determine how
 * {@linkcode resolveStage} will behave when invoked.
 *
 * @param {Object} context the context onto which to configure resolve stage settings
 * @param {boolean|undefined} forceConfiguration whether or not to force configuration of the given settings, which will
 * override any previously configured resolve stage settings on the given context
 * @return {Object} the updated context object
 */
function configureResolveStageWithDefaults(context, forceConfiguration) {
  return configureResolveStage(context, convertAliasToStage, convertStreamNameSuffixToStage,
    DEFAULT_STREAM_NAME_STAGE_SEPARATOR, undefined, DEFAULT_IN_CASE, forceConfiguration);
}

/**
 * Attempts to resolve the stage from the given AWS event, AWS context and context using the following process:
 * 1. Uses context.stage (if non-blank).
 *
 * 2. Uses the AWS event's stage (if non-blank).
 *    NB: event.stage is NOT a standard AWS event property, but it may be set by API Gateway or tools like serverless.
 *    TODO check whether API Gateway sets the stage on the event and if so confirm WHERE it sets it!
 *
 * 3. Extracts the alias from the AWS context's invokedFunctionArn (if any) and then uses the given context's
 *    resolveStageConfig.convertAliasToStage function (if any) to convert the extracted alias (if any) into a stage.
 *
 *    NB: This step relies on a convention of using stages as Lambda aliases and, hence, should be skipped, if you
 *    are NOT using such a convention, by simply NOT configuring a resolveStageConfig.convertAliasToStage function
 *    on the given context.
 *
 * 4. Extracts the stream names from the AWS event's records' eventSourceARNs (if any) and then uses the given context's
 *    resolveStageConfig.convertStreamNameToStage function (if any) to convert the extracted stream names into stages
 *    and returns the first non-blank stage (if any).
 *
 *    NB: This step relies on a convention of qualifying stream names with a stage and, hence, should be skipped, if you
 *    are NOT using such a convention, by simply NOT configuring a resolveStageConfig.convertStreamNameToStage function
 *    on the given context.
 *
 * 5. Uses context.resolveStageConfig.defaultStage (if non-blank).
 *
 * 6. Gives up and returns an empty string.
 *
 * NB: If no resolve stage settings have been configured by the time this function is first called, then the given
 * context will be configured with the default resolve stage settings (see {@linkcode configureResolveStageWithDefaults}).
 *
 * @param {Object} event - the AWS event
 * @param {Object} awsContext - the AWS context, which was passed to your lambda
 * @param {Object} context - the context, which can also be used to pass additional configuration through to any custom
 * convertAliasToStage or convertStreamNameToStage functions that you configured
 * @param {string|undefined} [context.stage] - an optional stage on the given context, which will short-circuit
 * resolution to this stage (if non-blank)
 * @param {Function|undefined} [context.resolveStageConfig.convertAliasToStage] - an optional function on the given
 * context that accepts: an extracted alias (if any); an AWS event; an AWS context; and a context, and converts the
 * alias into a stage or returns an empty string
 * @param {Function|undefined} [context.resolveStageConfig.convertStreamNameToStage] - an optional function on the given
 * context that accepts: a Kinesis stream name; an AWS event; an AWS context; and a context, and extracts a stage from
 * the stream name or returns an empty string
 * @param {string|undefined} [context.resolveStageConfig.defaultStage] - an optional default stage on the given context
 * to use as a last resort if all other attempts fail
 * @param {string|undefined} [context.resolveStageConfig.inCase] - specifies whether to convert the resolved stage to
 * uppercase (if 'uppercase' or 'upper') or to lowercase (if 'lowercase' or 'lower') or keep it as resolved (if anything else)
 * @returns {string} the resolved stage (if non-blank); otherwise an empty string
 */
function resolveStage(event, awsContext, context) {
  // If no resolve stage settings have been configured yet, then configure the given context with the default settings
  if (!isResolveStageConfigured(context)) {
    configureResolveStageWithDefaults(context, true);
  }

  const inCase = getResolveStageSetting(context, 'inCase');

  // Attempt 1
  if (context && isNotBlank(context.stage)) {
    return toCase(trim(context.stage), inCase);
  }

  // Attempt 2
  if (event && isNotBlank(event.stage)) {
    return toCase(trim(event.stage), inCase);
  }

  // Attempt 3
  // Check have all the pieces needed to extract an alias and apply the given convertAliasToStage function to it
  const convertAliasToStage = getResolveStageSetting(context, 'convertAliasToStage');

  if (awsContext && isNotBlank(awsContext.functionVersion) && isNotBlank(awsContext.invokedFunctionArn) &&
    isFunction(convertAliasToStage)) {
    // Extract the alias
    const alias = getAlias(awsContext);

    // If the alias is not blank, apply the convertAliasToStage function to it to derive a stage
    const stage = isNotBlank(alias) ? convertAliasToStage(alias, event, awsContext, context) : '';
    if (isNotBlank(stage)) {
      return toCase(trim(stage), inCase);
    }
  }

  // Attempt 4
  function extractStageFromEventSourceARN(record) {
    if (record && isNotBlank(record.eventSourceARN)) {
      // Extract the stream name
      const streamName = getArnResources(record.eventSourceARN).resource;

      // If the stream name is not blank, apply the convertStreamNameToStage function to it to derive a stage
      return isNotBlank(streamName) ? convertStreamNameToStage(streamName, event, awsContext, context) : '';
    }
    return '';
  }

  // Check have all the pieces needed to extract a stream name and apply the given convertStreamNameToStage function to it
  const convertStreamNameToStage = getResolveStageSetting(context, 'convertStreamNameToStage');

  if (event && event.Records && event.Records.length > 0 && isFunction(convertStreamNameToStage)) {
    const stage = event.Records.map(extractStageFromEventSourceARN).find(s => isNotBlank(s));
    if (isNotBlank(stage)) {
      return toCase(trim(stage), inCase);
    }
  }

  // Attempt 5
  const defaultStage = getResolveStageSetting(context, 'defaultStage');
  if (isNotBlank(defaultStage)) {
    return toCase(trim(defaultStage), inCase);
  }

  // Give up
  return '';
}

/**
 * Returns the value of the named resolve stage setting (if any) on the given context.
 * @param context the context from which to fetch the named setting's value
 * @param settingName the name of the resolve stage setting
 * @returns {*|undefined} the value of the named setting (if any); otherwise undefined
 */
function getResolveStageSetting(context, settingName) {
  return context && context.resolveStageConfig && isNotBlank(settingName) && context.resolveStageConfig[settingName] ?
    context.resolveStageConfig[settingName] : undefined;
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
 * the configured streamNameStageSeparator (if any) or the default separator ('_').
 * @param {string} streamName the name of the source stream (originally extracted from the AWS event's eventSourceArn)
 * @param {Object} event the AWS event
 * @param {Object} awsContext the AWS context
 * @param {Object} context the context
 * @param {string|undefined} [context.resolveStageConfig.streamNameStageSeparator] - an optional non-blank separator to
 * use instead of '_'
 * @returns {string} the stage or an empty string
 */
function convertStreamNameSuffixToStage(streamName, event, awsContext, context) {
  if (isNotBlank(streamName)) {
    const separatorSetting = getResolveStageSetting(context, 'streamNameStageSeparator');
    const separator = isNotBlank(separatorSetting) ? separatorSetting : '_';
    const suffixStartPos = streamName.lastIndexOf(separator);
    return suffixStartPos !== -1 ? trimOrEmpty(streamName.substring(suffixStartPos + 1)) : '';
  }
  return '';
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
  return isNotBlank(stage) ? `${resourceName}${trimOrEmpty(separator)}${toCase(trim(stage), inCase)}` : resourceName;
}

/**
 * Converts the given value to uppercase, lowercase or keeps it as is according to the given asCase argument.
 * @param value the value to convert or keep as is
 * @param {string} asCase - specifies whether to convert the value to uppercase (if 'uppercase' or 'upper') or to
 * lowercase (if 'lowercase' or 'lower') or to keep it as provided (if anything else)
 * @return {string} the converted or given value
 */
function toCase(value, asCase) {
  if (isNotBlank(value)) {
    // Convert the given asCase argument to lowercase to facilitate matching
    const caseToUse = trimOrEmpty(asCase && asCase.toLowerCase ? asCase.toLowerCase() : asCase);

    // Convert the given stage into the requested case
    return caseToUse === 'lowercase' || caseToUse === 'lower' ? value.toLowerCase() :
      caseToUse === 'uppercase' || caseToUse === 'upper' ? value.toUpperCase() : value;
  }
  return value;
}

