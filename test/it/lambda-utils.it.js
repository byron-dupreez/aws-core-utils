'use strict';

/**
 * Integration tests for aws-core-utils/lambda-utils.js
 * @author Byron du Preez
 */

const test = require('tape');

// The test subject
const lambdaUtils = require('../../lambda-utils');
const MappingState = lambdaUtils.EventSourceMappingState;

const lambdaCache = require('../../lambda-cache');

const contexts = require('../../contexts');

// =====================================================================================================================
// Set the following properties to match the AWS Lambda you want to test
// =====================================================================================================================
const region = 'eu-west-1';
const stage = 'uat';
const lambdaFunctionName1 = 'scp-transform-interactions'; // an un-aliased Lambda with NO mapping
const lambdaFunctionName2 = `${lambdaFunctionName1}:${stage}`; // a Lambda aliased with stage with at least one mapping
const uuid = '1821d94c-e370-42ff-a4e0-be60554e973e'; // the UUID of your event source mapping to update
// =====================================================================================================================

test('listEventSourceMappings with no event source mappings', t => {
  process.env.AWS_REGION = region;
  const context = contexts.configureStandardContext({}, undefined, require('../context-options.json')); //, event, awsContext, false);
  context.stage = stage;

  const lambda = lambdaCache.setLambda({region: region});

  const expectedResult = {NextMarker: undefined, EventSourceMappings: []};
  const expectedMappings = expectedResult.EventSourceMappings;

  const params = {FunctionName: lambdaFunctionName1};
  lambdaUtils.listEventSourceMappings(lambda, params, context).then(
    result => {
      const mappings = result.EventSourceMappings;
      t.deepEqual(mappings, expectedMappings, `listEventSourceMappings(lambda, ${JSON.stringify(params)}, context) must be ${JSON.stringify(expectedMappings)}`);
      t.end();
    },
    err => {
      t.end(err);
    });
});

test('listEventSourceMappings with one event source mapping', t => {
  process.env.AWS_REGION = region;
  const context = contexts.configureStandardContext({}, undefined, require('../context-options.json')); //, event, awsContext, false);
  context.stage = stage;

  const lambda = lambdaCache.setLambda({region: region});

  const expectedResult = {NextMarker: undefined, EventSourceMappings: []};
  const expectedMappings = expectedResult.EventSourceMappings;

  const params = {FunctionName: lambdaFunctionName2};
  lambdaUtils.listEventSourceMappings(lambda, params, context).then(
    result => {
      console.log(`result = ${JSON.stringify(result, undefined, 2)}`);
      const mappings = result.EventSourceMappings;
      t.ok(mappings.length > 0, `listEventSourceMappings(lambda, ${JSON.stringify(params)}, context) must return at least one mapping ${JSON.stringify(expectedMappings)}`);
      t.ok(mappings.map(m => m.UUID).indexOf(uuid) !== -1, `listEventSourceMappings(lambda, $\{JSON.stringify(params)}, context) must contain a mapping with UUID (${uuid})`);
      t.end();
    },
    err => {
      t.end(err);
    });
});

test('updateEventSourceMapping', t => {
  process.env.AWS_REGION = region;
  const context = contexts.configureStandardContext({}, undefined, require('../context-options.json')); //, event, awsContext, false);
  context.stage = stage;

  const lambda = lambdaCache.setLambda({region: region});

  const batchSize = 100;

  const params = {FunctionName: lambdaFunctionName2, UUID: uuid, BatchSize: batchSize};
  lambdaUtils.updateEventSourceMapping(lambda, params, context).then(
    result => {
      console.log(`result = ${JSON.stringify(result, undefined, 2)}`);
      const mapping = result;
      t.ok(mapping, `updateEventSourceMapping(lambda, ${JSON.stringify(params)}, context) must return a mapping`);
      t.equal(mapping.BatchSize, batchSize, `updateEventSourceMapping(lambda, ${JSON.stringify(params)}, context) BatchSize must be ${batchSize}`);
      t.end();
    },
    err => {
      t.end(err);
    });
});

test('disableEventSourceMapping', t => {
  process.env.AWS_REGION = region;
  const context = contexts.configureStandardContext({}, undefined, require('../context-options.json')); //, event, awsContext, false);
  context.stage = stage;

  const lambda = lambdaCache.setLambda({region: region});

  // const params = {FunctionName: lambdaFunctionName2, UUID: uuid};
  lambdaUtils.disableEventSourceMapping(lambda, lambdaFunctionName2, uuid, context).then(
    result => {
      console.log(`result = ${JSON.stringify(result, undefined, 2)}`);
      const mapping = result;
      t.ok(mapping, `disableEventSourceMapping(lambda, ${lambdaFunctionName2}, ${uuid}, context) must return a mapping`);
      const disablingOrDisabled = mapping.State === MappingState.Disabled || mapping.State === MappingState.Disabling || mapping.State === MappingState.Updating;
      t.ok(disablingOrDisabled, `disableEventSourceMapping(lambda, ${lambdaFunctionName2}, ${uuid}, context) State (${mapping.State}) must be disabling or disabled or updating`);
      t.end();
    },
    err => {
      t.end(err);
    });
});