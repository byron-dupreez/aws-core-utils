'use strict';

/**
 * Unit tests for aws-core-utils/lambda-utils.js
 * @author Byron du Preez
 */

const test = require('tape');

// The test subject
const lambdaUtils = require('../lambda-utils');

const contexts = require('../contexts');
const uuid = require('uuid');

const region = 'us-west-1';
const accountNo = 'XXXXXXXXXXXX';
const stage = 'dev';
const streamName = `SCP_Interactions_${stage.toUpperCase()}`;
const lambdaFunctionName1 = 'scp-transform-interactions';
const lambdaFunctionName2 = `${lambdaFunctionName1}:${stage}`;
const uuid1 = uuid.v4();

function generateMockLambda(err, data, ms) {
  return {
    listEventSourceMappings(params, callback) {
      console.log(`Simulating AWS.Lambda listEventSourceMappings with ${JSON.stringify(params)})`);
      setTimeout(() => {
        if (err)
          callback(err, null);
        else
          callback(null, data);
      }, ms);
    },

    updateEventSourceMapping(params, callback) {
      console.log(`Simulating AWS.Lambda updateEventSourceMapping with ${JSON.stringify(params)})`);
      setTimeout(() => {
        if (err)
          callback(err, null);
        else
          callback(null, data);
      }, ms);

    }
  };
}

test('listEventSourceMappings with an empty result', t => {
  process.env.AWS_REGION = region;
  const context = contexts.configureStandardContext({}, undefined, require('./context-options.json')); //, event, awsContext, false);
  context.stage = stage;

  const expectedResult = {NextMarker: null, EventSourceMappings: []};
  const lambda = generateMockLambda(null, expectedResult, 10);

  const params = {functionName: 'test-func'};
  lambdaUtils.listEventSourceMappings(lambda, params, context).then(
    result => {
      t.deepEqual(result, expectedResult, `listEventSourceMappings(lambda, ${JSON.stringify(params)}, context) must be ${JSON.stringify(expectedResult)}`);
      t.end();
    },
    err => {
      t.end(err);
    }
  );
});

test('listEventSourceMappings with an empty result', t => {
  process.env.AWS_REGION = region;
  const context = contexts.configureStandardContext({}, undefined, require('./context-options.json')); //, event, awsContext, false);
  context.stage = stage;

  const mapping = {
    "UUID": uuid1,
    "BatchSize": 100,
    "EventSourceArn": `arn:aws:kinesis:${region}:${accountNo}:stream/${streamName}`,
    "FunctionArn": `arn:aws:lambda:${region}:${accountNo}:function:${lambdaFunctionName2}`,
    "LastModified": "2017-07-28T15:44:00.000Z",
    "LastProcessingResult": "OK",
    "State": "Disabled",
    "StateTransitionReason": "User action"
  };
  const expectedResult = {NextMarker: null, EventSourceMappings: [mapping]};
  const lambda = generateMockLambda(null, expectedResult, 10);

  const params = {FunctionName: lambdaFunctionName2};
  lambdaUtils.listEventSourceMappings(lambda, params, context).then(
    result => {
      t.deepEqual(result, expectedResult, `listEventSourceMappings(lambda, ${JSON.stringify(params)}, context) must be ${JSON.stringify(expectedResult)}`);
      t.end();
    },
    err => {
      t.end(err);
    }
  );
});

test('updateEventSourceMapping', t => {
  process.env.AWS_REGION = region;
  const context = contexts.configureStandardContext({}, undefined, require('./context-options.json')); //, event, awsContext, false);
  context.stage = stage;

  const batchSize = 99;

  const mapping = {
    "UUID": uuid1,
    "BatchSize": batchSize,
    "EventSourceArn": `arn:aws:kinesis:${region}:${accountNo}:stream/${streamName}`,
    "FunctionArn": `arn:aws:lambda:${region}:${accountNo}:function:${lambdaFunctionName2}`,
    "LastModified": "2017-07-28T15:44:00.000Z",
    "LastProcessingResult": "OK",
    "State": "Updating",
    "StateTransitionReason": "User action"
  };
  const expectedResult = {NextMarker: null, EventSourceMappings: [mapping]};
  const lambda = generateMockLambda(null, expectedResult, 10);

  const params = {FunctionName: lambdaFunctionName2, UUID: uuid1, BatchSize: batchSize};
  lambdaUtils.updateEventSourceMapping(lambda, params, context).then(
    result => {
      t.deepEqual(result, expectedResult, `updateEventSourceMapping(lambda, ${JSON.stringify(params)}, context) must be ${JSON.stringify(expectedResult)}`);
      t.end();
    },
    err => {
      t.end(err);
    }
  );
});

test('disableEventSourceMapping', t => {
  process.env.AWS_REGION = region;
  const context = contexts.configureStandardContext({}, undefined, require('./context-options.json')); //, event, awsContext, false);
  context.stage = stage;

  const batchSize = 99;

  const mapping = {
    "UUID": uuid1,
    "BatchSize": batchSize,
    "EventSourceArn": `arn:aws:kinesis:${region}:${accountNo}:stream/${streamName}`,
    "FunctionArn": `arn:aws:lambda:${region}:${accountNo}:function:${lambdaFunctionName2}`,
    "LastModified": "2017-07-28T15:44:00.000Z",
    "LastProcessingResult": "OK",
    "State": "Disabling",
    "StateTransitionReason": "User action"
  };
  const expectedResult = {NextMarker: null, EventSourceMappings: [mapping]};
  const lambda = generateMockLambda(null, expectedResult, 10);

  lambdaUtils.disableEventSourceMapping(lambda, lambdaFunctionName2, uuid1, context).then(
    result => {
      t.deepEqual(result, expectedResult, `disableEventSourceMapping(lambda, ${lambdaFunctionName2}, ${uuid1}, context) must be ${JSON.stringify(expectedResult)}`);
      t.end();
    },
    err => {
      t.end(err);
    }
  );
});