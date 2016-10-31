# aws-core-utils v2.0.0

Core utilities for working with Amazon Web Services (AWS), including ARNs, regions, stages, Lambdas, AWS errors, stream events, etc.


Currently includes:
- arns.js 
    - Utilities for working with Amazon Resource Names (ARNs)
- aws-errors.js
    - Utilities for working with AWS errors.
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
```js
// To use the ARN utilities
const arns = require('aws-core-utils/arns');

// To resolve the AWS region
const regions = require('aws-core-utils/regions');

// To derive stages from AWS events 
const stages = require('aws-core-utils/stages');

// To use the L from AWS events 
const lambdas = require('aws-core-utils/lambdas');

// To use the AWS errors utilities 
const awsErros = require('aws-core-utils/aws-errors');
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
### 0.9.0
- Initial commit

### 1.0.0
- Completed changes needed to release 1.0.0
- Added unit tests for stages.js
- Simplified regions.js API down to relevant methods
- Fixed defects attempting to source awsRegion and eventSourceARN from event instead of Kinesis records within event.
- Patched repository in package.json

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