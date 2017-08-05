## Changes

### 6.1.0
- Changes to `type-defs` module:
  - Added `event` property to `StandardContext` type definition
  - Renamed `StageAndAWSContextAware` type definition to `EventAWSContextAndStageAware`
  - Added `event` property to `EventAWSContextAndStageAware` type definition
  - Added `AWS.Lambda` related type definitions
  - Added `AWS.KMS` related type definitions
- Changes to `stages` module:
  - Deprecated `configureStageAndAwsContext` function
  - Changed `configureStageAndAwsContext` & `configureRegionStageAndAwsContext` functions to also set `context.event`
- Changes to `contexts` module:
  - Added `configureEventAwsContextAndStage` function
  - Changed `configureStandardContext` function to use `configureEventAwsContextAndStage` instead of deprecated 
    `stages.configureStageAndAwsContext` function
- Changes to `regions` module:
  - Added `regionKeysByRegion` cache
  - Added `getRegionKey` function
- Changes to `dynamodb-doc-client-cache` module:
  - Removed `regionKeysByRegion` cache & `getRegionKey` function & replaced usage with `regions/getRegionKey`
- Changes to `kinesis-cache` module:
  - Removed `regionKeysByRegion` cache & `getRegionKey` function & replaced usage with `regions/getRegionKey`
- Added new `lambda-cache` module
- Added new `lambda-utils` module
- Added new `kms-cache` module
- Added new `kms-utils` module

### 6.0.14
- Updated `core-functions` dependency to version 3.0.9
- Updated `logging-utils` dependency to version 4.0.9

### 6.0.13
- Changes to `dynamodb-doc-client-utils` module:
  - Added new `updateProjectionExpression`, `updateExpressionAttributeNames` & `updateExpressionAttributeValues` functions
  - Changed `getItem` function to throw a TypeError if no result or non-object result is returned
- Moved test devDependencies to package.json & removed test/package.json
- Upgraded `aws-core-test-utils` test dependency to 2.0.9
- Updated `core-functions` dependency to version 3.0.7
- Updated `logging-utils` dependency to version 4.0.7

### 6.0.12
- Changes to `api-lambdas` module:
  - Renamed `initContext`, `initSettings` & `initOptions` parameters of `generateHandler` function to `generateContext`, 
    `generateSettings` & `generateOptions` respectively
  - Changed `generateHandler` function to accept `generateContext`, `generateSettings` & `generateOptions` arguments 
    as functions that can be used to generate non-shared objects, in addition to still providing legacy support for them 
    being passed as shared, module-scoped objects that must be copied to be safely used
- Upgraded `logging-utils` dependency to 4.0.6
- Upgraded `aws-sdk` dev dependency to 2.54.0 to match current AWS Lambda runtime version
- Upgraded `aws-core-test-utils` test dependency to 2.0.8

### 6.0.11
- Upgraded `aws-core-test-utils` test dependency to 2.0.7
- Upgraded `uuid` test dependency to 3.1.0

### 6.0.10
- Changes to `type-defs` module - added more detail to type definitions:
  - Renamed `DynamoDBGetOpts` type definition to `DynamoGetOpts`
  - Renamed `DynamoDBQueryOpts` type definition to `DynamoQueryOpts` & added key `K` template 
  - Renamed `DynamoDBGetResult` type definition to `DynamoGetResult`
  - Renamed `DynamoDBQueryResult` type definition to `DynamoQueryResult` & added extra key `K` template
  - Added new `DynamoBatchGetResult` type definition with item `I` & key `K` templates
  - Added new `DynamoScanResult` type definition with item `I` & key `K` templates
  - Added new `UnprocessedKeysMap` & `CapacityUnitsMap` type definitions
  - Added details & properties to `ConsumedCapacity` type definition
- Upgraded `aws-core-test-utils` test dependency to 2.0.6
- Updated `core-functions` dependency to version 3.0.6
- Updated `logging-utils` dependency to version 4.0.5

### 6.0.9
- Upgraded `aws-core-test-utils` test dependency to 2.0.5
- Updated `core-functions` dependency to version 3.0.5
- Updated `logging-utils` dependency to version 4.0.4

### 6.0.8
- Upgraded `aws-core-test-utils` test dependency to 2.0.4

### 6.0.7
- Upgraded `aws-core-test-utils` test dependency to 2.0.3

### 6.0.6
- Upgraded `aws-core-test-utils` test dependency to 2.0.2

### 6.0.5
- Upgraded `aws-core-test-utils` test dependency to 2.0.1

### 6.0.4
- Added new `dynamodb-doc-client-utils` module
- Changes to `type-defs` module (to sync with `get` method of DynamoDB.DocumentClient rather than `getItem` method):
   - Renamed `DynamoDBGetItemOpts` to `DynamoDBGetOpts` type definition
   - Renamed `DynamoDBGetItemResult` to `DynamoDBGetResult` type definition

### 6.0.3
- Changes to `regions` module:
  - Changed `getRegion` function to treat "undefined" or "null" regions as undefined 
  - Added `setRegion` function
  - Changed `setRegionIfNotSet` function to use `setRegion`
  - Deprecated `setRegionIfNotSet` function
  - Changed `configureRegion` function to fallback to using `console.log` if `context.info` is not configured yet 
- Changes to `stages` module:
  - Added `configureStageAndAwsContext` convenience function to configure resolved stage and AWS context on the given context
  - Deprecated old `configureRegionStageAndAwsContext` convenience function
- Changes to `contexts` module:
  - Changed `configureStandardContext` function to invoke `regions.configureRegion` as early in the function as possible
    & to invoke `stages.configureStageAndAwsContext` instead of `stages.configureRegionStageAndAwsContext`
- Changes to `type-defs` module:
   - Added `StageAndAWSContextAware` type definition
   - Added `DynamoDBGetItemOpts`, `DynamoDBGetItemResult`, `DynamoDBQueryOpts`, `DynamoDBQueryResult` & `ConsumedCapacity` type definitions

### 6.0.2
- Upgraded to Node 6.10.3
- Updated `core-functions` dependency to version 3.0.4
- Updated `logging-utils` dependency to version 4.0.3
- Upgraded `aws-sdk` dev dependency to version 2.45.0
- Changes to `dynamodb-doc-client-cache` module: 
  - Changed `setDynamoDBDocClient` to create & cache each new DynamoDB.DocumentClient instance with a COPY of the options
    while still caching the ORIGINAL options to avoid subsequent cache comparison failures related to AWS SDK 2.45.0 
    mutating the options passed to the constructor, e.g. by adding "attrValue" with value "S8"

### 6.0.1
- Updated `core-functions` dependency to version 3.0.2
- Updated `logging-utils` dependency to version 4.0.1
- Patches to `test/samples.js`:
  - Fixed potential shared global regular expression issues in `sampleAwsContext` function
- Changes to `aws-errors` module:
  - Added `isResourceNotFoundException` function
- Changes to `dynamodb-utils` module:
  - Added `simplifyKeysNewImageAndOldImage` function

### 6.0.0
- Updated `core-functions` dependency to version 3.0.0
- Updated `logging-utils` dependency to version 4.0.0
- Changes to `api-lambdas.js` module:
  - Removed `log` function (replaced use with new `log` function & `log` method in `logging-utils`)
- Changes to `arns.js` module:
  - Moved `ArnResources` typedef to `type-defs.js`
- Changes to `aws-errors.js` module:
  - Added `isItemCollectionSizeLimitExceededException` function
  - Added `isLimitExceeded` function
  - Removed limit exceeded cases from `isThrottled` function (not backward-compatible)
  - Added S3 `SlowDown` case to `isThrottled` function
  - Added `isLimitExceeded` & `err.retryable` checks to `isRetryable` function
- Changes to `dynamodb-utils.js` module:
  - Removed `toNumber` function (replaced use with new `toNumberOrIntegerLike` function in `core-functions/numbers.js`)
  - Added new `toStorableObject` function
  - Added new `defaults` static property with `emptyStringReplacement` property
- Changes to `stages.js` module:
  - Replaced all setting names constants (e.g. CUSTOM_TO_STAGE_SETTING) with use of a new module-scope `settingNames` 
    object property that holds all the standard stage handling settings names (e.g. settingNames.customToStage) 
  - Added new `extractNameAndStageFromStreamName` & `extractNameAndStageFromResourceName` settings
  - Added `extractNameAndStageFromQualifiedStreamName` & `extractNameAndStageFromQualifiedResourceName` functions
  - Added `extractNameAndStageFromSuffixedStreamName` & `extractNameAndStageFromSuffixedResourceName` functions
  - Added `_extractNameAndStageFromQualifiedName` & `_extractNameAndStageFromSuffixedName` functions
  - Changed `extractStageFromQualifiedStreamName` to attempt fallback with `_extractNameAndStageFromQualifiedName`
  - Changed `extractStageFromQualifiedResourceName` to attempt fallback with `_extractNameAndStageFromQualifiedName`
- Changes to `stream-events.js` module:
  - Added `MAX_PARTITION_KEY_SIZE` constant
  - Added `DynamoDBEventName` enum
  - Added `getEventID`, `getEventName`, `getEventSource` & `getEventSourceARN` functions
  - Added `getKinesisShardId`, `getKinesisShardIdFromEventID`, `getKinesisShardIdAndEventNoFromEventID` & `getKinesisSequenceNumber` functions
  - Added `getDynamoDBSequenceNumber` function
  - Added additional validation checks to `validateStreamEventRecord`, `validateKinesisStreamEventRecord` & `validateDynamoDBStreamEventRecord` functions
- Added many new typedefs to `type-defs.js`

### 5.0.17
- Fixed critical module-scope defects in `generateHandlerFunction` function in `api-lambdas` module
- Changes to `dynamodb-utils` module:
  - Changed `toNumber` function to return the given string if a large integer number's precision cannot be preserved 
  - Added `toKeyValuePairs` function
- Updated `core-functions` dependency to version 2.0.14
- Updated `logging-utils` dependency to version 3.0.12

### 5.0.16
- Added missing `context` as first argument to `generateHandlerFunction` function of `api-lambdas.js` module

### 5.0.15
- Fixed missing require `core-functions/promises` issue in `api-lambdas.js` module

### 5.0.14
- Fixed defect in `generateHandlerFunction` function of `api-lambdas.js` module

### 5.0.13
- Added new `generateHandlerFunction` function to `api-lambdas.js` module
- More improvements to typedefs in `type-defs.js` module
- Updated `core-functions` dependency to version 2.0.12
- Updated `logging-utils` dependency to version 3.0.10

### 5.0.12
- Updated `logging-utils` dependency to version 3.0.9

### 5.0.11
- Changes to `type-defs.js` module:
  - Added `StandardContext`, `StandardSettings`, `StandardOptions`, `CustomAware`, `CustomSettings`, `CustomOptions`
    and `RegionStageAWSContextAware`
- Added new `contexts.js` module with `configureStandardContext` and `configureCustomSettings` functions
- Added new `api-lambdas.js` module with `failCallback` (and synonym `failCallbackForApiGateway`) functions and 
  re-exported `configureStandardContext` function from `contexts.js` to simplify imports for API Gateway exposed Lambdas
- Changes to `lambdas.js` module:
  - Moved `failCallbackForApiGateway` function to new `api-lambdas.js` module
- Changes to `stages.js` module:
  - Added new `configureRegionStageAndAwsContext` convenience function to configure current region, resolved stage and
    AWS context on the given context
  - Improved JsDoc type definitions on all of the configuration functions
- Added and improved existing examples in README.md

### 5.0.10
- Fixed broken unit tests by changing incorrect imports of `node-uuid` to `uuid`
- Added new `RegionAware`, `KinesisAware` and `DynamoDBDocClientAware` typedefs to `type-defs.js` module
- Changes to `regions.js` module:
  - Changed the `context` argument and return type of `configureRegion` function to use new `RegionAware` typedef
- Changes to `kinesis-cache.js` module:
  - Changed the `context` argument and return types of `configureKinesis` function to use new `KinesisAware` typedef
- Changes to `dynamodb-doc-client-cache.js` module:
  - Changed the `context` argument and return type of `configureDynamoDBDocClient` function to use new 
    `DynamoDBDocClientAware` typedef

### 5.0.9
- Updated `logging-utils` dependency to version 3.0.8
- Renamed `stages-defs.js` module to `type-defs.js` to synchronize with other modules

### 5.0.8
- Renamed `stage-handling-type-defs.js` module to `stages-type-defs.js`

### 5.0.7
- Added `stage-handling-type-defs.js` module to hold all of the stage handling related typedefs
  - Added `StageHandlingOptions` and `StageHandlingSettings` typedefs from `stages.js`
  - Added new `StageHandling` and `StageAware` typedefs 
- Changes to `stages.js` module:
  - Removed `StageHandlingOptions` and `StageHandlingSettings` typedefs
  - Changed the argument and return types on many of the functions to use the existing and new typedefs
- Updated `logging-utils` dependency to version 3.0.7

### 5.0.6
- Updated `core-functions` dependency to version 2.0.11
- Updated `logging-utils` dependency to version 3.0.6
- Replaced `node-uuid` dependency with `uuid` dependency in `test\package.json`

### 5.0.5
- Changes to `stream-events` module:
  - Added new `getEventSources` function
  - Added new `getDynamoDBEventSourceTableNames` function
- Changes to `stages` module:
  - Changed `resolveStage` function to resolve the event's eventSource and when its DynamoDB to use the table names 
    of the DynamoDB stream event as a stage source, instead of always assuming the event is a Kinesis stream event
    and only using the stream names of the Kinesis stream event as a stage source
- Updated `core-functions` dependency to version 2.0.10
- Updated `logging-utils` dependency to version 3.0.5

### 5.0.4
- Updated `core-functions` dependency to version 2.0.9
- Updated `logging-utils` dependency to version 3.0.3

### 5.0.3
- Updated `core-functions` dependency to version 2.0.8
- Updated `logging-utils` dependency to version 3.0.2

### 5.0.2
- Changes to `stages.js` module:
  - Moved export of `configureStageHandlingWithSettings` to `FOR_TESTING_ONLY`
  - Added missing notes on changes for Release 5.0.1 to `README.md`
  
### 5.0.1
- Changes to `stages.js` module:
  - Changed `configureStageHandling` function to use `core-functions/objects` module's `copy` and 
    `merge` functions to ensure that any and all given custom settings and options are not lost
  - Changed `getDefaultStageHandlingSettings` & `loadDefaultStageHandlingOptions` functions to use
    `core-functions/objects` module's `copy` and `merge` functions to ensure that any and all given 
    custom options are not lost
- Changes to `kinesis-cache.js` module:
  - Changed `setKinesis` to only modify a copy of the given kinesisOptions to avoid side-effects
- Changes to `dynamodb-doc-client-cache.js` module:
  - Changed `setDynamoDBDocClient` to only modify a copy of the given dynamoDBDocClientOptions to avoid side-effects
- Updated `core-functions` dependency to version 2.0.7
- Updated `tape` dependency to 4.6.3

### 5.0.0
- Changes to `arns.js` module:
  - Changed `getArnResources` function to support DynamoDB eventSourceARNs
- Changes to `stream-events.js` module:
  - Renamed `getEventSourceStreamNames` function to `getKinesisEventSourceStreamNames`
  - Renamed `getEventSourceStreamName` function to `getKinesisEventSourceStreamName`
  - Added new `getDynamoDBEventSourceTableName` function
  - Added new `getDynamoDBEventSourceTableNameAndStreamTimestamp` function
- Changes to `stages.js` module:
  - Renamed `configureStageHandling` function to `configureStageHandlingWithSettings`
  - Renamed `configureStageHandlingAndDependencies` function to `configureStageHandling`
  - Removed `configureDependenciesIfNotConfigured` function
  - Removed `configureDefaultStageHandlingIfNotConfigured` function
  - Removed `configureStageHandlingIfNotConfigured` function
- Renamed `config.json` to `stages-options.json`  
- Updated `core-functions` dependency to version 2.0.5
- Updated `logging-utils` dependency to version 3.0.0

### 4.0.0
- Renamed `kinesis-utils` module to `kinesis-cache` to better reflect its actual purpose
- Renamed `dynamodb-doc-clients` module to `dynamodb-doc-client-cache` to better reflect its actual purpose
- Added new `dynamodb-utils` module
- Changes to `stages.js` module:
  - Added new `configureStageHandlingAndDependencies` function to enable configuration of stage handling settings and 
    all stage handling dependencies (currently just logging) at the same time
  - Added new `configureDependencies` function, which is used by the new `configureStageHandlingAndDependencies` function
  - Added new `envStageName` setting to enable configuration of the name of the `process.env` environment variable to be 
    checked for a stage value during execution of the `resolveStage` or `configureStage` functions
  - Changed `resolveStage` function to first attempt to resolve a stage from a named `process.env` environment variable 
    (if available), which must be configured using AWS Lambda's new environment support

### 3.0.2
- Changes to `stages.js` module:
  - Added `configureDependenciesIfNotConfigured` function to configure stage handling dependencies (i.e. only logging for now)
  - Changed `configureStageHandlingIfNotConfigured` function to first invoke new `configureDependenciesIfNotConfigured` function
  - Changed `configureStageHandling` function to accept `otherSettings` and `otherOptions` as 3rd & 4th arguments to 
    enable configuration of dependencies and to first invoke invoke new `configureDependenciesIfNotConfigured` function
  - Changed `configureDefaultStageHandling` function to accept `otherSettings` and `otherOptions` as 3rd & 4th arguments 
    to enable configuration of dependencies and to always invoke `configureStageHandling`

### 3.0.1
- Changes to `stages.js` module:
  - Added a convenience `configureStageHandlingIfNotConfigured` function
  - Changed `configureDefaultStageHandlingIfNotConfigured` function to use new `configureStageHandlingIfNotConfigured` function
- Updated `logging-utils` dependency to version 2.0.3

### 3.0.0
- Changes to `stages.js` module:
  - Added typedef for `StageHandlingOptions` to better define parameters and return types
  - Changed `getDefaultStageHandlingSettings` function to accept an `options` argument of type `StageHandlingOptions` 
    instead of an arbitrary `config` object and to also load default options from `config.json` 
  - Changed `configureDefaultStageHandling` function to accept a new `options` argument of type `StageHandlingOptions` 
    to enable optional, partial overriding of default stage handling settings
  - Changed `stageHandlingSettings` to `stageHandlingOptions` in `config.json`
  - Fixed require `logging-utils` link
- Updated `logging-utils` dependency to version 2.0.1
  
### 2.1.4
- Updated JsDoc comments in `dynamodb-doc-clients` and `kinesis-utils` modules.

### 2.1.3
- Added a new `dynamodb-doc-clients` module to enable creation and configuration of AWS DynamoDB.DocumentClient instances
  and caching of a DynamoDB.DocumentClient instance per region. Note that this new module is an almost exact replica of 
  the `kinesis-utils` module, but for getting, setting and caching DynamoDB.DocumentClient instances instead of Kinesis 
  instances. 
  - Added `setDynamoDBDocClient`, `getDynamoDBDocClient`, `getDynamoDBDocClientOptionsUsed`, `deleteDynamoDBDocClient` 
    and `configureDynamoDBDocClient` functions and unit tests for same.

### 2.1.2
- Updated `core-functions` dependency to version 2.0.3
- Updated `logging-utils` dependency to version 1.0.6

### 2.1.1
- Added `getDefaultStageHandlingSettings` function to get the default stage handling settings

### 2.1.0

- Changes to `stages` module:
  - Changed API of `configureStageHandling` function to accept a setting object instead of the multiple fixed parameters, 
    to simplify configuration of new, custom settings.
  - Minor changes and fixes to code & unit tests to accommodate this change.
- Major overhaul of `kinesis-utils` module to enable full configuration of an AWS Kinesis instance and caching of a Kinesis
  instance per region.
  - Added `setKinesis`, `getKinesis`, `getKinesisOptionsUsed` & `deleteKinesis` functions and unit tests for same.
  - Rewrote and changed API of `configureKinesis` function to use the new `setKinesis` function and patched its unit tests.
- Technically should have been a 3.0.0 release semantically speaking, since I changed the APIs of two existing functions, 
  but it did not seem warranted.

### 2.0.1
- Added new `kinesis-utils` module to provide basic configuration and caching of an AWS.Kinesis instance for Lambda
- Changes to `stream-events` module:
    - Added `validateStreamEventRecord` function to check if a record is either a valid Kinesis or DynamoDB stream event record
    - Added `validateKinesisStreamEventRecord` function to check if a record is a valid Kinesis stream event record 
    - Added `validateDynamoDBStreamEventRecord` function to check if a record is a valid DynamoDB stream event record
    - Added unit tests for new functions
- Minor change to `setRegionIfNotSet` to eliminate unnecessary logging when regions are the same
- Updated `core-functions` dependency to version 2.0.2
- Updated `logging-utils` dependency to version 1.0.5

### 2.0.0
- Major changes to `stages`:
    - Changed existing configuration API from `resolveStage`-specific configuration to general stage handling configuration.
        - Added support for a custom to stage function.
        - Added support for configuration of stream and resource name qualification.
    - Added `configureStage` function.
    - Added configurable `toStageQualifiedStreamName` and default `toStageSuffixedStreamName` functions.
    - Added configurable `extractStageFromQualifiedStreamName` and default `extractStageFromSuffixedStreamName` functions.
    - Added configurable `toStageQualifiedResourceName` and default `toStageSuffixedResourceName` functions.
    - Added configurable `extractStageFromQualifiedResourceName` and default `extractStageFromSuffixedResourceName` functions.
    - Changed and added unit tests for revamped `stages` module.
- Changes to `regions`:
    - Added `configureRegion` function.
    - Added optional, hidden failFast argument to `getRegion` function needed for `configureRegion` function.
- Changes to `aws-errors`:
    - Fixed incorrect usage in comments.
    - Moved exported object's methods bodies to module-level functions.
- Changes to `lambdas`:
    - Added `failCallback` function to fail non-API Gateway Lambda callbacks with standard app errors to facilitate mapping of errors to HTTP status codes
    - Added `failCallbackForApiGateway` function to fail API Gateway Lambda callbacks with standard app errors to facilitate mapping of errors to HTTP status codes
- Added `stream-events` module and unit tests for it.    
- Updated `core-functions` dependency to version 1.2.0.
- Added `logging-utils` 1.0.2 dependency. 

### 1.0.0
- Completed changes needed to release 1.0.0
- Added unit tests for stages.js
- Simplified regions.js API down to relevant methods
- Fixed defects attempting to source awsRegion and eventSourceARN from event instead of Kinesis records within event.
- Patched repository in package.json

### 0.9.0
- Initial commit