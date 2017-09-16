# aws-core-utils v7.0.6

Core utilities for working with Amazon Web Services (AWS), including ARNs, regions, stages, Lambdas, AWS errors, stream events, Kinesis, DynamoDB.DocumentClients, etc.

Currently includes:
- api-lambdas.js
  - Utilities for working with Lambdas exposed to AWS API Gateway, including functions to:
    - Configure a standard context for AWS Gateway exposed Lambdas (re-exported from contexts.js module)
    - Fail Lambda callbacks with standard AppError errors to facilitate mapping of errors to HTTP status codes on API Gateway.
- arns.js 
  - Utilities for working with Amazon Resource Names (ARNs)
- aws-errors.js
  - Utilities for working with AWS errors
- contexts.js
  - Utilities for configuring contexts for AWS Gateway exposed and other types of Lambdas
- dynamodb-doc-client-cache.js
  - A module-scope cache of AWS.DynamoDB.DocumentClient instances by region for Lambda.
- dynamodb-doc-client-utils.js
  - Utilities for working with AWS DynamoDB.DocumentClient.
- dynamodb-utils.js
  - Utilities for working with AWS DynamoDB.
- kinesis-cache.js
  - A module-scope cache of AWS.Kinesis instances by region for Lambda.
- kms-cache.js
  - A module-scope cache of AWS.KMS instances by region for Lambda usage.
- kms-utils.js
  - Utilities to simplify working with AWS.KMS instances.
- lambda-cache.js
  - A module-scope cache of AWS.Lambda instances by region for use within Lambda functions.
- lambda-utils.js
  - Utilities to simplify working with an AWS.Lambda instance
- lambdas.js 
  - Utilities for working with AWS Lambda, which enable extraction of function names, versions and, most importantly, 
    aliases from AWS contexts and their invoked function ARNs.
  - Utility for failing non-API Gateway Lambda's callbacks with standard AppError errors if mapping of errors to HTTP status codes is needed
- regions.js 
  - Utilities for resolving the AWS region from various sources (primarily for AWS Lambda usage).
- stages.js
  - Utilities for resolving or deriving the current stage (e.g. dev, qa, prod) from various sources 
    (primarily for AWS Lambda usage).
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

* To use the `api-lambdas` module within your API Gateway exposed Lambda:
```js
const apiLambdas = require('aws-core-utils/api-lambdas');
const appErrors = require('core-functions/app-errors');
const BadRequest = appErrors.BadRequest;
const context = {}; // or your own pre-configured context
const standardOptions = require('my-options.json'); // or whatever options you want to use to configure stage handling, logging, custom settings, ...
const standardSettings = undefined; // or whatever settings object you want to use to configure stage handling, logging, custom settings, ...
function exampleFunction(event, context) { /* ... */ } // implement and name your own function that does the actual work

// Simplest approach - generate your API Gateway exposed Lambda's handler function
module.exports.handler = apiLambdas.generateHandlerFunction(context, standardSettings, standardOptions, exampleFunction);
  
// OR ... using all optional arguments to change the allowed HTTP status codes and customise logging in the handler function
module.exports.handler = apiLambdas.generateHandlerFunction(context, standardSettings, standardOptions, exampleFunction, 'info', 
  [400, 404, 500], 'Invalid request ...', 'Failed to ...', 'Finished ...');


// OR ... develop your own Lambda handler function (e.g. simplistic example below - see apiLamdas.generateHandlerFunction for a better version)
module.exports.handler = (event, awsContext, callback) => {
  // Configure a standard context
  const context = {};
  try {
    apiLambdas.configureStandardContext(context, standardSettings, standardOptions, event, awsContext);
    
    // ... execute Lambda specific code passing the context to your functions as needed
    exampleFunction(event, context)
      .then(response => {
        context.info('Finished ...');
        callback(null, response);
      })
      .catch(err => {
        // Fail your Lambda callback and map the error to one of the default set of HTTP status codes:
        // i.e. [400, 401, 403, 404, 408, 429, 500, 502, 503, 504]
        if (err instanceof BadRequest || appErrors.getHttpStatus(err) === 400) {
          context.warn('Invalid request ...' + err.message);
        } else {
          context.error('Failed to ...', err);
        }
        apiLambdas.failCallback(callback, err, awsContext);
      });
  
  } catch (err) {
    // Fail your Lambda callback and map the error to one of the default set of HTTP status codes:
    // i.e. [400, 401, 403, 404, 408, 429, 500, 502, 503, 504]
    context.error('Failed to ...', err);
    apiLambdas.failCallback(callback, err, awsContext);
  }
};

// ALTERNATIVES for failCallback: 
// Fail your Lambda callback and map the error to one of a specified set of HTTP status codes
apiLambdas.failCallback(callback, err, awsContext, 'My error msg', 'MyErrorCode', [400, 404, 418, 500, 508]);
```

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

* To use the `contexts.js` module:
```js
// To use the configureStandardContext function, please refer to the 'To use the `api-lambdas` module' example above
// (since the `api-lambdas.js` module simply re-exports the `contexts.js` module's configureStandardContext)

// ALTERNATIVELY if you need the logic of the configureStandardContext function for custom purposes
const contexts = require('aws-core-utils/contexts');
const context = {};
const standardOptions = require('my-standard-options.json'); // or whatever options you want to use to configure stage handling, logging, custom settings, ...
const standardSettings = {}; // or whatever settings you want to use to configure stage handling, logging, custom settings, ...
contexts.configureStandardContext(context, standardSettings, standardOptions, awsEvent, awsContext);

// If you need the logic of the configureCustomSettings function, which is used by configureStandardContext, for other purposes
const myCustomSettings = {myCustomSetting1: 1, myCustomSetting2: 2, myCustomFunction: () => {}};
console.log(`Irrelevant logging - only added to avoid unused function warning - ${myCustomSettings.myCustomFunction()}`);
const myCustomOptions = require('my-custom-options.json');
contexts.configureCustomSettings(context, myCustomSettings, myCustomOptions);
console.log(`context.custom = ${JSON.stringify(context.custom)}; myCustomFunction = ${JSON.stringify(context.custom.myCustomFunction)} `);
```

* To use the DynamoDB.DocumentClient cache to configure and cache an AWS DynamoDB.DocumentClient instance per region
```js
const dynamoDBDocClientCache = require('aws-core-utils/dynamodb-doc-client-cache');

// Preamble to create a context and configure logging on the context
const context = {};
const logging = require('logging-utils');
logging.configureLogging(context); // or your own custom logging configuration (see logging-utils README.md)

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
const dynamoDBDocClient = dynamoDBDocClientCache.setDynamoDBDocClient(dynamoDBDocClientOptions, context);

// To configure a new AWS.DynamoDB.DocumentClient instance (or re-use a cached instance) on a context 
dynamoDBDocClientCache.configureDynamoDBDocClient(context, dynamoDBDocClientOptions);
console.log(context.dynamoDBDocClient);

// To get a previously set or configured AWS DynamoDB.DocumentClient instance for the current AWS region
const dynamoDBDocClient1 = dynamoDBDocClientCache.getDynamoDBDocClient();
// ... or for a specified region
const dynamoDBDocClient2 = dynamoDBDocClientCache.getDynamoDBDocClient('us-west-2');

// To get the original options that were used to construct a cached AWS DynamoDB.DocumentClient instance for the current or specified AWS region
const optionsUsed1 = dynamoDBDocClientCache.getDynamoDBDocClientOptionsUsed();
const optionsUsed2 = dynamoDBDocClientCache.getDynamoDBDocClientOptionsUsed('us-west-1');

// To delete and remove a cached DynamoDB.DocumentClient instance from the cache
const deleted = dynamoDBDocClientCache.deleteDynamoDBDocClient('eu-west-1');
```

* To use the Kinesis cache to configure and cache an AWS Kinesis instance per region
```js
const kinesisCache = require('aws-core-utils/kinesis-cache');

// Preamble to create a context and configure logging on the context
const context = {};
const logging = require('logging-utils');
logging.configureLogging(context); // or your own custom logging configuration (see logging-utils README.md)

// Define the Kinesis constructor options that you want to use, e.g.
const kinesisOptions = {
  // See http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Kinesis.html#constructor-property for full details
  maxRetries: 0
  // ...
};

// To create and cache a new AWS Kinesis instance with the given Kinesis constructor options for either the current 
// region or the region specified in the given options OR reuse a previously cached Kinesis instance (if any) that is 
// compatible with the given options
const kinesis = kinesisCache.setKinesis(kinesisOptions, context);

// To configure a new AWS.Kinesis instance (or re-use a cached instance) on a context 
kinesisCache.configureKinesis(context, kinesisOptions);
console.log(context.kinesis);

// To get a previously set or configured AWS Kinesis instance for the current AWS region
const kinesis1 = kinesisCache.getKinesis();
// ... or for a specified region
const kinesis2 = kinesisCache.getKinesis('us-west-2');

// To get the original options that were used to construct a cached AWS Kinesis instance for the current or specified AWS region
const optionsUsed1 = kinesisCache.getKinesisOptionsUsed();
const optionsUsed2 = kinesisCache.getKinesisOptionsUsed('us-west-1');

// To delete and remove a cached Kinesis instance from the cache
const deleted = kinesisCache.deleteKinesis('eu-west-1');
```
* To use the KMS cache to configure and cache an AWS KMS instance per region
```js
const kmsCache = require('aws-core-utils/kms-cache');

// Preamble to create a context and configure logging on the context
const context = {};
const logging = require('logging-utils');
logging.configureLogging(context); // or your own custom logging configuration (see logging-utils README.md)

// Define the KMS constructor options that you want to use, e.g.
const kmsOptions = {
  // See http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/KMS.html#constructor-property for full details
  maxRetries: 0
  // ...
};

// To create and cache a new AWS KMS instance with the given KMS constructor options for either the current 
// region or the region specified in the given options OR reuse a previously cached KMS instance (if any) that is 
// compatible with the given options
const kms = kmsCache.setKMS(kmsOptions, context);

// To configure a new AWS.KMS instance (or re-use a cached instance) on a context 
kmsCache.configureKMS(context, kmsOptions);
console.log(context.kms);

// To get a previously set or configured AWS KMS instance for the current AWS region
const kms1 = kmsCache.getKMS();
// ... or for a specified region
const kms2 = kmsCache.getKMS('us-west-2');

// To get the original options that were used to construct a cached AWS KMS instance for the current or specified AWS region
const optionsUsed1 = kmsCache.getKMSOptionsUsed();
const optionsUsed2 = kmsCache.getKMSOptionsUsed('us-west-1');

// To delete and remove a cached KMS instance from the cache
const deleted = kmsCache.deleteKMS('eu-west-1');
```

* To use the AWS.KMS utilities
```js
const kmsUtils = require('aws-core-utils/kms-utils');

const kms = new AWS.KMS({region: 'eu-west-1'}); // or better yet use kms-cache module as above

// Preamble to create a context and configure logging on the context
const logging = require('logging-utils');
const logger = logging.configureLogging({}); // or your own custom logging configuration (see logging-utils README.md)

const accountId = 'XXXXXXXXXXXX'; // use your AWS account ID
const kmsKeyAlias = 'aws/lambda'; // or use your own key alias
const keyId = `arn:aws:kms:us-west-2:${accountId}:alias/${kmsKeyAlias}`;

// To encrypt plaintext using KMS:
const plaintext = 'Shhhhhhhhhhhhhhh'; // use your own plaintext
kmsUtils.encryptKey(kms, keyId, plaintext, logger)
  .then(ciphertextBase64 => console.log(JSON.stringify(ciphertextBase64)));

// To decrypt ciphertext using KMS:
const ciphertextBase64 = '...'; // use your own ciphertext
kmsUtils.decryptKey(kms, ciphertextBase64, logger)
  .then(plaintext => console.log(JSON.stringify(plaintext)));

// To encrypt plaintext using KMS:
const encryptParams = {KeyId: keyId, Plaintext: plaintext};
kmsUtils.encrypt(kms, encryptParams, logger)
  .then(result => console.log(JSON.stringify(result)));

// To decrypt ciphertext using KMS:
const decryptParams = {CiphertextBlob: new Buffer(ciphertextBase64, 'base64')};
kmsUtils.decrypt(kms, decryptParams, logger)
  .then(result => console.log(JSON.stringify(result)));
```

* To use the Lambda cache to configure and cache an AWS Lambda instance per region
```js
const lambdaCache = require('aws-core-utils/lambda-cache');

// Preamble to create a context and configure logging on the context
const context = {};
const logging = require('logging-utils');
logging.configureLogging(context); // or your own custom logging configuration (see logging-utils README.md)

// Define the Lambda constructor options that you want to use, e.g.
const lambdaOptions = {
  // See http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#constructor-property for full details
  maxRetries: 0
  // ...
};

// To create and cache a new AWS Lambda instance with the given Lambda constructor options for either the current 
// region or the region specified in the given options OR reuse a previously cached Lambda instance (if any) that is 
// compatible with the given options
const lambda = lambdaCache.setLambda(lambdaOptions, context);

// To configure a new AWS.Lambda instance (or re-use a cached instance) on a context 
lambdaCache.configureLambda(context, lambdaOptions);
console.log(context.lambda);

// To get a previously set or configured AWS Lambda instance for the current AWS region
const lambda1 = lambdaCache.getLambda();
// ... or for a specified region
const lambda2 = lambdaCache.getLambda('us-west-2');

// To get the original options that were used to construct a cached AWS Lambda instance for the current or specified AWS region
const optionsUsed1 = lambdaCache.getLambdaOptionsUsed();
const optionsUsed2 = lambdaCache.getLambdaOptionsUsed('us-west-1');

// To delete and remove a cached Lambda instance from the cache
const deleted = lambdaCache.deleteLambda('eu-west-1');
```

* To use the AWS.Lambda utilities
```js
const lambdaUtils = require('aws-core-utils/lambda-utils');

const lambda = new AWS.Lambda({region: 'eu-west-1'}); // or better yet use lambda-cache module as above

// To list the event source mappings on your Lambda function
const params = {FunctionName: 'my-lambda-function'};
lambdaUtils.listEventSourceMappings(lambda, params, context)
  .then(result => console.log(JSON.stringify(result)));

// To update an event source mapping on your Lambda function
const params2 = {FunctionName: 'my-lambda-function', UUID: uuid, BatchSize: 99};
lambdaUtils.updateEventSourceMapping(lambda, params2, context)
  .then(result => console.log(JSON.stringify(result)));

// To disable an event source mapping on your Lambda function
lambdaUtils.disableEventSourceMapping(lambda, 'my-lambda-function', uuid, context)
  .then(result => console.log(JSON.stringify(result)));

```

* To use the Lambda utilities
```js
const lambdas = require('aws-core-utils/lambdas');

// To resolve the Lambda alias from an AWS Lambda context
const alias = lambdas.getAlias(awsContext);

// To extract other details from an AWS Lambda context
const functionName = lambdas.getFunctionName(awsContext);
const functionVersion = lambdas.getFunctionVersion(awsContext);
const functionNameVersionAndAlias = lambdas.getFunctionNameVersionAndAlias(awsContext);
const invokedFunctionArn = lambdas.getInvokedFunctionArn(awsContext);
const invokedFunctionArnFunctionName = lambdas.getInvokedFunctionArnFunctionName(awsContext);

// Fail a Lambda's callback with a standard error and preserve HTTP status codes (for non-API Gateway Lambdas) 
// See core-functions/app-errors.js for standard errors to use
lambdas.failCallback(lambdaCallback, error, awsContext, message, code);
```

* To get the current AWS region & configure it on a context
```js
const regions = require('aws-core-utils/regions');

// To get the current AWS region of your Lambda
const region = regions.getRegion();

// To configure a context with the current AWS region
const context = {};
const failFast = true;
regions.configureRegion(context, failFast);
assert(context.region && typeof context.region === 'string');
```

* To use the stage utilities
```js
// To configure stage-handling, which determines the behaviour of the functions numbered 1 to 6 below
const stages = require('aws-core-utils/stages');
const settings = undefined; // ... or your own custom settings
const options = require('aws-core-utils/stages-options.json'); // ... or your own custom options

// ... EITHER using the default stage handling configuration and default logging configuration 
stages.configureDefaultStageHandling(context); 
// ... OR using the default stage handling configuration and default logging configuration partially customised via stageHandlingOptions, otherSettings & otherOptions
const stageHandlingOptions = require('aws-core-utils/stages-options.json').stageHandlingOptions; // example ONLY - use your own custom stage handling options if needed
const otherSettings = undefined; // or to configure your own underlying logger use: const otherSettings = {loggingSettings: {underlyingLogger: myCustomLogger}};
const otherOptions = require('aws-core-utils/test/sample-standard-options.json'); // example ONLY - use your own custom standard options file
const forceConfiguration = false;
stages.configureDefaultStageHandling(context, stageHandlingOptions, otherSettings, otherOptions, forceConfiguration); 

// ... OR using your own custom stage-handling configuration
const stageHandlingSettings = stages.getDefaultStageHandlingSettings(options.stageHandlingOptions);
// Optionally override the default stage handling functions with your own custom functions
// stageHandlingSettings.customToStage = undefined;
// stageHandlingSettings.convertAliasToStage = stages.DEFAULTS.convertAliasToStage;
// stageHandlingSettings.injectStageIntoStreamName = stages.DEFAULTS.toStageSuffixedStreamName;
// stageHandlingSettings.extractStageFromStreamName = stages.DEFAULTS.extractStageFromSuffixedStreamName;
// stageHandlingSettings.injectStageIntoResourceName = stages.DEFAULTS.toStageSuffixedResourceName;
// stageHandlingSettings.extractStageFromResourceName = stages.DEFAULTS.extractStageFromSuffixedResourceName;
stages.configureStageHandling(context, stageHandlingSettings, stageHandlingOptions, otherSettings, otherOptions, forceConfiguration);

// ... OR using completely customised stage handling settings
const stageHandlingSettings2 = {
    envStageName: myEnvStageName,
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
};
stages.configureStageHandling(context, stageHandlingSettings2, undefined, otherSettings, otherOptions, forceConfiguration);

// ... OR using custom stage handling settings and/or options and configuring dependencies at the same time
stages.configureStageHandling(context, stageHandlingSettings, stageHandlingOptions, otherSettings, otherOptions, forceConfiguration);

// To check if stage handling is configured
const configured = stages.isStageHandlingConfigured(context);

// To look up stage handling settings and functions
const settingName = 'injectInCase'; // example stage handling setting name
const setting = stages.getStageHandlingSetting(context, settingName);

const functionSettingName = 'convertAliasToStage'; // example stage handling function name
const fn = stages.getStageHandlingFunction(context, functionSettingName);

// 1. To resolve / derive a stage from an AWS event
const context = {};
const stage = stages.resolveStage(awsEvent, awsContext, context);

// 2. To configure a context with a resolved stage (uses resolveStage)
const failFast = true;
stages.configureStage(context, awsEvent, awsContext, failFast);
assert(context.stage && typeof context.stage === 'string');

// 3. To extract a stage from a qualified stream name
const qualifiedStreamName = 'TestStream_PROD';
const stage2 = stages.extractStageFromQualifiedStreamName(qualifiedStreamName, context);
assert(stage2 === 'prod'); // assuming default stage handling configuration

// 4. To qualify an unqualified stream name with a stage
const unqualifiedStreamName = 'TestStream';
const stageQualifiedStreamName = stages.toStageQualifiedStreamName(unqualifiedStreamName, stage2, context);
assert(stageQualifiedStreamName === 'TestStream_PROD'); // assuming default stage handling configuration

// 5. To extract a stage from a qualified resource name
const qualifiedTableName = 'TestTable_QA';
const stage3 = stages.extractStageFromQualifiedResourceName(qualifiedTableName, context);
assert(stage3 === 'qa'); // assuming default stage handling configuration

// 6. To qualify an unqualified resource name with a stage
const unqualifiedTableName = 'TestTable';
const stageQualifiedResourceName = stages.toStageQualifiedResourceName(unqualifiedTableName, stage3, context);
assert(stageQualifiedResourceName === 'TestTable_QA'); // assuming default stage handling configuration
```

* To use the stream event utilities
```js
const streamEvents = require('aws-core-utils/stream-events');

// To extract event soure ARNs from AWS events 
const eventSourceARNs = streamEvents.getEventSourceARNs(event);

// To extract Kinesis stream names from AWS events and event records
const eventSourceStreamNames = streamEvents.getKinesisEventSourceStreamNames(event);
const eventSourceStreamName = streamEvents.getKinesisEventSourceStreamName(record);

// To extract DynamoDB table names from DynamoDB stream event records
const dynamoDBEventSourceTableName = streamEvents.getDynamoDBEventSourceTableName(record);

// To extract DynamoDB table names and stream timestamps/suffixes from DynamoDB stream event records
const tableNameAndStreamTimestamp = streamEvents.getDynamoDBEventSourceTableNameAndStreamTimestamp(record);
const dynamoDBEventSourceTableName1 = tableNameAndStreamTimestamp[0];
const dynamoDBEventSourceStreamTimestamp = tableNameAndStreamTimestamp[1];

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
See [release_notes.md](./release_notes.md)