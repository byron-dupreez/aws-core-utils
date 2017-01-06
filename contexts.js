'use strict';

const stages = require('./stages');
const kinesisCache = require('./kinesis-cache');
const dynamoDBDocClientCache = require('./dynamodb-doc-client-cache');

const Objects = require('core-functions/objects');

/**
 * Utilities for configuring contexts for API Gateway exposed and other types of Lambdas.
 *
 * A context object is typically passed in as the last argument to a function in order to provide access to configured
 * properties and/or configured functions inside the function and can also be used to maintain invocation-scoped state
 * across all of the functions traversed in an invocation chain.
 *
 * The contexts module currently includes utilities for:
 * - Configuring a standard context (for API Gateway exposed and other types of Lambdas) with stage handling, logging,
 *   custom settings, an optional Kinesis instance, an optional DynamoDB.DocumentClient instance, the current region,
 *   the resolved stage and the AWS context.
 * - Configuring a context with a custom object configured with custom settings and/or custom options, which is also
 *   used by {@linkcode configureStandardContext}.
 *
 * @module aws-core-utils/contexts.js
 * @author Byron du Preez
 */
module.exports = {
  /** Configures a standard context for API Gateway exposed and other types of Lambdas */
  configureStandardContext: configureStandardContext,

  /** Configures a context with custom settings and/or custom options */
  configureCustomSettings: configureCustomSettings
};

/**
 * Configures the given context as a standard context (for API Gateway exposed and other types of Lambdas) with stage
 * handling, logging, custom settings, an optional Kinesis instance, an optional DynamoDB.DocumentClient instance, the
 * current region, the resolved stage and the given AWS context based on the given settings and options.
 *
 * The distinction between options and settings is that options are meant to contain only non-function properties
 * typically loaded from a JSON file, whereas settings are meant to be constructed in code and hence can contain both
 * non-function properties and functions if needed.
 *
 * Note that if either the given event or AWS context are undefined, then everything other than the region, stage and
 * AWS context will be configured. This missing configuration can be configured at a later point in your code by
 * invoking {@linkcode stages#configureRegionStageAndAwsContext}. This separation of configuration is primarily useful
 * for unit testing.
 *
 * @param {Object|StandardContext} context - the context to configure as a standard context
 * @param {StandardSettings|undefined} [settings] - settings to use to configure a standard context
 * @param {StandardOptions|undefined} [options] - options to use to configure a standard context
 * @param {Object|undefined} [event] - the AWS event, which was passed to your lambda
 * @param {Object|undefined} [awsContext] - the AWS context, which was passed to your lambda
 * @param {boolean|undefined} [forceConfiguration] - whether or not to force configuration of the given settings and
 * options, which will ONLY override any previously configured stage handling settings on the given context
 * @return {StandardContext} the given context configured as a standard context
 * @throws {Error} an error if the region and/or stage cannot be resolved
 */
function configureStandardContext(context, settings, options, event, awsContext, forceConfiguration) {
  // Configure the given context with stage handling and its dependencies (i.e. logging)
  stages.configureStageHandling(context, settings ? settings.stageHandlingSettings : undefined,
    options ? options.stageHandlingOptions : undefined, settings, options, forceConfiguration);

  // Configure the given context with any custom settings and/or custom options
  configureCustomSettings(context, settings ? settings.customSettings : undefined, options ? options.customOptions : undefined);

  // Configure a Kinesis instance (if NOT already configured AND kinesisOptions were provided)
  if (!context.kinesis) {
    const kinesisSettingsAvailable = settings && settings.kinesisOptions;
    if (kinesisSettingsAvailable || (options && options.kinesisOptions)) {
      kinesisCache.configureKinesis(context, kinesisSettingsAvailable ? settings.kinesisOptions : options.kinesisOptions);
    }
  }

  // Configure a DynamoDB.DocumentClient instance (if NOT already configured AND dynamoDBDocClientOptions were provided)
  if (!context.dynamoDBDocClient) {
    const dynamoDBDocClientSettingsAvailable = settings && settings.dynamoDBDocClientOptions;
    if (dynamoDBDocClientSettingsAvailable || (options && options.dynamoDBDocClientOptions)) {
      dynamoDBDocClientCache.configureDynamoDBDocClient(context, dynamoDBDocClientSettingsAvailable ?
        settings.dynamoDBDocClientOptions : options.dynamoDBDocClientOptions);
    }
  }

  if (event && awsContext) {
    // Configure the given context with the current region, resolved stage and AWS context
    stages.configureRegionStageAndAwsContext(context, event, awsContext);
  }
  return context;
}

/**
 * Configures the given context with the given custom settings (if any) and custom options (if any) by first shallow
 * merging the given options into the given settings (without replacing any existing same named properties) and then by
 * shallow merging these combined settings into any existing custom settings in context.custom (again without replacing
 * any existing same named properties). So properties in context.custom take precedence over properties in settings,
 * which take precedence over properties in options.
 *
 * @param {Object|CustomAware} context - the context to configure with custom settings and/or options
 * @param {Object|undefined} [context.custom] - the object to configure with custom settings and/or options
 * @param {CustomSettings|undefined} [settings] - custom settings to configure onto context.custom
 * @param {CustomOptions|undefined} [options] - custom options to configure as defaults onto context.custom
 * @returns {CustomAware} the given context configured with custom settings in context.custom
 */
function configureCustomSettings(context, settings, options) {
  const settingsAvailable = settings && typeof settings == 'object';
  const optionsAvailable = options && typeof options === 'object';

  const customOptions = optionsAvailable ? Objects.copy(options, true) : {};

  const customSettings = settingsAvailable ?
    optionsAvailable ? Objects.merge(customOptions, settings, false, false) : settings :
    customOptions;

  context.custom = context.custom && typeof context.custom === 'object' ?
    Objects.merge(customSettings, context.custom, false, false) : customSettings;

  return context;
}