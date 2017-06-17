'use strict';

/**
 * @typedef {function(err: *, data: *)} Callback - a standard Node-style callback function
 */

/**
 * @typedef {Object} AwsEvent - an AWS event passed to your Lambda handler function
 */

/**
 * @typedef {Object} AwsContext - an AWS context passed to your Lambda handler function
 * @property {uuid} awsRequestId - a unique identifier assigned to the current invocation of your handler function by AWS Lambda
 * @property {function(): number} getRemainingTimeInMillis - gets the remaining time to execute in milliseconds
 */

/**
 * @typedef {function(event: AwsEvent, awsContext: AwsContext, callback: Callback)} AwsLambdaHandlerFunction - a handler
 * function for your AWS Lambda
 */

/**
 * @typedef {StageHandling} StandardContext - an object configured as a standard context with stage handling, logging,
 * custom settings, an optional Kinesis instance and an optional DynamoDB DocumentClient instance and OPTIONALLY also
 * with the current region, the resolved stage and the AWS context
 * @property {CustomSettings|undefined} custom - an object configured with optional custom settings to use
 * @property {AWS.Kinesis|undefined} [kinesis] - an optional AWS.Kinesis instance to use
 * @property {AWS.DynamoDB.DocumentClient|undefined} [dynamoDBDocClient] - an optional AWS.DynamoDB.DocumentClient instance to use
 * @property {string|undefined} [region] - the name of the AWS region to use
 * @property {string|undefined} [stage] - the configured stage to use
 * @property {AwsContext|undefined} [awsContext] - the AWS context passed to your Lambda function on invocation
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
 * @property {AwsContext} awsContext - the AWS context passed to your Lambda function on invocation
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
 * @property {CustomToStage|undefined} [customToStage] - an optional custom to stage function
 * @property {ConvertAliasToStage|undefined} [convertAliasToStage] - an optional function that converts an alias into a stage
 * @property {InjectStageIntoStreamName|undefined} [injectStageIntoStreamName] - an optional function that returns a stage-qualified stream name
 * @property {ExtractStageFromStreamName|undefined} [extractStageFromStreamName] - an optional function that extracts a stage from a stage-qualified stream name
 * @property {InjectStageIntoResourceName|undefined} [injectStageIntoResourceName] - an optional function that returns a stage-qualified resource name
 * @property {ExtractStageFromResourceName|undefined} [extractStageFromResourceName] - an optional function that extracts a stage from a stage-qualified resource name
 */

/**
 * @typedef {function(event: AwsEvent, awsContext: AwsContext, context: StageHandling): (string|undefined)} CustomToStage -
 * a custom function that accepts: an AWS event; an AWS context; and a context, and somehow extracts a usable stage from
 * the AWS event and/or AWS context.
 */

/**
 * @typedef {function(alias: string, event: AwsEvent, awsContext: AwsContext, context: StageHandling): (string|undefined)} ConvertAliasToStage -
 * a function that accepts: an extracted AWS Lambda alias (if any); an AWS event; an AWS context; and a context, and
 * converts the alias into a stage
 */

/**
 * @typedef {function(unqualifiedStreamName: string, stage: string, context: StageHandling):(string|undefined)} InjectStageIntoStreamName -
 * a function that accepts: an unqualified stream name; a stage; and a context, and returns a stage-qualified stream
 * name (effectively the reverse function of the ExtractStageFromStreamNameFunction)
 */

/**
 * @typedef {function(qualifiedStreamName: string, context: StageHandling):(string|undefined)} ExtractStageFromStreamName -
 * a function that accepts: a stage-qualified stream name; and a context, and extracts a stage from the stream name
 */

/**
 * @typedef {function(unqualifiedResourceName: string, stage: string, context: StageHandling):(string|undefined)} InjectStageIntoResourceName -
 * a function that accepts: an unqualified resource name; a stage; and a context, and returns a stage-qualified resource
 * name (effectively the reverse function of the ExtractStageFromResourceNameFunction)
 */

/**
 * @typedef {function(qualifiedResourceName: string, context: StageHandling):(string|undefined)} ExtractStageFromResourceName -
 * a function that accepts: a stage-qualified resource name; and a context, and extracts a stage from the resource name
 */

// ---------------------------------------------------------------------------------------------------------------------
// Start of BACKPORT copy from latest `aws-core-utils/type-defs`
// ---------------------------------------------------------------------------------------------------------------------

/**
 * @typedef {Object} DynamoGetOpts - a selection of DynamoDB.DocumentClient `get` method param options to use (other than TableName & Key & legacy parameters)
 * @property {boolean|undefined} [ConsistentRead] - whether to do a consistent read to obtain a strongly consistent result or not (NB: GSIs ONLY support eventually consistent reads)
 * @property {string|undefined} [ProjectionExpression] - an optional string that identifies one or more attributes to retrieve from the table
 * @property {Object|undefined} [ExpressionAttributeNames] - optional one or more substitution tokens for attribute names in an expression
 * @property {'NONE'|'INDEXES'|'TOTAL'|undefined} [ReturnConsumedCapacity] - determines the level of detail about provisioned throughput consumption that is returned in the response
 */

/**
 * @typedef {Object} DynamoQueryOpts.<K> - a selection of DynamoDB Query options to use (other than TableName, [IndexName], KeyConditionExpression, ProjectionExpression, FilterExpression, ExpressionAttributeNames, ExpressionAttributeValues & legacy parameters)
 * @property {K|Object|undefined} [ExclusiveStartKey] - the optional exclusive start key from which to continue a previous query
 * @property {number|undefined} [Limit] - the optional number of results to which to limit the query
 * @property {boolean|undefined} [ConsistentRead] - whether to do a consistent read to obtain a strongly consistent result or not (NB: GSIs ONLY support eventually consistent reads)
 * @property {boolean|undefined} [ReturnConsumedCapacity] - whether to return consumed capacity or not
 * @property {boolean|undefined} [ScanIndexForward] - use this to get results in forward or reverse order, by sort key
 * @property {'ALL_ATTRIBUTES'|'ALL_PROJECTED_ATTRIBUTES'|'SPECIFIC_ATTRIBUTES'|'COUNT'|undefined} [Select] - the selected type of result(s) to return
 * @property {string|undefined} [ProjectionExpression] - an optional string that identifies one or more attributes to retrieve from the table
 * @property {string|undefined} [FilterExpression] - an optional string that contains conditions that DynamoDB applies after the Query operation, but before the data is returned
 * @property {Object|undefined} [ExpressionAttributeNames] - optional one or more substitution tokens for attribute names in an expression
 * @property {Object|undefined} [ExpressionAttributeValues] - optional one or more substitution tokens for attribute names in an expression
 * @template K
 */

/**
 * @typedef {Object} DynamoBatchGetResult.<I,K> - a DynamoDB.DocumentClient `batchGet` result (or DynamoDB `batchGetItem` result)
 * @property {Object.<string, Array.<I|Object>>} Responses - a map of table name to a list of items
 * @property {UnprocessedKeysMap.<K>|undefined} [UnprocessedKeys] - a map of tables and their respective keys that were not processed with the current response (map<Array<map>>)
 * @property {Array.<ConsumedCapacity>|undefined} [ConsumedCapacity] - The read capacity units consumed by the entire operation
 * @template I,K
 */

/**
 * @typedef {Object} DynamoGetResult.<I> - a DynamoDB.DocumentClient `get` result (or DynamoDB `getItem` result)
 * @property {I|Object|undefined} [Item] - the returned item (if found) or undefined (if not)
 * @property {ConsumedCapacity|undefined} [ConsumedCapacity] - the capacity units consumed by the get operation (if requested)
 * @template I
 */

/**
 * @typedef {Object} DynamoQueryResult.<I,K> - a DynamoDB.DocumentClient `query` result (or DynamoDB `query` result)
 * @property {Array.<I|Object>} Items - the returned items
 * @property {number} Count - the number of items returned
 * @property {number} ScannedCount - the number of items scanned before applying any filter
 * @property {K|Object|undefined} [LastEvaluatedKey] - the last evaluated key (if any) to be used to get next "page"
 * @property {ConsumedCapacity|undefined} [ConsumedCapacity] - the capacity units consumed by the query operation (if requested)
 * @template I,K
 */

/**
 * @typedef {Object} DynamoScanResult.<I,K> - a DynamoDB.DocumentClient `scan` result (or DynamoDB `scan` result)
 * @property {Array.<I|Object>} Items - the returned items
 * @property {number} Count - the number of items returned
 * @property {number} ScannedCount - the number of items scanned before applying any filter
 * @property {K|Object|undefined} [LastEvaluatedKey] - the last evaluated key (if any) to be used to get next "page"
 * @property {ConsumedCapacity|undefined} [ConsumedCapacity] - the capacity units consumed by the query operation (if requested)
 * @template I,K
 */

/**
 * @typedef {Object} UnprocessedKeysMap.<K> - A map of tables and their respective keys that were not processed with the current response. The UnprocessedKeys value is in the same form as RequestItems, so the value can be provided directly to a subsequent BatchGetItem operation.
 * @property {Array.<K|Object>} Keys - An array of primary key attribute values that define specific items in the table
 * @property {string|undefined} [ProjectionExpression] - One or more attributes to be retrieved from the table or index. By default, all attributes are returned. If a requested attribute is not found, it does not appear in the result.
 * @property {boolean|undefined} [ConsistentRead] - The consistency of a read operation. If set to true, then a strongly consistent read is used; otherwise, an eventually consistent read is used.
 * @property {Object.<string, string>|undefined} [ExpressionAttributeNames] - One or more substitution tokens for attribute names in an expression.
 * @template K
 */

/**
 * @typedef {Object} ConsumedCapacity - the capacity units consumed by an operation
 * @property {string} TableName
 * @property {number} CapacityUnits
 * @property {CapacityUnitsMap} Table
 * @property {Object.<string, CapacityUnitsMap>} LocalSecondaryIndexes
 * @property {Object.<string, CapacityUnitsMap>} GlobalSecondaryIndexes
 */

/**
 * @typedef {Object} CapacityUnitsMap
 * @property {number} CapacityUnits
 */

// ---------------------------------------------------------------------------------------------------------------------
// End of BACKPORT copy from latest `aws-core-utils/type-defs`
// ---------------------------------------------------------------------------------------------------------------------
