'use strict';

// Stage handling setting names
const ENV_STAGE_NAME_SETTING = 'envStageName';

const CUSTOM_TO_STAGE_SETTING = 'customToStage';
const CONVERT_ALIAS_TO_STAGE_SETTING = 'convertAliasToStage';

const STREAM_NAME_STAGE_SEPARATOR_SETTING = 'streamNameStageSeparator';
const INJECT_STAGE_INTO_STREAM_NAME_SETTING = 'injectStageIntoStreamName';
const EXTRACT_STAGE_FROM_STREAM_NAME_SETTING = 'extractStageFromStreamName';

const RESOURCE_NAME_STAGE_SEPARATOR_SETTING = 'resourceNameStageSeparator';
const INJECT_STAGE_INTO_RESOURCE_NAME_SETTING = 'injectStageIntoResourceName';
const EXTRACT_STAGE_FROM_RESOURCE_NAME_SETTING = 'extractStageFromResourceName';

const INJECT_IN_CASE_SETTING = 'injectInCase';
const EXTRACT_IN_CASE_SETTING = 'extractInCase';

/**
 * Stage handling utilities (primarily for AWS Lambda usage), which include the following:
 * - Utilities for resolving or deriving the current stage (e.g. dev, qa, prod) from various sources.
 * - Utilities for configuration of stage handling.
 * - Configurable and default functions for generating stage-qualified stream and resource names.
 * - Configurable and default functions for extracting stages from stage-qualified stream and resource names.
 *
 * @module aws-core-utils/stages
 * @author Byron du Preez
 */
module.exports = {
  // Configuration
  isStageHandlingConfigured: isStageHandlingConfigured,
  configureStageHandling: configureStageHandling,
  getDefaultStageHandlingSettings: getDefaultStageHandlingSettings,
  configureDefaultStageHandling: configureDefaultStageHandling,
  getStageHandlingSetting: getStageHandlingSetting,
  getStageHandlingFunction: getStageHandlingFunction,
  // Stage resolution
  resolveStage: resolveStage,
  configureStage: configureStage,
  // Stream name qualification
  toStageQualifiedStreamName: toStageQualifiedStreamName,
  extractStageFromQualifiedStreamName: extractStageFromQualifiedStreamName,
  // Resource name qualification
  toStageQualifiedResourceName: toStageQualifiedResourceName,
  extractStageFromQualifiedResourceName: extractStageFromQualifiedResourceName,

  /**
   * Default implementations of specialized versions of some of the above functions, which are NOT meant to be used
   * directly and are ONLY exposed to facilitate re-using some of these functions if needed in a customised stage
   * handling configuration.
   */
  DEFAULTS: {
    // Alias conversion
    convertAliasToStage: convertAliasToStage,
    // Stage-suffixed stream name qualification
    toStageSuffixedStreamName: toStageSuffixedStreamName,
    extractStageFromSuffixedStreamName: extractStageFromSuffixedStreamName,
    // Stage-suffixed resource name qualification
    toStageSuffixedResourceName: toStageSuffixedResourceName,
    extractStageFromSuffixedResourceName: extractStageFromSuffixedResourceName,
    // Generic utils
    toStageSuffixedName: toStageSuffixedName,
    toCase: toCase
  },
  FOR_TESTING_ONLY: {
    configureStageHandlingWithSettings: configureStageHandlingWithSettings
  }
};

const Strings = require('core-functions/strings');
const trim = Strings.trim;
const trimOrEmpty = Strings.trimOrEmpty;
const isBlank = Strings.isBlank;
const isNotBlank = Strings.isNotBlank;
const stringify = Strings.stringify;

const Objects = require('core-functions/objects');

const streamEvents = require('./stream-events');

const Lambdas = require('./lambdas');

const Arrays = require('core-functions/arrays');

const logging = require('logging-utils');

/**
 * Returns true if stage handling is already configured on the given context; false otherwise.
 * @param {Object} context - the context to check
 * @returns {boolean} true if configured; false otherwise
 */
function isStageHandlingConfigured(context) {
  return context && context.stageHandling && typeof context.stageHandling === 'object';
}

/**
 * Stage handling settings are used for configuring and customising stage handling behaviour. The stage handling
 * settings determine how {@linkcode resolveStage}, {@linkcode toStageQualifiedStreamName},
 * {@linkcode extractStageFromQualifiedStreamName}, {@linkcode toStageQualifiedResourceName},
 * {@linkcode extractStageFromQualifiedStreamName} and other internal functions will behave when invoked.
 *
 * NB: Add any, new custom settings that you need for any custom implementations of some or all of the stage handling
 * functions that you develop and configure via {@linkcode configureStageHandling}.
 *
 * Notes:
 * - If injectInCase is set to 'upper' then extractInCase should typically be set to 'lower'.
 * - If injectInCase is set to 'lower' then extractInCase should typically be set to 'upper'.
 * - If injectInCase is set to 'as_is' then extractInCase should typically be set to 'as_is'.
 *
 * - Recommendation: For clarity, use 'as_is' to keep extracted and resolved stages as is (i.e. to NOT convert them to
 *   either upper or lowercase). Technically any non-blank value will achieve the same result, but the 'as_is' is less
 *   confusing.
 *
 * @typedef {Object} StageHandlingSettings
 * @property {string|undefined} [envStageName] - the optional name of a process.env environment variable that holds the
 * configured stage (if any) (using AWS Lambda's new environment support), defaults to 'STAGE' if not defined
 * @property {Function|undefined} [customToStage] - an optional custom function that accepts: an AWS event; an AWS context;
 * and a context, and somehow extracts a usable stage from the AWS event and/or AWS context.
 * @property {Function|undefined} [convertAliasToStage] - an optional function that accepts: an extracted alias (if any);
 * an AWS event; an AWS context; and a context, and converts the alias into a stage
 * @property {Function|undefined} [injectStageIntoStreamName] - an optional function that accepts: an unqualified stream
 * name; a stage; and a context, and returns a stage-qualified stream name (effectively the reverse function of the
 * extractStageFromStreamName function)
 * @property {Function|undefined} [extractStageFromStreamName] - an optional function that accepts: a stage-qualified
 * stream name; and a context, and extracts a stage from the stream name
 * @property {string|undefined} [streamNameStageSeparator] - an optional non-blank separator to use to extract a stage from
 * a stage-qualified stream name or inject a stage into an unqualified stream name
 * @property {Function|undefined} [injectStageIntoResourceName] - an optional function that accepts: an unqualified
 * resource name; a stage; and a context, and returns a stage-qualified resource name (effectively the reverse function
 * of the extractStageFromResourceName function)
 * @property {Function|undefined} [extractStageFromResourceName] - an optional function that accepts: a stage-qualified
 * resource name; and a context, and extracts a stage from the resource name
 * @property {string|undefined} [resourceNameStageSeparator] - an optional non-blank separator to use to extract a stage
 * from a stage-qualified resource name or inject a stage into an unqualified resource name
 * @property {string|undefined} [injectInCase] - optionally specifies whether to convert an injected stage to uppercase (if
 * 'upper' or 'uppercase') or to lowercase (if 'lowercase' or 'lower') or keep it as given (if 'as_is' or anything else)
 * @property {string|undefined} [extractInCase] - optionally specifies whether to convert an extracted stage to uppercase
 * (if 'upper' or 'uppercase') or to lowercase (if 'lowercase' or 'lower') or keep it as extracted (if 'as_is' or
 * anything else)
 * @property {string|undefined} [defaultStage] - an optional default stage to use as a last resort if all other attempts fail
 */

/**
 * Stage handling options are a subset of the full (@linkcode StageHandlingSettings}, which are used to configure ONLY
 * the property (i.e. non-function) stage handling settings.
 * @typedef {Object} StageHandlingOptions
 * @property {string|undefined} [envStageName] - the optional name of a process.env environment variable that holds the
 * configured stage (if any) (using AWS Lambda's new environment support), defaults to 'STAGE' if not defined
 * @property {string|undefined} [streamNameStageSeparator] - an optional non-blank separator to use to extract a stage from
 * a stage-qualified stream name or inject a stage into an unqualified stream name
 * @property {string|undefined} [resourceNameStageSeparator] - an optional non-blank separator to use to extract a stage
 * from a stage-qualified resource name or inject a stage into an unqualified resource name
 * @property {string|undefined} [injectInCase] - optionally specifies whether to convert an injected stage to uppercase (if
 * 'upper' or 'uppercase') or to lowercase (if 'lowercase' or 'lower') or keep it as given (if 'as_is' or anything else)
 * @property {string|undefined} [extractInCase] - optionally specifies whether to convert an extracted stage to uppercase
 * (if 'upper' or 'uppercase') or to lowercase (if 'lowercase' or 'lower') or keep it as extracted (if 'as_is' or
 * anything else)
 * @property {string|undefined} [defaultStage] - an optional default stage to use as a last resort if all other attempts fail
 */

/**
 * Configures the given context with the given stage handling settings, but only if stage handling is not already
 * configured on the given context OR if forceConfiguration is true. The stage handling settings determine how
 * {@linkcode resolveStage}, {@linkcode toStageQualifiedStreamName}, {@linkcode extractStageFromQualifiedStreamName},
 * {@linkcode toStageQualifiedResourceName}, {@linkcode extractStageFromQualifiedStreamName} and other internal
 * functions will behave when invoked.
 *
 * @param {Object} context the context onto which to configure stage handling settings
 * @param {StageHandlingSettings} [context.stageHandling] - previously configured stage handling settings on the context (if any)
 * @param {StageHandlingSettings} settings - the new stage handling settings to use
 * @param {Object|undefined} [otherSettings] - optional other configuration settings to use
 * @param {LoggingSettings|undefined} [otherSettings.loggingSettings] - optional logging settings to use to configure logging
 * @param {Object|undefined} [otherOptions] - optional other configuration options to use if no corresponding other settings are provided
 * @param {LoggingOptions|undefined} [otherOptions.loggingOptions] - optional logging options to use to configure logging
 * @param {boolean|undefined} [forceConfiguration] - whether or not to force configuration of the given settings, which
 * will override any previously configured stage handling settings on the given context
 * @return {Object} the context object configured with stage handling settings
 */
function configureStageHandlingWithSettings(context, settings, otherSettings, otherOptions, forceConfiguration) {
  // Configure all dependencies if not configured
  configureDependencies(context, otherSettings, otherOptions, false);

  // If forceConfiguration is false check if the given context already has stage handling configured on it
  // and, if so, do nothing more and simply return the context as is (to prevent overriding an earlier configuration)
  if (!forceConfiguration && isStageHandlingConfigured(context)) {
    return context;
  }
  // Configure the stage handling settings
  context.stageHandling = settings;
  return context;
}

/**
 * Configures the given context with the default stage handling settings partially overridden by the given stage
 * handling options (if any), but only if stage handling is NOT already configured on the given context OR if
 * forceConfiguration is true.
 *
 * Default stage handling makes the following assumptions:
 * - Stages are all lowercase.
 * - AWS Lambda aliases are stages.
 * - The customToStage function is left undefined.
 * - A defaultStage is NOT defined (and it is probably not a good idea to set it in general).
 * - Stream names will be suffixed with an underscore and an uppercase stage.
 *   For example:
 *   - Injecting an unqualified stream name of "TestStream" with a stage of "qa" would give "TestStream_QA"
 *   - Extracting the stage from a qualified stream name of "My_Stream_PROD" would give "prod"
 * - Other resource names will also be suffixed with an underscore and an uppercase stage.
 *
 * Some or all of this default behaviour can be overridden using {@linkcode configureStageHandling}.
 *
 * @see {@linkcode configureStageHandling} for more information.
 *
 * @param {Object} context - the context onto which to configure the default stage handling settings
 * @param {StageHandlingSettings} [context.stageHandling] - previously configured stage handling settings on the context (if any)
 * @param {StageHandlingOptions|undefined} [options] - optional stage handling options to use to override the default options
 * @param {Object|undefined} [otherSettings] - optional other configuration settings to use
 * @param {LoggingSettings|undefined} [otherSettings.loggingSettings] - optional logging settings to use to configure logging
 * @param {Object|undefined} [otherOptions] - optional other configuration options to use if no corresponding other settings are provided
 * @param {LoggingOptions|undefined} [otherOptions.loggingOptions] - optional logging options to use to configure logging
 * @param {boolean|undefined} [forceConfiguration] - whether or not to force configuration of the default settings, which
 * will override any previously configured stage handling settings on the given context
 * @return {Object} the context object configured with stage handling settings (either existing or defaults or overrides)
 */
function configureDefaultStageHandling(context, options, otherSettings, otherOptions, forceConfiguration) {
  const settings = getDefaultStageHandlingSettings(options);
  return configureStageHandlingWithSettings(context, settings, otherSettings, otherOptions, forceConfiguration);
}

/**
 * Returns the default stage handling settings partially overridden by the given stage handling options (if any).
 *
 * This function is used internally by {@linkcode configureDefaultStageHandling}, but could also be used in custom
 * configurations to get the default settings as a base to be overridden with your custom settings before calling
 * {@linkcode configureStageHandling}.
 *
 * @param {StageHandlingOptions|undefined} [options] - optional stage handling options to use to override the default options
 * @returns {StageHandlingSettings} a stage handling settings object
 */
function getDefaultStageHandlingSettings(options) {
  const settings = options && typeof options === 'object' ? Objects.copy(options, true) : {};

  const defaultOptions = loadDefaultStageHandlingOptions();
  Objects.merge(defaultOptions, settings, false, false);

  const defaultSettings = {
    customToStage: undefined,
    convertAliasToStage: convertAliasToStage,

    injectStageIntoStreamName: toStageSuffixedStreamName,
    extractStageFromStreamName: extractStageFromSuffixedStreamName,

    injectStageIntoResourceName: toStageSuffixedResourceName,
    extractStageFromResourceName: extractStageFromSuffixedResourceName,
  };
  return Objects.merge(defaultSettings, settings, false, false);
}

/**
 * Loads the default stage handling options from the local stages-options.json file and fills in any missing options with the
 * static default options.
 * @returns {StageHandlingOptions} the default stage handling options
 */
function loadDefaultStageHandlingOptions() {
  const options = require('./stages-options.json');
  const defaultOptions = options ? options.stageHandlingOptions : {};

  const defaults = {
    envStageName: 'STAGE',
    streamNameStageSeparator: '_',
    resourceNameStageSeparator: '_',
    injectInCase: 'upper',
    extractInCase: 'lower',
    defaultStage: undefined
  };
  return Objects.merge(defaults, defaultOptions, false, false);
}

/**
 * Returns the value of the named stage handling setting (if any) on the given context.
 * @param context - the context from which to fetch the named setting's value
 * @param settingName - the name of the stage handling setting
 * @returns {*|undefined} the value of the named setting (if any); otherwise undefined
 */
function getStageHandlingSetting(context, settingName) {
  return context && context.stageHandling && isNotBlank(settingName) && context.stageHandling[settingName] ?
    context.stageHandling[settingName] : undefined;
}

/**
 * Returns the function configured at the named stage handling setting on the given context (if any and if it's a real
 * function); otherwise returns undefined.
 * @param context - the context from which to fetch the function
 * @param settingName - the name of the stage handling setting
 * @returns {*|undefined} the named function (if it's a function); otherwise undefined
 */
function getStageHandlingFunction(context, settingName) {
  const fn = getStageHandlingSetting(context, settingName);
  return typeof fn === 'function' ? fn : undefined;
}

/**
 * Configures the given context with the given stage handling settings (if any) otherwise with the default stage
 * handling settings partially overridden by the given stage handling options (if any), but only if stage handling is
 * not already configured on the given context OR if forceConfiguration is true.
 *
 * @param {Object} context - the context to configure
 * @param {StageHandlingSettings|undefined} [settings] - optional stage handling settings to use to configure stage handling
 * @param {StageHandlingOptions|undefined} [options] - optional stage handling options to use to override default options
 * @param {Object|undefined} [otherSettings] - optional other settings to use to configure dependencies
 * @param {LoggingSettings|undefined} [otherSettings.loggingSettings] - optional logging settings to use to configure logging
 * @param {Object|undefined} [otherOptions] - optional other options to use to configure dependencies if corresponding settings are not provided
 * @param {LoggingOptions|undefined} [otherOptions.loggingOptions] - optional logging options to use to configure logging
 * @param {boolean|undefined} [forceConfiguration] - whether or not to force configuration of the given settings, which
 * will override any previously configured stage handling settings on the given context
 * @returns {Object} the given context
 */
function configureStageHandling(context, settings, options, otherSettings, otherOptions, forceConfiguration) {
  // Determine the stage handling settings to be used
  const settingsAvailable = settings && typeof settings === 'object';
  const optionsAvailable = options && typeof options === 'object';

  // // First configure all stage handling dependencies
  // configureDependencies(context, otherSettings, otherOptions, false);

  // Check if stage handling was already configured
  const stageHandlingWasConfigured = isStageHandlingConfigured(context);

  const defaultSettings = getDefaultStageHandlingSettings(options);

  const stageHandlingSettings = settingsAvailable ?
    Objects.merge(defaultSettings, settings, false, false) : defaultSettings;

  // Configure stage handling with the given or derived stage handling settings
  configureStageHandlingWithSettings(context, stageHandlingSettings, otherSettings, otherOptions, forceConfiguration);

  // Log a warning if no settings and no options were provided and the default settings were applied
  if (!settingsAvailable && !optionsAvailable && (forceConfiguration || !stageHandlingWasConfigured)) {
    context.warn(`Stage handling was configured without settings or options - used default stage handling configuration (${stringify(stageHandlingSettings)})`);
  }
  return context;
}

/**
 * Configures the given context with the stage handling dependencies (currently only logging) using the given other
 * settings and given other options.
 *
 * @param {Object} context - the context onto which to configure the given stage handling dependencies
 * @param {Object|undefined} [otherSettings] - optional other configuration settings to use
 * @param {LoggingSettings|undefined} [otherSettings.loggingSettings] - optional logging settings to use to configure logging
 * @param {Object|undefined} [otherOptions] - optional other configuration options to use if no corresponding other settings are provided
 * @param {LoggingOptions|undefined} [otherOptions.loggingOptions] - optional logging options to use to configure logging
 * @param {boolean|undefined} [forceConfiguration] - whether or not to force configuration of the given settings, which
 * will override any previously configured dependencies' settings on the given context
 * @returns {Object} the context object configured with stage handling dependencies
 */
function configureDependencies(context, otherSettings, otherOptions, forceConfiguration) {
  // Configure logging if not configured yet
  logging.configureLogging(context, otherSettings ? otherSettings.loggingSettings : undefined,
    otherOptions ? otherOptions.loggingOptions : undefined, undefined, forceConfiguration);
}

/**
 * Attempts to resolve the stage from the given AWS event, AWS context and context using the following process:
 *
 * 1. Uses an explicit (or previously resolved) context.stage (if non-blank).
 *
 * 2. Uses the stage in the process.env[context.envStageName] environment variable (if any), which must be configured
 *    using AWS Lambda's new environment support. This is now the preferred way of configuring the current stage.
 *
 * 3. Uses the given context's stageHandling.customToStage function (if any) to attempt to somehow extract a stage from
 *    the AWS event and/or AWS context. This function has no default implementation and is merely provided as a hook for
 *    callers to add their own custom technique for resolving a stage, which will take precedence over all other steps
 *    other step 1, which uses an explicit context.stage.
 *
 * 4. Uses the AWS event's stage (if non-blank).
 *    NB: event.stage is NOT a standard AWS event property, but it may be set by API Gateway or tools like serverless.
 *
 * 5. Extracts the alias from the AWS context's invokedFunctionArn (if any) and then uses the given context's
 *    stageHandling.convertAliasToStage function (if any) to convert the extracted alias (if any) into a stage.
 *
 *    NB: This step relies on a convention of using Lambda aliases as stages. If you are NOT using such a convention,
 *    then disable this step by simply NOT configuring a stageHandling.convertAliasToStage function on the context (see
 *    {@linkcode configureStageHandling}).
 *
 * 6. Extracts the stream (or table) names from the AWS event's records' eventSourceARNs (if any) and then uses the
 *    given context's configured stageHandling.extractStageFromStreamName (or stageHandling.extractStageFromResourceName)
 *    function (if defined) to extract the stages from these stream (or table) names and returns the first non-blank
 *    stage (if any and if there are NOT multiple distinct results).
 *
 *    NB: This step relies on a convention of qualifying stream and table names with a stage. If you are NOT using such
 *    a convention, then disable this step by simply NOT configuring stageHandling.extractStageFromStreamName and
 *    stageHandling.extractStageFromResourceName functions on the context (see {@linkcode configureStageHandling}).
 *    Note that doing this will also disable the {@linkcode extractStageFromQualifiedStreamName} and
 *    {@linkcode extractStageFromQualifiedResourceName} functions.
 *
 * 7. Uses context.stageHandling.defaultStage (if non-blank).
 *
 * 8. Uses context.defaultStage (if non-blank).
 *
 * 9. Gives up and returns an empty string.
 *
 * NB: If no stage handling settings have been configured by the time this function is first called, then the given
 * context will be configured with the default stage handling settings (see {@linkcode configureDefaultStageHandling}).
 *
 * @param {Object} event - the AWS event
 * @param {Object} awsContext - the AWS context, which was passed to your lambda
 * @param {Object} context - the context to use, which will contain any and all of the pre-configured settings
 * @param {string|undefined} [context.stage] - an optional stage on the given context, which will short-circuit
 * resolution to this stage (if non-blank)
 * @param {StageHandlingSettings|undefined} [context.stageHandling] - the configured stage handling settings (if any) on
 * the given context, which can be used to pass additional configuration through to any custom functions that you configured
 * @param {Function|undefined} [context.stageHandling.customToStage] - an optional custom function that accepts: an
 * AWS event; an AWS context; and a context, and somehow extracts and returns a usable stage from the AWS event and/or
 * AWS context
 * @param {Function|undefined} [context.stageHandling.convertAliasToStage] - an optional function on the given
 * context that accepts: an extracted alias (if any); an AWS event; an AWS context; and a context, and converts the
 * alias into a stage
 * @param {Function|undefined} [context.stageHandling.extractStageFromStreamName] - an optional function on the given
 * context that accepts: a stage-qualified stream name; and a context, and extracts a stage from the stream name
 * @param {Function|undefined} [context.stageHandling.extractStageFromResourceName] - an optional function on the given
 * context that accepts: a stage-qualified resource (e.g. table) name; and a context, and extracts a stage from the resource name
 * @param {string|undefined} [context.stageHandling.defaultStage] - an optional default stage on the given context to
 * use as a second last resort if all other attempts fail (configure this via configureStageHandling)
 * @param {string|undefined} [context.defaultStage] - an optional default stage on the given context to use as the LAST
 * resort if all other attempts fail
 * @param {string|undefined} [context.stageHandling.extractInCase] - specifies whether to convert the resolved stage to
 * uppercase (if 'upper' or 'uppercase') or to lowercase (if 'lower' or 'lowercase') or keep it as resolved (if 'as_is'
 * or anything else)
 * @returns {string} the resolved stage (if non-blank); otherwise an empty string
 */
function resolveStage(event, awsContext, context) {
  // Ensure at least default configuration is in place at this point
  configureDefaultStageHandling(context, undefined, undefined, require('./stages-options.json'), false);

  // Resolve extractInCase
  const extractInCase = getStageHandlingSetting(context, EXTRACT_IN_CASE_SETTING);

  // Attempt 1
  if (context && isNotBlank(context.stage)) {
    context.debug(`Resolved stage (${context.stage}) from context.stage)`);
    return toCase(trim(context.stage), extractInCase);
  }

  // Attempt 2
  const envStageName = getStageHandlingSetting(context, ENV_STAGE_NAME_SETTING);

  if (isNotBlank(envStageName)) {
    // Look up the current stage from the named process.env environment variable
    const stage = process.env[envStageName];

    if (isNotBlank(stage) && stage !== 'undefined' && stage !== 'null') {
      context.debug(`Resolved stage (${stage}) from process.env.${envStageName}`);
      return toCase(trim(stage), extractInCase);
    }
  }

  // Attempt 3
  const customToStage = getStageHandlingFunction(context, CUSTOM_TO_STAGE_SETTING);

  if (customToStage) {
    const stage = customToStage(event, awsContext, context);

    if (isNotBlank(stage)) {
      context.debug(`Resolved stage (${stage}) from custom function`);
      return toCase(trim(stage), extractInCase);
    }
  }

  // Attempt 4
  if (event && isNotBlank(event.stage)) {
    context.debug(`Resolved stage (${event.stage}) from event.stage)`);
    return toCase(trim(event.stage), extractInCase);
  }

  // Attempt 5
  // Check have all the pieces needed to extract an alias and apply the given convertAliasToStage function to it
  const convertAliasToStage = getStageHandlingFunction(context, CONVERT_ALIAS_TO_STAGE_SETTING);

  if (convertAliasToStage && awsContext && isNotBlank(awsContext.functionVersion) && isNotBlank(awsContext.invokedFunctionArn)) {
    // Extract the alias
    const alias = Lambdas.getAlias(awsContext);

    // If the alias is not blank, apply the convertAliasToStage function to it to derive a stage
    const stage = isNotBlank(alias) ? convertAliasToStage(trim(alias), event, awsContext, context) : '';

    if (isNotBlank(stage)) {
      context.debug(`Resolved stage (${stage}) from alias (${alias})`);
      return toCase(trim(stage), extractInCase);
    }
  }

  // Attempt 6
  const eventSources = Arrays.distinct(streamEvents.getEventSources(event).filter(isNotBlank));

  if (eventSources.length < 1) {
    // No eventSources
    context.warn(`Cannot resolve a stage from a stream or table name from an event WITHOUT an eventSource - event (${stringify(event)})!`);
  } else if (eventSources.length > 1) {
    // Multiple distinct eventSources
    context.warn(`Cannot resolve a stage from a stream or table name from an event with MULTIPLE distinct event sources ${stringify(eventSources)} - event (${stringify(event)})!`);
  } else {
    // Only 1 distinct eventSource
    const eventSource = eventSources[0];
    const eventSourceIsKinesis = eventSource === 'aws:kinesis';
    const eventSourceIsDynamoDB = eventSource === 'aws:dynamodb';
    let stages = [];

    if (!eventSourceIsKinesis && !eventSourceIsDynamoDB) {
      context.warn(`Cannot resolve a stage from a stream or table name from an event with an unexpected event source ${eventSource} - event (${stringify(event)})!`);
    } else {
      if (eventSourceIsKinesis) {
        // Check have all the pieces needed to extract a stream name and apply the given extractStageFromStreamName function to it
        const extractStageFromStreamName = getStageHandlingFunction(context, EXTRACT_STAGE_FROM_STREAM_NAME_SETTING);
        if (extractStageFromStreamName && event && event.Records) {
          stages = streamEvents.getKinesisEventSourceStreamNames(event)
            .map(streamName => isNotBlank(streamName) ? extractStageFromStreamName(trim(streamName), context) : '')
            .filter(isNotBlank);
        }
      } else if (eventSourceIsDynamoDB) {
        // Check have all the pieces needed to extract a table name and apply the given extractStageFromResourceName function to it
        const extractStageFromTableName = getStageHandlingFunction(context, EXTRACT_STAGE_FROM_RESOURCE_NAME_SETTING);
        if (extractStageFromTableName && event && event.Records) {
          stages = streamEvents.getDynamoDBEventSourceTableNames(event)
            .map(tableName => isNotBlank(tableName) ? extractStageFromTableName(trim(tableName), context) : '')
            .filter(isNotBlank);
        }
      }
      let stage = stages.length > 0 ? stages[0] : undefined;

      if (stages.length > 1) {
        const distinctStages = Arrays.distinct(stages);
        if (distinctStages > 1) {
          context.warn(`WARNING - Ignoring arbitrary first stage (${stage}), since found MULTIPLE distinct stages ${stringify(distinctStages)} on event (${stringify(event)})!`);
          stage = ''; // too many choices, so choose none
        }
      }

      if (isNotBlank(stage)) {
        context.debug(`Resolved stage (${stage}) from event source ARN ${eventSourceIsKinesis ? 'stream' : 'table'} name`);
        return toCase(trim(stage), extractInCase);
      }
    }
  }

  // Attempt 7
  const stageHandlingDefaultStage = getStageHandlingSetting(context, 'defaultStage');

  if (isNotBlank(stageHandlingDefaultStage)) {
    context.debug(`Resolved stage (${event.stage}) from context.stageHandling.defaultStage)`);
    return toCase(trim(stageHandlingDefaultStage), extractInCase);
  }

  // Attempt 8
  const defaultStage = context && context.defaultStage ? context.defaultStage : undefined;

  if (isNotBlank(defaultStage)) {
    context.debug(`Resolved stage (${event.stage}) from context.defaultStage)`);
    return toCase(trim(defaultStage), extractInCase);
  }

  // Give up 9
  return '';
}

//noinspection JSUnusedLocalSymbols
/**
 * A default convertAliasToStage function that simply returns the given alias (if any) exactly as it is as the stage.
 *
 * @param {string} [alias] the alias (if any) previously extracted from the AWS context's invokedFunctionArn
 * @param {Object} event - the AWS event
 * @param {Object} awsContext - the AWS context
 * @param {Object} context - the context
 * @returns {string} the resolved stage (if non-blank); otherwise an empty string
 */
function convertAliasToStage(alias, event, awsContext, context) {
  return isNotBlank(alias) ? trim(alias) : '';
}

// =====================================================================================================================
// Stream name qualification
// =====================================================================================================================

/**
 * Converts the given unqualified stream name (if non-blank) into a stage-qualified stream name by injecting the given
 * stage into it (if an injectStageIntoStreamName function is configured); otherwise returns the given stream name.
 *
 * This function uses the configured injectStageIntoStreamName function (if any) on the given context to determine its
 * actual behaviour.
 *
 * @param {string} unqualifiedStreamName - the unqualified name of the stream
 * @param {string} stage - the stage to inject
 * @param {Object} context - the context, which can also be used to pass additional configuration through to a custom
 * injectStageIntoStreamName function that you configured
 * @param {Function|undefined} [context.stageHandling.injectStageIntoStreamName] - an optional function that accepts:
 * an unqualified stream name; a stage; and a context, and returns a stage-qualified stream name
 * @returns {string} a stage-qualified stream name (or the given stream name)
 */
function toStageQualifiedStreamName(unqualifiedStreamName, stage, context) {
  return _toStageQualifiedName(unqualifiedStreamName, stage, INJECT_STAGE_INTO_STREAM_NAME_SETTING, context);
}

/**
 * Extracts the stage from the given stage-qualified stream name (if non-blank and an extractStageFromStreamName
 * function is configured); otherwise returns an empty string.
 *
 * This function uses the configured extractStageFromStreamName function (if any) on the given context to determine its
 * actual behaviour.
 *
 * @param {string} qualifiedStreamName - the stage-qualified stream name
 * @param {Object} context - the context, which can also be used to pass additional configuration through to a custom
 * extractStageFromStreamName function that you configured
 * @param {Function|undefined} [context.stageHandling.extractStageFromStreamName] - an optional function that accepts:
 * a stage-qualified stream name; and a context, and extracts a stage from the stream name
 * @returns {string} the stage extracted from the stage-qualified stream name or an empty string
 */
function extractStageFromQualifiedStreamName(qualifiedStreamName, context) {
  return _extractStageFromQualifiedName(qualifiedStreamName, EXTRACT_STAGE_FROM_STREAM_NAME_SETTING, context);
}

// =====================================================================================================================
// Stream name qualification (default)
// =====================================================================================================================

/**
 * Returns a stage-suffixed version of the given unsuffixed stream name with an appended stage suffix, which will
 * contain the configured streamNameToStageSeparator followed by the given stage, which will be appended in uppercase,
 * lowercase or kept as is according to the configured injectInCase.
 *
 * @param {string} unsuffixedStreamName - the unsuffixed name of the stream
 * @param {string} stage - the stage to append
 * @param {Object} context - the context
 * @param {string|undefined} [context.stageHandling.streamNameStageSeparator] - an optional non-blank separator to use
 * to append a stage suffix to an unsuffixed stream name
 * @param {string|undefined} [context.stageHandling.injectInCase] - specifies whether to convert the stage to uppercase
 * (if 'upper' or 'uppercase') or to lowercase (if 'lower' or 'lowercase') or keep it as is (if 'as_is' or anything else)
 * @returns {string} the stage-suffixed stream name
 */
function toStageSuffixedStreamName(unsuffixedStreamName, stage, context) {
  return _toStageSuffixedName(unsuffixedStreamName, stage, STREAM_NAME_STAGE_SEPARATOR_SETTING, context);
}

/**
 * A default extractStageFromStreamName function that extracts the stage from the given stage-suffixed stream name.
 *
 * The suffix is extracted from the given stream name by taking everything after the last occurrence of the configured
 * streamNameStageSeparator (if any).
 *
 * @param {string} stageSuffixedStreamName - the stage-suffixed name of the stream
 * @param {Object} context - the context
 * @param {string|undefined} [context.stageHandling.streamNameStageSeparator] - an optional non-blank separator to use
 * @param {string|undefined} [context.stageHandling.extractInCase] - specifies whether to convert the stage to uppercase
 * (if 'upper' or 'uppercase') or to lowercase (if 'lower' or 'lowercase') or keep it as is (if anything else);
 * @returns {string} the stage (if extracted) or an empty string
 */
function extractStageFromSuffixedStreamName(stageSuffixedStreamName, context) {
  return _extractStageFromSuffixedName(stageSuffixedStreamName, STREAM_NAME_STAGE_SEPARATOR_SETTING, context);
}

// =====================================================================================================================
// Resource name qualification
// =====================================================================================================================

/**
 * Converts the given unqualified resource name (if non-blank) into a stage-qualified resource name by injecting the
 * given stage into it (if an injectStageIntoResourceName function is configured); otherwise returns the given resource
 * name as is.
 *
 * This function uses the configured injectStageIntoResourceName function (if any) on the given context function to
 * determine its actual behaviour.
 *
 * @param {string} unqualifiedResourceName - the unqualified name of the resource
 * @param {string} stage - the stage to inject
 * @param {Object} context - the context, which can also be used to pass additional configuration through to a custom
 * injectStageIntoResourceName function that you configured
 * @param {Function|undefined} context.stageHandling.injectStageIntoResourceName - an optional function that accepts:
 * an unqualified resource name; a stage; and a context, and returns a stage-qualified resource name
 * @returns {string} a stage-qualified resource name
 */
function toStageQualifiedResourceName(unqualifiedResourceName, stage, context) {
  return _toStageQualifiedName(unqualifiedResourceName, stage, INJECT_STAGE_INTO_RESOURCE_NAME_SETTING, context);
}

/**
 * Extracts the stage from the given stage-qualified resource name (if non-blank and an extractStageFromResourceName
 * function is configured); otherwise returns an empty string.
 *
 * This function uses the configured extractStageFromResourceName function (if any) on the given context to determine
 * its actual behaviour.
 *
 * @param {string} qualifiedResourceName - the stage-qualified resource name
 * @param {Object} context - the context, which can also be used to pass additional configuration through to a custom
 * extractStageFromResourceName function that you configured
 * @param {Function|undefined} [context.stageHandling.extractStageFromResourceName] - an optional function that accepts:
 * a stage-qualified resource name; and a context, and extracts a stage from the resource name
 * @returns {string} the stage extracted from the stage-qualified resource name; or an empty string
 */
function extractStageFromQualifiedResourceName(qualifiedResourceName, context) {
  return _extractStageFromQualifiedName(qualifiedResourceName, EXTRACT_STAGE_FROM_RESOURCE_NAME_SETTING, context);
}

// =====================================================================================================================
// Resource name qualification (default)
// =====================================================================================================================

/**
 * Returns a stage-suffixed version of the given unsuffixed resource name with an appended stage suffix, which will
 * contain the configured resourceNameToStageSeparator followed by the given stage, which will be appended in uppercase,
 * lowercase or kept as is according to the configured injectInCase.
 * @param {string} unsuffixedResourceName - the unsuffixed name of the resource (e.g. an unsuffixed DynamoDB table name)
 * @param {string} stage - the stage to append
 * @param {Object} context - the context
 * @param {string|undefined} [context.stageHandling.resourceNameStageSeparator] - an optional non-blank separator to use
 * to append a stage suffix to an unsuffixed stream name
 * @param {string|undefined} [context.stageHandling.injectInCase] - specifies whether to convert the stage to uppercase
 * (if 'upper' or 'uppercase') or to lowercase (if 'lower' or 'lowercase') or keep it as is (if 'as_is' or anything else)
 * @returns {string} the stage-suffixed resource name
 */
function toStageSuffixedResourceName(unsuffixedResourceName, stage, context) {
  return _toStageSuffixedName(unsuffixedResourceName, stage, RESOURCE_NAME_STAGE_SEPARATOR_SETTING, context);
}

/**
 * A default extractStageFromResourceName function that extracts the stage from the given stage-suffixed resource name.
 * The suffix is extracted from the given resource name by taking everything after the last occurrence of the configured
 * resourceNameStageSeparator (if any).
 *
 * @param {string} stageSuffixedResourceName the stage-suffixed name of the resource
 * @param {Object} context the context
 * @param {string|undefined} [context.stageHandling.resourceNameStageSeparator] - an optional non-blank separator to use
 * @param {string|undefined} [context.stageHandling.extractInCase] - specifies whether to convert the stage to uppercase
 * (if 'upper' or 'uppercase') or to lowercase (if 'lower' or 'lowercase') or keep it as is (if 'as-is' or anything else)
 * @returns {string} the stage (if extracted) or an empty string
 */
function extractStageFromSuffixedResourceName(stageSuffixedResourceName, context) {
  return _extractStageFromSuffixedName(stageSuffixedResourceName, RESOURCE_NAME_STAGE_SEPARATOR_SETTING, context)
}

// =====================================================================================================================
// Generic name qualification
// =====================================================================================================================

function _toStageQualifiedName(unqualifiedName, stage, injectStageIntoNameSettingName, context) {
  if (isNotBlank(unqualifiedName)) {
    configureDefaultStageHandling(context);

    // Resolve injectStageIntoName function to use
    const injectStageIntoName = getStageHandlingFunction(context, injectStageIntoNameSettingName);

    return injectStageIntoName ? injectStageIntoName(trim(unqualifiedName), stage, context) : unqualifiedName;
  }
  return unqualifiedName;
}

function _extractStageFromQualifiedName(qualifiedName, extractStageFromNameSettingName, context) {
  if (isNotBlank(qualifiedName)) {
    configureDefaultStageHandling(context);

    // Resolve extractStageFromName function to use
    const extractStageFromName = getStageHandlingFunction(context, extractStageFromNameSettingName);

    return extractStageFromName ? extractStageFromName(trim(qualifiedName), context) : '';
  }
  return '';
}

// =====================================================================================================================
// Generic name qualification (default)
// =====================================================================================================================

function _toStageSuffixedName(unsuffixedName, stage, separatorSettingName, context) {
  if (isNotBlank(unsuffixedName)) {
    configureDefaultStageHandling(context);

    // Resolve separator
    const separator = getStageHandlingSetting(context, separatorSettingName);

    // Resolve injectInCase
    const injectInCase = getStageHandlingSetting(context, INJECT_IN_CASE_SETTING);

    return toStageSuffixedName(unsuffixedName, separator, stage, injectInCase);
  }
  return '';
}

function _extractStageFromSuffixedName(stageSuffixedName, separatorSettingName, context) {
  if (isNotBlank(stageSuffixedName)) {
    configureDefaultStageHandling(context);

    // Resolve separator
    const separator = getStageHandlingSetting(context, separatorSettingName);

    // Resolve extractInCase
    const extractInCase = getStageHandlingSetting(context, EXTRACT_IN_CASE_SETTING);

    // Extract stage using separator and convert to case specified by extractInCase
    const suffixStartPos = stageSuffixedName.lastIndexOf(separator);
    return suffixStartPos !== -1 ? trimOrEmpty(toCase(stageSuffixedName.substring(suffixStartPos + 1), extractInCase)) : '';
  }
  return '';
}

/**
 * Returns a stage-suffixed version of the given unsuffixed name with an appended stage suffix, which will contain the
 * given separator followed by the given stage, which will be appended in uppercase, lowercase or kept as is according
 * to the given inCase.
 * @param {string} unsuffixedName - the unsuffixed name
 * @param {string} separator - the separator to use to separate the resource name from the stage
 * @param {string} stage - the stage to append
 * @param {string} inCase - specifies whether to convert the stage to uppercase (if 'uppercase' or 'upper') or to
 * lowercase (if 'lowercase' or 'lower') or keep it as provided (if 'as_is' or anything else)
 * @return {string} the stage-suffixed name
 */
function toStageSuffixedName(unsuffixedName, separator, stage, inCase) {
  const name = trim(unsuffixedName);
  const stageSuffix = isNotBlank(stage) ? `${trimOrEmpty(separator)}${toCase(trim(stage), inCase)}` : '';
  return isNotBlank(name) && isNotBlank(stageSuffix) && !name.endsWith(stageSuffix) ? `${name}${stageSuffix}` : name;
}

/**
 * Converts the given value to uppercase, lowercase or keeps it as is according to the given asCase argument.
 * @param value - the value to convert or keep as is
 * @param {string} asCase - specifies whether to convert the value to uppercase (if 'uppercase' or 'upper') or to
 * lowercase (if 'lowercase' or 'lower') or to keep it as provided (if 'as_is' or anything else)
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

/**
 * Returns context.stage from the given context if it is already defined; otherwise attempts to resolve the stage and
 * then, if non-blank, configure the stage on the given context (as context.stage); otherwise either raises an error
 * (if failFast is explicitly true) or logs a warning.
 * @param {Object} context - a context on which to set the stage
 * @param {Object} [context.stage] - a context on which to set the stage
 * @param {Object} event - the AWS event
 * @param {Object} awsContext - the AWS context, which was passed to your lambda
 * @param {boolean|undefined} [failFast] - an optional failFast flag, which is only used when a needed resolved stage is
 * blank and which determines whether the error will be raised (if failFast is explicitly true) or logged as a warning
 * @throws {Error} if failFast is explicitly true and a needed resolved stage is blank
 * @returns {Object} the context with its existing stage or the resolved stage or an empty string stage.
 */
function configureStage(context, event, awsContext, failFast) {
  if (!context.stage) {
    const stage = resolveStage(event, awsContext, context);
    if (isBlank(stage)) {
      const errorMsg = `Failed to resolve stage from event (${JSON.stringify(event)}) and awsContext (${JSON.stringify(awsContext)}) - consider configuring a fallback stage on context.defaultStage (or on context.stageHandling.defaultStage via configureStageHandling); or, less preferable, on context.stage (as a complete override)`;
      // If failFast is explicitly true, then log and raise this error
      if (failFast === true) {
        context.error(errorMsg);
        throw new Error(errorMsg);
      }
      // Otherwise log the error as a warning and set context.stage to an empty string
      context.warn(errorMsg);
      context.stage = '';
    } else {
      // Resolved a non-blank stage!
      context.stage = stage;
    }
  }
  return context;
}