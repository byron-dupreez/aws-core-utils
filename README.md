# aws-core-utils v0.9.0

Core utilities for working with Amazon Web Services (AWS), including arns, regions, stages, etc.


Currently includes:
- arns.js 
    - Utilities for working with Amazon Resource Names (ARNs)
- regions.js 
    - Utilities for resolving the AWS region from various sources (primarily for AWS Lambda usage).
  stages.js
    - Utilities for resolving or deriving the current stage (e.g. dev, qa, prod) from various sources (primarily for 
    AWS Lambda usage).
- lambdas.js 
    - Utilities for working with AWS Lambdas.

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
