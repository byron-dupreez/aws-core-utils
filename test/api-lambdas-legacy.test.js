'use strict';

/**
 * Unit tests for aws-core-utils/api-lambdas.js
 * @author Byron du Preez
 */

const test = require('tape');

// The test subject
const apiLambdas = require('../api-lambdas');

const appErrors = require('core-functions/app-errors');
const BadRequest = appErrors.BadRequest;

const Promises = require('core-functions/promises');

const Strings = require('core-functions/strings');
const stringify = Strings.stringify;

const logging = require('logging-utils');
const LogLevel = logging.LogLevel;

const kinesisCache = require("../kinesis-cache");
const dynamoDBDocClientCache = require("../dynamodb-doc-client-cache");

const samples = require('./samples');
// For AWS contexts
const sampleInvokedFunctionArn = samples.sampleInvokedFunctionArn;
const sampleAwsContext = samples.sampleAwsContext;

const uuid = require('uuid');

function sampleFunction(resolvedResponse, rejectedError, ms) {
  if (!ms) ms = 1;

  function doSomethingUseful(event, context) {
    context.info(`Simulating doing something useful with event ${JSON.stringify(event)}`);
    return Promises.delay(ms)
      .then(() => {
        return rejectedError ? Promise.reject(rejectedError) : Promise.resolve(resolvedResponse);
      });
  }

  return doSomethingUseful;
}

function setRegionStageAndDeleteCachedInstances(region, stage) {
  // Set up region
  if (region)
    process.env.AWS_REGION = region;
  else
    delete process.env.AWS_REGION;

  // Set up stage
  if (stage)
    process.env.STAGE = stage;
  else
    delete process.env.STAGE;

  // Remove any cached entries before configuring
  deleteCachedInstances();
  return region;
}

function deleteCachedInstances() {
  const region = process.env.AWS_REGION;
  kinesisCache.deleteKinesis(region);
  dynamoDBDocClientCache.deleteDynamoDBDocClient(region);
}

/**
 * A custom `toErrorResponse` function.
 * @param {AppError} error
 * @param {AwsEvent} event
 * @param {StandardHandlerContext} context
 */
function toCustomErrorResponse(error, event, context) {
  return {
    ErrorType: error.code || null,
    HttpStatus: error.httpStatus || null,
    AuditReferenceNumber: error.auditRef || (context.awsContext && context.awsContext.awsRequestId) || null,
    Message: error.message || null
  };
}

// =====================================================================================================================
// generateHandlerFunction simulating successful response (with useLambdaProxy false & NON-legacy parameters)
// =====================================================================================================================

test('generateHandlerFunction simulating successful response (with useLambdaProxy false & NON-legacy parameters & NON-legacy opts)', t => {
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
    const createContext = () => ({});
    const createSettings = undefined;
    const createOptions = () => require('./api-lambdas-context-options-1-legacy.json');

    const opts = {
      logRequestResponseAtLogLevel: LogLevel.INFO,
      invalidRequestMsg: 'Invalid do something request',
      failedMsg: 'Failed to do something useful',
      successMsg: 'Did something useful'
    };

    const handler = apiLambdas.generateHandlerFunction(createContext, createSettings, createOptions, fn, opts);

    // Wrap the callback-based AWS Lambda handler function as a Promise returning function purely for testing purposes
    const handlerWithPromise = Promises.wrap(handler);

    // Invoke the handler function
    handlerWithPromise(event, awsContext)
      .then(response => {
        t.pass(`handler should have passed`);
        t.equal(response, expectedResponse, `response must be ${JSON.stringify(expectedResponse)}`);
        t.end();
      })
      .catch(err => {
        t.fail(`handler should not have failed - ${err}`);
        t.end();
      });

  } catch (err) {
    t.fail(`handler should not have failed in try-catch - ${err}`);
    t.end();

  } finally {
    // Clean up environment
    setRegionStageAndDeleteCachedInstances(undefined, undefined);
  }
});

// =====================================================================================================================
// generateHandlerFunction simulating failure (with useLambdaProxy false & NON-legacy parameters)
// =====================================================================================================================

test('generateHandlerFunction simulating failure (with useLambdaProxy false & NON-legacy parameters & NON-legacy opts)', t => {
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
    const createContext = () => ({});
    const createOptions = () => require('./api-lambdas-context-options-1-legacy.json');

    const opts = {
      logRequestResponseAtLogLevel: LogLevel.TRACE,
      invalidRequestMsg: 'Invalid do something request',
      failedMsg: 'Failed to do something useful',
      successMsg: 'Did something useful'
    };

    const handler = apiLambdas.generateHandlerFunction(createContext, undefined, createOptions, fn, opts);

    // Wrap the callback-based AWS Lambda handler function as a Promise returning function purely for testing purposes
    const handlerWithPromise = Promises.wrap(handler);

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
    t.fail(`handler should not have failed in try-catch - ${err}`);
    t.end();

  } finally {
    // Clean up environment
    setRegionStageAndDeleteCachedInstances(undefined, undefined);
  }
});

// =====================================================================================================================
// generateHandlerFunction simulating successful response (with useLambdaProxy true & NON-legacy parameters)
// =====================================================================================================================

test('generateHandlerFunction simulating successful response (with useLambdaProxy true & NON-legacy parameters & NON-legacy opts)', t => {
  try {
    // Set up environment for testing
    const region = setRegionStageAndDeleteCachedInstances('us-west-2', 'dev99');

    // Create sample AWS event and AWS context
    const event = require('./sample-lamba-proxy-request.json');
    const invokedFunctionArn = sampleInvokedFunctionArn(region, 'myLambdaFunctionName', 'dev77');
    const awsContext = sampleAwsContext('myLambdaFunctionName', '1.0.1', invokedFunctionArn, 500);

    const body = {def: 456};
    const response = {
      // statusCode: 200,
      headers: {hdr1: 'h1', hdr3: 'h3'},
      body: body
    };
    const expectedResponse = {
      statusCode: 200,
      headers: {hdr1: 'h1', hdr3: 'h3', hdr2: 'dh2'}, // merged headers
      body: JSON.stringify(body)
    };

    // Create a sample function to be executed within the Lambda handler function
    const fn = sampleFunction(response, undefined);

    const context = {};
    const preSuccessCallback = function preSuccessCallback(response1, event1, context1) {
      t.pass(`*** preSuccessCallback must be invoked`);
      t.ok(response1, `preSuccessCallback response1 must exist`);
      t.deepEqual(response1, expectedResponse, `preSuccessCallback response1 must be expectedResponse`);
      t.equal(event1, event, `preSuccessCallback event1 must be event`);
      t.equal(context1, context, `preSuccessCallback context1 must be context`);
    };
    // noinspection JSUnusedLocalSymbols
    const preFailureCallback = function preFailureCallback(error1, errorResponse1, event1, context1) {
      t.fail(`### preFailureCallback must NOT be invoked with error (${error1})`);
    };
    const postConfigure = function postConfigure(event1, context1) {
      t.pass(`*** postConfigure must be invoked`);
      t.equal(event1, event, `postConfigure event1 must be event`);
      t.equal(context1, context, `postConfigure context1 must be context`);

      t.equals(context1.handler.postConfigure, postConfigure, `context1.handler.postConfigure must be postConfigure`);
      t.equals(context1.handler.preSuccessCallback, preSuccessCallback, `context1.handler.preSuccessCallback must be preSuccessCallback`);
      t.equals(context1.handler.preFailureCallback, preFailureCallback, `context1.handler.preFailureCallback must be preFailureCallback`);
    };

    // Create a sample AWS Lambda handler function
    const createContext = () => context;
    const handlerSettings = {
      toErrorResponse: toCustomErrorResponse,
      postConfigure: postConfigure,
      preSuccessCallback: preSuccessCallback,
      preFailureCallback: preFailureCallback
    };
    const createSettings = () => ({handler: handlerSettings});
    const createOptions = () => require('./api-lambdas-context-options-2-legacy.json');

    const opts = {
      logRequestResponseAtLogLevel: LogLevel.INFO,
      invalidRequestMsg: 'Invalid do something request',
      failedMsg: 'Failed to do something useful',
      successMsg: 'Did something useful'
    };
    const handler = apiLambdas.generateHandlerFunction(createContext, createSettings, createOptions, fn, opts);

    // Wrap the callback-based AWS Lambda handler function as a Promise returning function purely for testing purposes
    const handlerWithPromise = Promises.wrap(handler);

    // Invoke the handler function
    handlerWithPromise(event, awsContext)
      .then(response => {
        t.pass(`handler should have passed`);
        t.deepEqual(response, expectedResponse, `response must be ${JSON.stringify(expectedResponse)}`);
        t.end();
      })
      .catch(err => {
        t.fail(`handler should not have failed - ${err}`);
        t.end();
      });

  } catch (err) {
    t.fail(`handler should not have failed in try-catch - ${err}`);
    t.end();

  } finally {
    // Clean up environment
    setRegionStageAndDeleteCachedInstances(undefined, undefined);
  }
});

// =====================================================================================================================
// generateHandlerFunction simulating failure response (with useLambdaProxy true & NON-legacy parameters)
// =====================================================================================================================

test('generateHandlerFunction simulating failure response (with useLambdaProxy true & NON-legacy parameters & NON-legacy opts)', t => {
  try {
    // Set up environment for testing
    const region = setRegionStageAndDeleteCachedInstances('us-west-2', 'dev99');

    // Create sample AWS event and AWS context
    const event = require('./sample-lamba-proxy-request.json');
    const invokedFunctionArn = sampleInvokedFunctionArn(region, 'myLambdaFunctionName', 'dev77');
    const awsContext = sampleAwsContext('myLambdaFunctionName', '1.0.1', invokedFunctionArn, 500);

    const error = new BadRequest('Invalid request');
    error.headers = {hdr1: 'h1', hdr3: 'h3'};
    error.auditRef = uuid();

    // Create a sample function to be executed within the Lambda handler function
    const fn = sampleFunction(undefined, error);

    // Create a sample AWS Lambda handler function
    const createContext = () => ({});
    const createSettings = () => undefined;
    const createOptions = () => require('./api-lambdas-context-options-2-legacy.json');

    const opts = {
      logRequestResponseAtLogLevel: LogLevel.INFO,
      invalidRequestMsg: 'Invalid do something request',
      failedMsg: 'Failed to do something useful',
      successMsg: 'Did something useful'
    };

    const handler = apiLambdas.generateHandlerFunction(createContext, createSettings, createOptions, fn, opts);

    // Wrap the callback-based AWS Lambda handler function as a Promise returning function purely for testing purposes
    const handlerWithPromise = Promises.wrap(handler);

    // Invoke the handler function
    handlerWithPromise(event, awsContext)
      .then(response => {
        t.pass(`handler should have passed`);

        const expectedResponse = {
          statusCode: error.httpStatus,
          headers: {hdr1: 'h1', hdr3: 'h3', hdr2: 'dh2'}, // merged headers
          body: JSON.stringify({message: error.message, code: error.code, auditRef: error.auditRef, awsRequestId: awsContext.awsRequestId})
        };
        t.deepEqual(response, expectedResponse, `response must be ${JSON.stringify(expectedResponse)}`);
        t.end();
      })
      .catch(err => {
        t.fail(`handler should not have failed - ${err}`);
        t.end();
      });

  } catch (err) {
    t.fail(`handler should not have failed in try-catch - ${err}`);
    t.end();

  } finally {
    // Clean up environment
    setRegionStageAndDeleteCachedInstances(undefined, undefined);
  }
});

// =====================================================================================================================
// generateHandlerFunction simulating failure response (with useLambdaProxy true & NON-legacy parameters & custom settings)
// =====================================================================================================================

test('generateHandlerFunction simulating failure response (with useLambdaProxy true & NON-legacy parameters & NON-legacy opts & custom settings)', t => {
  try {
    // Set up environment for testing
    const region = setRegionStageAndDeleteCachedInstances('us-west-2', 'dev99');

    // Create sample AWS event and AWS context
    const event = require('./sample-lamba-proxy-request.json');
    const invokedFunctionArn = sampleInvokedFunctionArn(region, 'myLambdaFunctionName', 'dev77');
    const awsContext = sampleAwsContext('myLambdaFunctionName', '1.0.1', invokedFunctionArn, 500);

    const error = new BadRequest('Invalid request');
    error.headers = {hdr1: 'h1', hdr3: 'h3'};
    error.auditRef = uuid();

    // Create a sample function to be executed within the Lambda handler function
    const fn = sampleFunction(undefined, error);

    const context = {};
    // noinspection JSUnusedLocalSymbols
    const preSuccessCallback = function preSuccessCallback(response1, event1, context1) {
      t.fail(`### preSuccessCallback must NOT be invoked with response (${JSON.stringify(response1)})`);
    };
    const preFailureCallback = function preFailureCallback(error1, errorResponse1, event1, context1) {
      t.pass(`*** preFailureCallback must be invoked`);
      t.equal(error1, error, `preFailureCallback error1 must be ${error}`);
      t.ok(errorResponse1, `preFailureCallback errorResponse1 must exist`);
      t.equal(event1, event, `preFailureCallback event1 must be event`);
      t.equal(context1, context, `preFailureCallback context1 must be context`);
    };
    const postConfigure = function postConfigure(event1, context1) {
      t.pass(`*** postConfigure must be invoked`);
      t.equal(event1, event, `postConfigure event1 must be event`);
      t.equal(context1, context, `postConfigure context1 must be context`);

      t.equals(context1.handler.postConfigure, postConfigure, `context1.handler.postConfigure must be postConfigure`);
      t.equals(context1.handler.preSuccessCallback, preSuccessCallback, `context1.handler.preSuccessCallback must be preSuccessCallback`);
      t.equals(context1.handler.preFailureCallback, preFailureCallback, `context1.handler.preFailureCallback must be preFailureCallback`);
    };

    // Create a sample AWS Lambda handler function
    const createContext = () => context;
    const handlerSettings = {
      toErrorResponse: toCustomErrorResponse,
      postConfigure: postConfigure,
      preSuccessCallback: preSuccessCallback,
      preFailureCallback: preFailureCallback
    };
    const createSettings = () => ({handler: handlerSettings});
    const createOptions = () => require('./api-lambdas-context-options-2-legacy.json');

    const opts = {
      logRequestResponseAtLogLevel: LogLevel.INFO,
      invalidRequestMsg: 'Invalid do something request',
      failedMsg: 'Failed to do something useful',
      successMsg: 'Did something useful'
    };

    const handler = apiLambdas.generateHandlerFunction(createContext, createSettings, createOptions, fn, opts);

    // Wrap the callback-based AWS Lambda handler function as a Promise returning function purely for testing purposes
    const handlerWithPromise = Promises.wrap(handler);

    // Invoke the handler function
    handlerWithPromise(event, awsContext)
      .then(response => {
        t.pass(`handler should have ended "normally" with the error`);

        const expectedResponse = {
          statusCode: error.httpStatus,
          headers: {hdr1: 'h1', hdr3: 'h3', hdr2: 'dh2'}, // merged headers
          // body: JSON.stringify({message: error.message, code: error.code, auditRef: error.auditRef, awsRequestId: awsContext.awsRequestId})
          body: JSON.stringify({
            ErrorType: error.code,
            HttpStatus: error.httpStatus,
            AuditReferenceNumber: error.auditRef || awsContext.awsRequestId,
            Message: error.message
          })
        };
        t.deepEqual(response, expectedResponse, `response must be ${JSON.stringify(expectedResponse)}`);
        t.end();
      })
      .catch(err => {
        t.fail(`handler should not have failed - ${err}`);
        t.end();
      });

  } catch (err) {
    t.fail(`handler should not have failed in try-catch - ${err}`);
    t.end();

  } finally {
    // Clean up environment
    setRegionStageAndDeleteCachedInstances(undefined, undefined);
  }
});