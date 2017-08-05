'use strict';

/**
 * @typedef {function(err: *, data: *)} Callback - a standard Node-style callback function
 */

/**
 * @typedef {Object} AWSContext - an AWS context passed to your Lambda handler function
 * @property {uuid} awsRequestId - a unique identifier assigned to the current invocation of your handler function by AWS Lambda
 * @property {function(): number} getRemainingTimeInMillis - gets the remaining time to execute in milliseconds
 */

/**
 * @typedef {function(event: AWSEvent, awsContext: AWSContext, callback: Callback)} AwsLambdaHandlerFunction - a handler
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
 * @property {AWSEvent|undefined} [event] - the AWS event passed to your Lambda function on invocation
 * @property {AWSContext|undefined} [awsContext] - the AWS context passed to your Lambda function on invocation
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
 * @typedef {StageAware} EventAWSContextAndStageAware - an object configured with the AWS event, AWS context and the resolved stage,
 * which implies pre-configured stage handling settings and logging functionality
 * @property {AWSEvent} event - the AWS event passed to your Lambda function on invocation
 * @property {AWSContext} awsContext - the AWS context passed to your Lambda function on invocation
 */

/**
 * @typedef {EventAWSContextAndStageAware} RegionStageAWSContextAware - an object configured with the name of the current AWS region,
 * the AWS context and the resolved stage, which implies pre-configured stage handling settings and logging functionality
 * @property {string} region - the name of the AWS region to use
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
 * @typedef {Logger} StageHandling - an object configured with stage handling and logging functionality
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
 * {@linkcode stages.js#extractStageFromQualifiedStreamName}, {@linkcode stages.js#extractNameAndStageFromQualifiedStreamName},
 * {@linkcode stages.js#toStageQualifiedResourceName}, {@linkcode stages.js#extractStageFromQualifiedResourceName},
 * {@linkcode stages.js#extractNameAndStageFromQualifiedResourceName} and other internal functions will behave when invoked.
 *
 * They can also be used to pass any additional custom configuration options and settings that you need through to any
 * custom stage handling functions that you develop and configure via {@linkcode stages.js#configureStageHandling}.
 *
 * @typedef {StageHandlingOptions} StageHandlingSettings
 * @property {CustomToStage|undefined} [customToStage] - an optional custom to stage function
 * @property {ConvertAliasToStage|undefined} [convertAliasToStage] - an optional function that converts an alias into a stage
 * @property {InjectStageIntoStreamName|undefined} [injectStageIntoStreamName] - an optional function that returns a stage-qualified stream name
 * @property {ExtractStageFromStreamName|undefined} [extractStageFromStreamName] - an optional function that extracts a stage from a stage-qualified stream name
 * @property {ExtractNameAndStageFromStreamName|undefined} [extractNameAndStageFromStreamName] - an optional function that extracts the unqualified name and stage from a stage-qualified stream name
 * @property {InjectStageIntoResourceName|undefined} [injectStageIntoResourceName] - an optional function that returns a stage-qualified resource name
 * @property {ExtractStageFromResourceName|undefined} [extractStageFromResourceName] - an optional function that extracts a stage from a stage-qualified resource name
 * @property {ExtractNameAndStageFromResourceName|undefined} [extractNameAndStageFromResourceName] - an optional function that extracts the unqualified name and stage from a stage-qualified resource name
 */

/**
 * @typedef {function(event: AWSEvent, awsContext: AWSContext, context: StageHandling): (string|undefined)} CustomToStage -
 * a custom function that accepts: an AWS event; an AWS context; and a context, and somehow extracts a usable stage from
 * the AWS event and/or AWS context.
 */

/**
 * @typedef {function(alias: string, event: AWSEvent, awsContext: AWSContext, context: StageHandling): (string|undefined)} ConvertAliasToStage -
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
 * @typedef {function(qualifiedStreamName: string, context: StageHandling):[string,string]} ExtractNameAndStageFromStreamName -
 * a function that accepts: a stage-qualified stream name; and a context, and extracts the unqualified name and stage
 * from the stream name
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

/**
 * @typedef {function(qualifiedResourceName: string, context: StageHandling):[string,string]} ExtractNameAndStageFromResourceName -
 * a function that accepts: a stage-qualified resource name; and a context, and extracts the unqualified name and stage
 * from the resource name
 */

/**
 * ARN resource-related components
 * @typedef {Object} ArnResources
 * @property {string} resourceType - a resource type (for DynamoDB stream eventSourceARN's this contains "table")
 * @property {string} resource - a resource name (for DynamoDB stream eventSourceARN's this is the table name)
 * @property {string} subResourceType - a sub-resource type (for DynamoDB stream eventSourceARN's this contains "stream")
 * @property {string} subResource - a sub-resource name (for DynamoDB stream eventSourceARN's this is the stream timestamp)
 * @property {string} aliasOrVersion - a Lambda alias or version number
 * @property {string[]} others - any other components after a Lambda alias or version number
 */

/**
 * @typedef {Object} AWSEvent - represents an AWS event typically passed to your Lambda handler function
 * @see KinesisEvent
 * @see DynamoDBEvent
 * @see S3Event
 * @see SESEvent
 * @see SNSEvent
 */

/**
 * @typedef {KinesisEvent|DynamoDBEvent|S3Event|SESEvent|SNSEvent} AnyAWSEvent - represents any AWS event (currently supported)
 */

/**
 * @typedef {AWSEvent} StreamEvent - represents an AWS stream event
 * @property {StreamEventRecord[]} Records - the records of the AWS stream event
 * @see KinesisEvent
 * @see DynamoDBEvent
 */

/**
 * @typedef {KinesisEvent|DynamoDBEvent} AnyStreamEvent - represents an AWS Kinesis or DynamoDB stream event

/**
 * @typedef {StreamEvent} KinesisEvent - represents an AWS Kinesis stream event
 * @property {KinesisEventRecord[]} Records - the records of the AWS Kinesis stream event
 */

/**
 * @typedef {StreamEvent} DynamoDBEvent - represents an AWS DynamoDB stream event
 * @property {DynamoDBEventRecord[]} Records - the records of the AWS DynamoDB stream event
 */

/**
 * @typedef {AWSEvent} S3Event - represents an AWS S3 (Simple Storage Service) event
 * @property {S3EventRecord[]} Records - the records of the AWS S3 event
 */

/**
 * @typedef {AWSEvent} SESEvent - represents an AWS SES (Simple Email Service) event
 * @property {SESEventRecord[]} Records - the records of the AWS SES event
 */

/**
 * @typedef {AWSEvent} SNSEvent - represents an AWS SNS (Simple Notification Service) event
 * @property {string} EventSource - the event source of the AWS event record
 * @property {SNSEventRecord[]} Records - the records of the AWS SNS event
 */

/**
 * @typedef {Object} AWSEventRecord - represents an AWS event record
 * @see KinesisEventRecord
 * @see DynamoDBEventRecord
 * @see S3EventRecord
 * @see SESEventRecord
 * @see SNSEventRecord
 */

/**
 * @typedef {KinesisEventRecord|DynamoDBEventRecord|S3EventRecord|SESEventRecord|SNSEventRecord} AnyAWSEventRecord - represents any AWS event record (currently supported)
 */

/**
 * @typedef {AWSEventRecord} StreamEventRecord - represents an AWS stream event record
 * @property {string} eventID - the event ID, which should uniquely identify the record
 * @property {string} eventSource - the event source, which should be either 'aws:kinesis' or 'aws:dynamodb'
 * @property {string} eventSourceARN - the event source ARN (Amazon Resource Number), which identifies the event source stream or table
 * @property {string} eventVersion - the version of the event
 * @property {string} awsRegion - the AWS region in which the event took place
 * @property {string} eventName - the "name" of the event - for Kinesis this will be 'aws:kinesis:record'; for DynamoDB this will be 'INSERT', 'MODIFY' or 'REMOVE'
 * @see KinesisEventRecord
 * @see DynamoDBEventRecord
 */

/**
 * @typedef {StreamEventRecord} KinesisEventRecord - represents an AWS Kinesis stream event record
 * @property {KinesisProperty} kinesis - the kinesis property contains the data and details of the Kinesis event record
 * @property {string} invokeIdentityArn - the invoke identity ARN (Amazon Resource Number)
 * @see KinesisEvent
 */

/**
 * @typedef {Object} KinesisProperty - represents the kinesis property of an AWS Kinesis stream event record
 * @property {string} partitionKey - the partition key of the Kinesis event record
 * @property {string} sequenceNumber - the sequence number of the Kinesis event record
 * @property {string} data - the actual data of a Kinesis event record in base 64 format
 * @property {string} kinesisSchemaVersion - the schema version of the Kinesis event record
 * @property {number} approximateArrivalTimestamp - the approximate arrival timestamp (e.g. 1487258439.42)
 */

/**
 * @typedef {Object} UserRecord - represents a "user record" extracted from an AWS Kinesis stream event record using the `aws-kinesis-agg` module
 * @property {string} partitionKey - the original partition key of this user record, which was used in the Kinesis put record request either sent directly or added to an aggregate record
 * @property {string|undefined} [explicitPartitionKey] - an explicit partition key added by `aws-kinesis-agg` (Note that it can contain the string "undefined" and is omitted or undefined if the Kinesis record is a normal, non-aggregate record)
 * @property {string} sequenceNumber: - the sequence number of the AWS Kinesis stream event record from which this UserRecord was extracted
 * @property {number|undefined} [subSequenceNumber] - the sub-sequence number assigned to this UserRecord by `aws-kinesis-agg` (undefined if the Kinesis record is a normal, non-aggregate record)
 * @property {string} data - the actual data of the message in base 64 format
 */

/**
 * @typedef {StreamEventRecord} DynamoDBEventRecord - represents an AWS DynamoDB stream event record
 * @property {DynamodbProperty} dynamodb - the dynamodb property contains the details of the DynamoDB record that was inserted, modified or removed
 * @see DynamoDBEvent
 */

/**
 * @typedef {Object} DynamodbProperty - represents the dynamodb property of an AWS DynamoDB stream event record
 * @property {Object} Keys - the keys of the DynamoDB record (in DynamoDB attribute type & value format)
 * @property {Object} [NewImage] - the new image of the DynamoDB record (in DynamoDB attribute type & value format)
 * @property {Object} [OldImage] - the old image of the DynamoDB record (in DynamoDB attribute type & value format)
 * @property {string} SequenceNumber - the sequence number of the event
 * @property {string} SizeBytes - the size of the event in bytes
 * @property {string} StreamViewType - the type of stream view, which defines whether NewImage and OldImage should be
 * present or not, and which should be 'KEYS_ONLY', 'NEW_IMAGE', 'OLD_IMAGE' or 'NEW_AND_OLD_IMAGES'
 */

/**
 * @typedef {Object} SimpleDynamodbProperty - represents a converted, simple objects only form of a dynamodb property originally extracted from an AWS DynamoDB stream event record
 * @property {Object} keys - the keys of the DynamoDB record (in simple object format)
 * @property {Object} [newImage] - the new image of the DynamoDB record (in simple object format)
 * @property {Object} [oldImage] - the old image of the DynamoDB record (in simple object format)
 * @property {string} SequenceNumber - the sequence number of the event
 * @property {string} SizeBytes - the size of the event in bytes
 * @property {string} StreamViewType - the type of stream view, which defines whether newImage and oldImage should be
 * present or not, and which should be 'KEYS_ONLY', 'NEW_IMAGE', 'OLD_IMAGE' or 'NEW_AND_OLD_IMAGES'
 */

/**
 * @typedef {KinesisEventRecord|DynamoDBEventRecord} AnyStreamEventRecord - represents any AWS stream event record (currently supported)
 */

/**
 * @typedef {AWSEventRecord} S3EventRecord - represents an AWS S3 event record
 * @property {string} eventSource - the event source of the AWS S3 event record
 * @see S3Event
 */

/**
 * @typedef {AWSEventRecord} SESEventRecord - represents an AWS SES event record
 * @property {string} eventSource - the event source of the AWS SES event record
 * @see SESEvent
 */

/**
 * @typedef {AWSEventRecord} SNSEventRecord - represents an AWS SNS event record
 * @property {string} EventSource - the event source of the AWS SNS event record
 * @see SNSEvent
 */

/**
 * @typedef {Object} DynamoDBUtilsDefaults - Defaults used by the dynamodb-utils module, which can be overridden to
 * alter the default behaviour
 * @property {string} emptyStringReplacement - a non-empty string to use as a replacement for empty strings, which
 * cannot be stored to DynamoDB (defaults to ' ', i.e. a single space)
 */

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
// AWS.KMS
// ---------------------------------------------------------------------------------------------------------------------

/**
 * @typedef {Object} KMSAware - a object configured with an AWS.KMS instance
 * @property {AWS.KMS} kms - an instance of AWS.KMS to use
 */

/**
 * @typedef {Object} KMSEncryptParams - the parameters to pass to an AWS.KMS `encrypt` call
 * @property {string} KeyId - the identifier of the CMK to use for encryption. You can use the key ID or Amazon Resource Name (ARN) of the CMK, or the name or ARN of an alias that refers to the CMK.
 * @property {string|Buffer} Plaintext - the data to encrypt (plaintext)
 * @property {Object.<string, string>|undefined} [EncryptionContext] - name-value pair that specifies the encryption context to be used for authenticated encryption. If used here, the same value must be supplied to the Decrypt API or decryption will fail. For more information, see http://docs.aws.amazon.com/kms/latest/developerguide/encryption-context.html.
 * @property {string[]|undefined} [GrantTokens] - A list of grant tokens. For more information, see Grant Tokens in the AWS Key Management Service Developer Guide (http://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#grant_token)
 */

/**
 * @typedef {Object} KMSEncryptResult - a KMS encrypt result
 * @property {string|Buffer|TypedArray|Blob} CiphertextBlob - the encrypted plaintext (ciphertext). If you are using the CLI, the value is Base64 encoded. Otherwise, it is not encoded.
 * @property {string} KeyId - the ARN of the CMK that was used to encrypt the data, e.g. "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab"
 */

/**
 * @typedef {Object} KMSDecryptParams - the parameters to pass to an AWS.KMS `decrypt` call
 * @property {string|Buffer|TypedArray|Blob} CiphertextBlob - the ciphertext to be decrypted. The blob includes metadata.
 * @property {Object.<string, string>|undefined} [EncryptionContext] - the encryption context. If this was specified in the Encrypt function, it must be specified here or the decryption operation will fail
 * @property {string[]|undefined} [GrantTokens] - A list of grant tokens
 */

/**
 * @typedef {Object} KMSDecryptResult - a KMS decrypt result
 * @property {string|Buffer|TypedArray|Blob} Plaintext - decrypted plaintext data. This value may not be returned if the customer master key is not available or if you didn't have permission to use it.
 * @property {string} KeyId - the ARN of the key used to perform the decryption. This value is returned if no errors are encountered during the operation.
 */

// ---------------------------------------------------------------------------------------------------------------------
// AWS.Lambda
// ---------------------------------------------------------------------------------------------------------------------

/**
 * @typedef {AWS.Lambda} AwsLambda - an AWS.Lambda instance with optional extra async versions of its methods that return promises instead of taking callbacks
 * @property {function(params: ListEventSourceMappingsParams): Promise.<EventSourceMapping[]>} [listEventSourceMappingsAsync] - an async version of its `listEventSourceMappings` method
 * @property {function(params: UpdateEventSourceMappingParams): Promise.<*>} [updateEventSourceMappingAsync] - an async version of its `updateEventSourceMapping` method
 */

/**
 * @typedef {Object} LambdaAware - a object configured with an AWS.Lambda instance
 * @property {AWS.Lambda|AwsLambda} lambda - an instance of AWS.Lambda to use
 */

/**
 * @typedef {"Creating"|"Enabled"|"Disabled"|"Enabling"|"Disabling"|"Updating"|"Deleting"} EventSourceMappingState
 */

/**
 * @typedef {Object} EventSourceMapping - an event source mapping
 * @property {string} UUID
 * @property {string} BatchSize
 * @property {string} EventSourceArn
 * @property {string} FunctionArn
 * @property {string} LastModified
 * @property {string} LastProcessingResult
 * @property {EventSourceMappingState} State
 * @property {string} StateTransitionReason
 */

/**
 * @typedef {Object} ListEventSourceMappingsParams
 * @property {string} FunctionName
 * @property {string|undefined} [EventSourceArn]
 * @property {string|undefined} [Marker]
 * @property {number|undefined} [MaxItems]
 */

/**
 * @typedef {Object} UpdateEventSourceMappingParams
 * @property {string} FunctionName - the Lambda function to which you want the stream records sent
 * @property {string} UUID - the event source mapping identifier
 * @property {boolean|undefined} [Enabled]
 * @property {number|undefined} [BatchSize]
 */

/**
 * @typedef {StandardContext} ListEventSourceMappingsResult - the result returned by a call to AWS.Lambda listEventSourceMappings
 * @property {string} NextMarker
 * @property {EventSourceMapping[]} EventSourceMappings
 */