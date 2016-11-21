# aws-core-utils v3.0.2

Core utilities for working with Amazon Web Services (AWS), including ARNs, regions, stages, Lambdas, AWS errors, stream events, Kinesis, DynamoDB.DocumentClients, etc.

Currently includes:
- arns.js 
    - Utilities for working with Amazon Resource Names (ARNs)
- aws-errors.js
    - Utilities for working with AWS errors.
- dynamodb-doc-clients.js
    - Utilities for working with AWS.DynamoDB.DocumentClients and a module-scope cache of AWS.DynamoDB.DocumentClient instances by region for Lambda.
- kinesis-utils.js
    - Utilities for working with AWS.Kinesis and a module-scope cache of AWS.Kinesis instances by region for Lambda.
- lambdas.js 
    - Utilities for working with AWS Lambda, which enable extraction of function names, versions and, most importantly, 
    aliases from AWS contexts and their invoked function ARNs.
- regions.js 
    - Utilities for resolving the AWS region from various sources (primarily for AWS Lambda usage).
- stages.js
    - Utilities for resolving or deriving the current stage (e.g. dev, qa, prod) from various sources (primarily for 
    AWS Lambda usage).
    - Utilities for configuration of stage handling.
    - Configurable and default functions for generating stage-qualified stream and resource names.
    - Configurable and default functions for extracting stages from stage-qualified stream and resource names.
- stream-events.js
    - Utilities for extracting information from AWS Kinesis and AWS DynamoDB stream events.

This module is exported as a [Node.js](https://nodejs.org/) module.

## Installation

Using npm:
```bash
$ {sudo -H} npm i -g npm
$ npm i --save aws-core-utils
```

In Node.js:
* To use the AWS ARN utilities
```js
const arns = require('aws-core-utils/arns');

const arnComponent = arns.getArnComponent(arn, index);
const arnPartition = arns.getArnPartition(arn);
const arnService = arns.getArnService(arn);
const arnRegion = arns.getArnRegion(arn);
const arnAccountId = arns.getArnAccountId(arn);
const arnResources = arns.getArnResources(arn);
```

* To use the AWS errors utilities 
```js
const awsErrors = require('aws-core-utils/aws-errors');
```

* To get the current AWS region & configure it on a context
```js
const regions = require('aws-core-utils/regions');

// To get the current AWS region
const region = regions.getRegion();

// To configure a context with the current AWS region
regions.configureRegion(context, failFast)
```

* To use the DynamoDB.DocumentClient utilities to cache and configure an AWS DynamoDB.DocumentClient instance per region
```js
const dynamoDBDocClients = require('aws-core-utils/dynamodb-doc-clients');

// Preamble to create a context and configure logging on the context
const context = {};
const logging = require('logging-utils');
logging.configureDefaultLogging(context); // or your own custom logging configuration (see logging-utils README.md)

// Define the DynamoDB.DocumentClient's constructor options that you want to use, e.g.
const dynamoDBDocClientOptions = {
  // See http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#constructor-property
  // and http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#constructor-property
  maxRetries: 0
  // ...
};

// To create and cache a new AWS DynamoDB.DocumentClient instance with the given DynamoDB.DocumentClient constructor 
// options for either the current region or the region specified in the given options OR reuse a previously cached 
// DynamoDB.DocumentClient instance (if any) that is compatible with the given options
const dynamoDBDocClient = dynamoDBDocClients.setDynamoDBDocClient(dynamoDBDocClientOptions, context);

// To configure a new AWS.DynamoDB.DocumentClient instance (or re-use a cached instance) on a context 
dynamoDBDocClients.configureDynamoDBDocClient(context, dynamoDBDocClientOptions);
console.log(context.dynamoDBDocClient);

// To get a previously set or configured AWS DynamoDB.DocumentClient instance for the current AWS region
const dynamoDBDocClient1 = dynamoDBDocClients.getDynamoDBDocClient();
// ... or for a specified region
const dynamoDBDocClient2 = dynamoDBDocClients.getDynamoDBDocClient('us-west-2');

// To get the original options that were used to construct a cached AWS DynamoDB.DocumentClient instance for the current or specified AWS region
const optionsUsed1 = dynamoDBDocClients.getDynamoDBDocClientOptionsUsed();
const optionsUsed2 = dynamoDBDocClients.getDynamoDBDocClientOptionsUsed('us-west-1');

// To delete and remove a cached DynamoDB.DocumentClient instance from the cache
const deleted = dynamoDBDocClients.deleteDynamoDBDocClient('eu-west-1');
```

* To use the Kinesis utilities to cache and configure an AWS Kinesis instance per region
```js
const kinesisUtils = require('aws-core-utils/kinesis-utils');

// Preamble to create a context and configure logging on the context
const context = {};
const logging = require('logging-utils');
logging.configureDefaultLogging(context); // or your own custom logging configuration (see logging-utils README.md)

// Define the Kinesis constructor options that you want to use, e.g.
const kinesisOptions = {
  // See http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Kinesis.html#constructor-property for full details
  maxRetries: 0
  // ...
};

// To create and cache a new AWS Kinesis instance with the given Kinesis constructor options for either the current 
// region or the region specified in the given options OR reuse a previously cached Kinesis instance (if any) that is 
// compatible with the given options
const kinesis = kinesisUtils.setKinesis(kinesisOptions, context);

// To configure a new AWS.Kinesis instance (or re-use a cached instance) on a context 
kinesisUtils.configureKinesis(context, kinesisOptions);
console.log(context.kinesis);

// To get a previously set or configured AWS Kinesis instance for the current AWS region
const kinesis1 = kinesisUtils.getKinesis();
// ... or for a specified region
const kinesis2 = kinesisUtils.getKinesis('us-west-2');

// To get the original options that were used to construct a cached AWS Kinesis instance for the current or specified AWS region
const optionsUsed1 = kinesisUtils.getKinesisOptionsUsed();
const optionsUsed2 = kinesisUtils.getKinesisOptionsUsed('us-west-1');

// To delete and remove a cached Kinesis instance from the cache
const deleted = kinesisUtils.deleteKinesis('eu-west-1');
```

* To use the Lambda utilities
```js
const lambdas = require('aws-core-utils/lambdas');

// Fail a Lambda's callback with a standard error and preserve HTTP status codes (for non-API Gateway Lambdas) 
// See core-functions/app-errors.js for standard errors to use
lambdas.failCallback(lambdaCallback, error, awsContext, message, code);

// Fail an API Gateway-exposed Lambda's callback with a standard error and preserve HTTP status codes
lambdas.failCallbackForApiGateway(lambdaCallback, error, awsContext, message, code, allowedHttpStatusCodes);

// To resolve the Lambda alias from an AWS Lambda context
const alias = lambdas.getAlias(awsContext);

// To extract other details from an AWS Lambda context
const functionName = lambdas.getFunctionName(awsContext);
const functionVersion = lambdas.getFunctionVersion(awsContext);
const functionNameVersionAndAlias = lambdas.getFunctionNameVersionAndAlias(awsContext);
const invokedFunctionArn = lambdas.getInvokedFunctionArn(awsContext);
const invokedFunctionArnFunctionName = lambdas.getInvokedFunctionArnFunctionName(awsContext);
```

* To use the stage utilities
```js
// To configure stage-handling, which determines the behaviour of the functions numbered 1 to 6 below
const stages = require('aws-core-utils/stages');
const settings = undefined; // ... or your own custom settings
const options = require('./config.json'); // ... or your own custom options

// ... EITHER using the default stage handling configuration partially customised via config.stageHandlingOptions
stages.configureDefaultStageHandling(context, options.stageHandlingOptions, settings, options, forceConfiguration); 

// ... OR using your own custom stage-handling configuration
const stageHandlingSettings = stages.getDefaultStageHandlingSettings(options.stageHandlingOptions);
// Optionally override the default stage handling functions with your own custom functions
// stageHandlingSettings.customToStage = undefined;
// stageHandlingSettings.convertAliasToStage = stages.DEFAULTS.convertAliasToStage;
// stageHandlingSettings.injectStageIntoStreamName = stages.DEFAULTS.toStageSuffixedStreamName;
// stageHandlingSettings.extractStageFromStreamName = stages.DEFAULTS.extractStageFromSuffixedStreamName;
// stageHandlingSettings.injectStageIntoResourceName = stages.DEFAULTS.toStageSuffixedResourceName;
// stageHandlingSettings.extractStageFromResourceName = stages.DEFAULTS.extractStageFromSuffixedResourceName;
stages.configureStageHandling(context, stageHandlingSettings, settings, options, forceConfiguration);

// ... OR using completely customised stage handling settings
const stageHandlingSettings2 = {
    customToStage: myCustomToStageFunction, // or undefined if not needed
    convertAliasToStage: myConvertAliasToStageFunction, // or undefined to knockout using AWS aliases as stages

    injectStageIntoStreamName: myInjectStageIntoStreamNameFunction, 
    extractStageFromStreamName: myExtractStageFromStreamNameFunction,
    streamNameStageSeparator: myStreamNameStageSeparator,

    injectStageIntoResourceName: myInjectStageIntoResourceNameFunction,
    extractStageFromResourceName: myExtractStageFromResourceNameFunction,
    resourceNameStageSeparator: myResourceNameStageSeparator,

    injectInCase: myInjectInCase,
    extractInCase: myExtractInCase,

    defaultStage: myDefaultStage, // or undefined
}
stages.configureStageHandling(context, stageHandlingSettings2, settings, options, forceConfiguration);


// To check if stage handling is configured
const configured = stages.isStageHandlingConfigured(context);

// To look up stage handling settings and functions
const setting = stages.getStageHandlingSetting(context, settingName);
const fn = stages.getStageHandlingFunction(context, functionSettingName);

// 1. To resolve / derive a stage from an AWS event
const context = {};
const stage = stages.resolveStage(event, awsContext, context);

// 2. To configure a context with a resolved stage 
stages.configureStage(context, event, awsContext, failFast)

// 3. To qualify an unqualified stream name with a stage
const unqualifiedStreamName = 'TestStream';
const stageQualifiedStreamName = stages.toStageQualifiedStreamName(unqualifiedStreamName, stage, context);

// 4. To extract a stage from a qualified stream name
const qualifiedStreamName = 'TestStream_PROD';
const stage2 = stages.extractStageFromQualifiedStreamName(qualifiedStreamName, context);

// 5. To qualify an unqualified resource name with a stage
const unqualifiedResourceName = 'TestResource';
const stageQualifiedResourceName = stages.toStageQualifiedResourceName(unqualifiedResourceName, stage, context);

// 6. To extract a stage from a qualified resource name
const qualifiedResourceName = 'TestResource_QA';
const stage3 = stages.extractStageFromQualifiedResourceName(qualifiedResourceName, context);
```

* To use the stream event utilities
```js
const streamEvents = require('aws-core-utils/stream-events');

// To extract stream names form AWS event source ARNs 
const eventSourceARNs = streamEvents.getEventSourceARNs(event);
const eventSourceStreamNames = streamEvents.getEventSourceStreamNames(event);
const eventSourceStreamName = streamEvents.getEventSourceStreamName(record);

// Simple checks to validate existance of some of the properties of Kinesis & DynamoDB stream event records
try {
  streamEvents.validateStreamEventRecord(record);
  streamEvents.validateKinesisStreamEventRecord(record);
  streamEvents.validateDynamoDBStreamEventRecord(record);
} catch (err) { 
  // ... 
}
```

## Unit tests
This module's unit tests were developed with and must be run with [tape](https://www.npmjs.com/package/tape). The unit tests have been tested on [Node.js v4.3.2](https://nodejs.org/en/blog/release/v4.3.2/).  

Install tape globally if you want to run multiple tests at once:
```bash
$ npm install tape -g
```

Run all unit tests with:
```bash
$ npm test
```
or with tape:
```bash
$ tape test/*.js
```

See the [package source](https://github.com/byron-dupreez/aws-core-utils) for more details.

## Changes

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


    