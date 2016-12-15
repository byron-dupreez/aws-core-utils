'use strict';

/**
 * Unit tests for aws-core-utils/api-lambdas.js
 * @author Byron du Preez
 */

const test = require("tape");

const uuid = require("uuid");

// The test subject
const apiLambdas = require('../api-lambdas');

const appErrors = require('core-functions/app-errors');
const BadRequest = appErrors.BadRequest;

require('core-functions/promises');

const Strings = require('core-functions/strings');
const stringify = Strings.stringify;

const logging = require('logging-utils');

const stages = require("../stages");
const kinesisCache = require("../kinesis-cache");
const dynamoDBDocClientCache = require("../dynamodb-doc-client-cache");

const samples = require('./samples');
// For AWS contexts
const sampleInvokedFunctionArn = samples.sampleInvokedFunctionArn;
const sampleAwsContext = samples.sampleAwsContext;

function sampleFunction(resolvedResponse, rejectedError, ms) {
  if (!ms) ms = 1;

  function doSomethingUseful(event, context) {
    context.info(`Simulating doing something useful with event ${JSON.stringify(event)}`);
    return Promise.delay(ms)
      .then(() => {
        return rejectedError ? Promise.reject(rejectedError) : Promise.resolve(resolvedResponse);
      });
  }

  return doSomethingUseful;
}

function setRegionStageAndDeleteCachedInstances(region, stage) {
  // Set up region
  process.env.AWS_REGION = region;
  // Set up stage
  process.env.STAGE = stage;
  // Remove any cached entries before configuring
  deleteCachedInstances();
  return region;
}

function deleteCachedInstances() {
  const region = process.env.AWS_REGION;
  kinesisCache.deleteKinesis(region);
  dynamoDBDocClientCache.deleteDynamoDBDocClient(region);
}

// =====================================================================================================================
// generateHandlerFunction simulating successful response
// =====================================================================================================================

test('generateHandlerFunction simulating successful response', t => {
  try {
    // Set up environment for testing
    const region = setRegionStageAndDeleteCachedInstances('us-west-2', 'dev99');

    // Create sample AWS event and AWS context
    const event = {body: {abc: 123}};
    const invokedFunctionArn = sampleInvokedFunctionArn(region, 'myLambdaFunctionName', 'dev77');
    const awsContext = sampleAwsContext('myLambdaFunctionName', '1.0.1', invokedFunctionArn, 500);

    const expectedResponse = {def: 456};

    // Create a sample function to be executed within the Lambda handler function
    const fn = sampleFunction(expectedResponse, undefined);

    // Create a sample AWS Lambda handler function
    const handler = apiLambdas.generateHandlerFunction(undefined, require('./sample-standard-options.json'),
      fn, logging.INFO); //, undefined, 'Invalid do something request', 'Failed to do something useful', 'Did something useful');

    // Wrap the callback-based AWS Lambda handler function as a Promise returning function purely for testing purposes
    const handlerWithPromise = Promise.wrap(handler);

    // Invoke the handler function
    handlerWithPromise(event, awsContext)
      .then(response => {
        t.pass(`handler should have passed`);
        t.equal(response, expectedResponse, `response must be ${JSON.stringify(expectedResponse)}`);
        t.end();
      })
      .catch(err => {
        t.fail(`handler should not have failed - ${err.stack}`);
        t.end();
      });

  } catch (err) {
    t.fail(`handler should not have failed in try-catch - ${err.stack}`);
    t.end();

  } finally {
    // Clean up environment
    setRegionStageAndDeleteCachedInstances(undefined, undefined);
  }
});

// =====================================================================================================================
// generateHandlerFunction simulating invalid request
// =====================================================================================================================

test('generateHandlerFunction simulating invalid request', t => {
  try {
    // Set up environment for testing
    const region = setRegionStageAndDeleteCachedInstances('us-west-2', 'dev99');

    // Create sample AWS event and AWS context
    const event = {body: {abc: 123}};
    const invokedFunctionArn = sampleInvokedFunctionArn(region, 'myLambdaFunctionName', 'dev77');
    const awsContext = sampleAwsContext('myLambdaFunctionName', '1.0.1', invokedFunctionArn, 500);

    const expectedError = new BadRequest('you forgot something');

    // Create a sample function to be executed within the Lambda handler function
    const fn = sampleFunction(undefined, expectedError);

    // Create a sample AWS Lambda handler function
    const handler = apiLambdas.generateHandlerFunction(undefined, require('./sample-standard-options.json'),
      fn, logging.DEBUG, undefined, 'Invalid do something request', 'Failed to do something useful', 'Did something useful');

    // Wrap the callback-based AWS Lambda handler function as a Promise returning function purely for testing purposes
    const handlerWithPromise = Promise.wrap(handler);

    // Invoke the handler function
    handlerWithPromise(event, awsContext)
      .then(response => {
        t.fail(`handler should NOT have passed with response ${stringify(response)}`);
        t.end();
      })
      .catch(err => {
        //console.error(`################### err = ${err}`);
        t.pass(`handler should have failed - ${err}`);
        const e = JSON.parse(err);
        t.equal(e.message, expectedError.message, `e.message must be "${expectedError.message}"`);
        t.equal(e.code, "BadRequest", `e.code must be "BadRequest"`);
        t.equal(e.httpStatus, 400, `e.httpStatus must be 400`);
        const expectedCause = '';
        t.equal(e.cause, expectedCause, `e.cause must be "${expectedCause}"`);
        t.equal(e.causeStatus, undefined, `e.causeStatus must be undefined`);
        t.equal(e.awsRequestId, awsContext.awsRequestId, `e.awsRequestId must be "${awsContext.awsRequestId}"`);
        t.end();
      });

  } catch (err) {
    t.fail(`handler should not have failed in try-catch - ${err.stack}`);
    t.end();

  } finally {
    // Clean up environment
    setRegionStageAndDeleteCachedInstances(undefined, undefined);
  }
});


// =====================================================================================================================
// generateHandlerFunction simulating failure
// =====================================================================================================================

test('generateHandlerFunction simulating failure', t => {
  try {
    // Set up environment for testing
    const region = setRegionStageAndDeleteCachedInstances('us-west-2', 'dev99');

    // Create sample AWS event and AWS context
    const event = {body: {abc: 123}};
    const invokedFunctionArn = sampleInvokedFunctionArn(region, 'myLambdaFunctionName', 'dev77');
    const awsContext = sampleAwsContext('myLambdaFunctionName', '1.0.1', invokedFunctionArn, 500);

    const expectedError = new Error('Kaboom');

    // Create a sample function to be executed within the Lambda handler function
    const fn = sampleFunction(undefined, expectedError);

    // Create a sample AWS Lambda handler function
    const handler = apiLambdas.generateHandlerFunction(undefined, require('./sample-standard-options.json'),
      fn, logging.TRACE, undefined, 'Invalid do something request', 'Failed to do something useful', 'Did something useful');

    // Wrap the callback-based AWS Lambda handler function as a Promise returning function purely for testing purposes
    const handlerWithPromise = Promise.wrap(handler);

    // Invoke the handler function
    handlerWithPromise(event, awsContext)
      .then(response => {
        t.fail(`handler should NOT have passed with response ${stringify(response)}`);
        t.end();
      })
      .catch(err => {
        //console.error(`################### err = ${err}`);
        t.pass(`handler should have failed - ${err}`);
        const e = JSON.parse(err);
        t.equal(e.message, expectedError.message, `e.message must be "${expectedError.message}"`);
        t.equal(e.code, "Error", `e.code must be "Error"`);
        t.equal(e.httpStatus, 500, `e.httpStatus must be 500`);
        const expectedCause = 'Error: ' + expectedError.message;
        t.equal(e.cause, expectedCause, `e.cause must be "${expectedCause}"`);
        t.equal(e.causeStatus, undefined, `e.causeStatus must be undefined`);
        t.equal(e.awsRequestId, awsContext.awsRequestId, `e.awsRequestId must be "${awsContext.awsRequestId}"`);
        t.end();
      });

  } catch (err) {
    t.fail(`handler should not have failed in try-catch - ${err.stack}`);
    t.end();

  } finally {
    // Clean up environment
    setRegionStageAndDeleteCachedInstances(undefined, undefined);
  }
});