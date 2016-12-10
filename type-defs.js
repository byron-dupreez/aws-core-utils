'use strict';

/**
 * @typedef {StageHandling} StandardContext - an object configured as a standard context with stage handling, logging,
 * custom settings, an optional Kinesis instance and an optional DynamoDB DocumentClient instance and OPTIONALLY also
 * with the current region, the resolved stage and the AWS context
 * @property {CustomSettings|undefined} custom - an object configured with optional custom settings to use
 * @property {AWS.Kinesis|undefined} [kinesis] - an optional AWS.Kinesis instance to use
 * @property {AWS.DynamoDB.DocumentClient|undefined} [dynamoDBDocClient] - an optional AWS.DynamoDB.DocumentClient instance to use
 * @property {string|undefined} [region] - the name of the AWS region to use
 * @property {string|undefined} [stage] - the configured stage to use
 * @property {Object|undefined} [awsContext] - the AWS context passed to your Lambda function on invocation
 */

/**
 * @typedef {Object} StandardSettings - settings to be used to configure a standard context (see StandardContext)
 * @property {LoggingSettings|undefined} [loggingSettings] - optional logging settings to use to configure logging
 * @property {StageHandlingSettings|undefined} [stageHandlingSettings] - optional stage handling settings to use to configure stage handling
 * @property {CustomSettings|undefined} [customSettings] - custom settings to be merged into an existing or new context.custom object
 * @property {Object|undefined} [kinesisOptions] - optional Kinesis constructor options to use to configure an AWS.Kinesis instance
 * @property {Object|undefined} [dynamoDBDocClientOptions] - optional DynamoDB.DocumentClient constructor options to use to configure an AWS.DynamoDB.DocumentClient instance
 */

/**
 * @typedef {Object} StandardOptions - options to be used to configure a standard context (see StandardContext)
 * @property {LoggingOptions|undefined} [loggingOptions] - optional logging options to use to configure logging
 * @property {StageHandlingOptions|undefined} [stageHandlingOptions] - optional stage handling options to use to configure stage handling
 * @property {CustomOptions|undefined} [customOptions] - custom options to be merged into an existing or new context.custom object
 * @property {Object|undefined} [kinesisOptions] - optional Kinesis constructor options to use to configure an AWS.Kinesis instance
 * @property {Object|undefined} [dynamoDBDocClientOptions] - optional DynamoDB.DocumentClient constructor options to use to configure an AWS.DynamoDB.DocumentClient instance
 */

/**
 * @typedef {Object} CustomAware - a context object configured with custom settings
 * @property {CustomSettings|undefined} custom - an object configured with optional custom settings to use
 * Any existing context.custom settings take precedence over and will replace any same named CustomSettings settings and
 * CustomOptions options when merged together to create the final context.custom object during configuration via
 * {@linkcode contexts#configureCustomSettings}
 */

/**
 * @typedef {Object} CustomSettings - optional custom settings to be merged into an existing or new context.custom object
 * Any CustomSettings settings take precedence over and will replace any same named CustomOptions options when merged
 * together to create the final context.custom object during configuration via {@linkcode contexts#configureCustomSettings}
 */

/**
 * @typedef {Object} CustomOptions - optional custom options to be merged with any CustomSettings settings and then
 * merged into an existing or new context.custom object during configuration via {@linkcode contexts#configureCustomSettings}
 */

/**
 * @typedef {Object} RegionAware - an object configured with the name of an AWS region to use, which is typically the
 * current AWS region sourced from a Lambda's AWS_REGION environment variable
 * @property {string} region - the name of the AWS region to use
 */

/**
 * @typedef {StageAware} RegionStageAWSContextAware - an object configured with the name of the current AWS region,
 * the AWS context and the resolved stage, which implies pre-configured stage handling settings and logging functionality
 * @property {string} region - the name of the AWS region to use
 * @property {Object} awsContext - the AWS context passed to your Lambda function on invocation
 */

/**
 * @typedef {StageHandling} StageAware - an object configured with a stage, stage handling settings and logging functionality
 * @property {string} stage - the configured stage to use
 * @property {string|undefined} [defaultStage] - an optional default stage to use during stage resolution as the LAST
 * resort if all other attempts fail
 */

/**
 * @typedef {Object} KinesisAware - an object configured with an AWS.Kinesis instance
 * @property {AWS.Kinesis} kinesis - an AWS.Kinesis instance to use
 */

/**
 * @typedef {Object} DynamoDBDocClientAware - an object configured with an AWS.DynamoDB.DocumentClient instance
 * @property {AWS.DynamoDB.DocumentClient} dynamoDBDocClient - an AWS.DynamoDB.DocumentClient instance to use
 */

/**
 * @typedef {Logging} StageHandling - an object configured with stage handling and logging functionality
 * @property {StageHandlingSettings} stageHandling - an object configured with stage handling settings and functionality to use
 */

/**
 * Stage handling settings are used for configuring and customising stage handling behaviour. The stage handling
 * settings determine how {@linkcode stages.js#resolveStage}, {@linkcode stages.js#toStageQualifiedStreamName},
 * {@linkcode stages.js#extractStageFromQualifiedStreamName}, {@linkcode stages.js#toStageQualifiedResourceName},
 * {@linkcode stages.js#extractStageFromQualifiedStreamName} and other internal functions will behave when invoked.
 *
 * They can also be used to pass any additional custom configuration options and settings that you need through to any
 * custom stage handling functions that you develop and configure via {@linkcode stages.js#configureStageHandling}.
 *
 * @typedef {StageHandlingOptions} StageHandlingSettings
 * @property {Function|undefined} [customToStage] - an optional custom function that accepts: an AWS event; an AWS context;
 * and a context, and somehow extracts a usable stage from the AWS event and/or AWS context.
 * @property {Function|undefined} [convertAliasToStage] - an optional function that accepts: an extracted alias (if any);
 * an AWS event; an AWS context; and a context, and converts the alias into a stage
 * @property {Function|undefined} [injectStageIntoStreamName] - an optional function that accepts: an unqualified stream
 * name; a stage; and a context, and returns a stage-qualified stream name (effectively the reverse function of the
 * extractStageFromStreamName function)
 * @property {Function|undefined} [extractStageFromStreamName] - an optional function that accepts: a stage-qualified
 * stream name; and a context, and extracts a stage from the stream name
 * @property {Function|undefined} [injectStageIntoResourceName] - an optional function that accepts: an unqualified
 * resource name; a stage; and a context, and returns a stage-qualified resource name (effectively the reverse function
 * of the extractStageFromResourceName function)
 * @property {Function|undefined} [extractStageFromResourceName] - an optional function that accepts: a stage-qualified
 * resource name; and a context, and extracts a stage from the resource name
 */

/**
 * Stage handling options are a subset of the full (@linkcode StageHandlingSettings}, which are used to configure ONLY
 * the property (i.e. non-function) stage handling settings and which can be used to pass any additional custom
 * configuration options that you need through to any custom stage handling functions that you develop and configure via
 * {@linkcode stages.js#configureStageHandling}.
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
 * @property {string|undefined} [defaultStage] - an optional default stage to use during stage resolution as the second
 * last resort if all other attempts fail
 */
