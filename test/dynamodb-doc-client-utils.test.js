'use strict';

/**
 * Unit tests for aws-core-utils/dynamodb-doc-client-utils.js
 * @author Byron du Preez
 */

const test = require("tape");

const dynamoDBMocking = require('aws-core-test-utils/dynamodb-mocking');
const mockDynamoDBDocClient = dynamoDBMocking.mockDynamoDBDocClient;

// The test subject
const dynamoDBDocClientUtils = require('../dynamodb-doc-client-utils');
const getItem = dynamoDBDocClientUtils.getItem;
const updateProjectionExpression = dynamoDBDocClientUtils.updateProjectionExpression;
const updateExpressionAttributeNames = dynamoDBDocClientUtils.updateExpressionAttributeNames;
const updateExpressionAttributeValues = dynamoDBDocClientUtils.updateExpressionAttributeValues;

const copy = require('core-functions/copying').copy;
const deep = {deep: true};

const contexts = require('../contexts');

// ---------------------------------------------------------------------------------------------------------------------
// getItem
// ---------------------------------------------------------------------------------------------------------------------

test('getItem with simulated simple object result & no opts', t => {
  process.env.AWS_REGION = 'us-west-2';
  const context = contexts.configureStandardContext({}, undefined, require('./context-options'));

  const tableName = 'TEST_MyTestTable_DEV';
  const key = {country: 'ZA'};

  const opts = undefined;

  const result = {code: 'ZA', name: 'South Africa'};

  function validateGetParams(t, params) {
    t.equal(params.TableName, tableName, `params.TableName must be ${tableName}`);
    t.equal(params.Key, key, `params.Key must be ${JSON.stringify(key)}`);
    t.equal(params.ConsistentRead, undefined, `params.ConsistentRead must be ${undefined}`);
  }

  context.dynamoDBDocClient = mockDynamoDBDocClient(t, 'dynamodb-utils.test', 1,
    {get: {result: result, validateArgs: validateGetParams}});

  getItem(tableName, key, opts, `country (${key.country})`, context)
    .then(
      res => {
        t.equal(res.Item, result, `res.Item must be ${JSON.stringify(result)}`);
        t.end();
      },
      err => {
        t.end(err);
      }
    );
});

test('getItem with simulated simple object result & opts with 1 option', t => {
  process.env.AWS_REGION = 'us-west-2';
  const context = contexts.configureStandardContext({}, undefined, require('./context-options'));

  const tableName = 'TEST_MyTestTable_DEV';
  const key = {country: 'ZA'};

  const opts = {ConsistentRead: true};

  const result = {code: 'ZA', name: 'South Africa'};

  function validateGetParams(t, params) {
    t.equal(params.TableName, tableName, `params.TableName must be ${tableName}`);
    t.equal(params.Key, key, `params.Key must be ${JSON.stringify(key)}`);
    t.equal(params.ConsistentRead, opts.ConsistentRead, `params.ConsistentRead must be ${opts.ConsistentRead}`);
  }

  context.dynamoDBDocClient = mockDynamoDBDocClient(t, 'dynamodb-utils.test', 1,
    {get: {result: result, validateArgs: validateGetParams}});

  getItem(tableName, key, opts, `country (${key.country})`, context)
    .then(
      res => {
        t.equal(res.Item, result, `res.Item must be ${JSON.stringify(result)}`);
        t.end();
      },
      err => {
        t.end(err);
      }
    );
});


test('getItem with simulated DynamoDB-style result & opts with 2 options', t => {
  process.env.AWS_REGION = 'us-west-2';
  const context = contexts.configureStandardContext({}, undefined, require('./context-options'));

  const tableName = 'TEST_MyTestTable_DEV';
  const key = {country: 'ZA'};

  const opts = {ConsistentRead: true, ReturnConsumedCapacity: 'TOTAL'};

  const result = {Item: {code: 'ZA', name: 'South Africa'}, ConsumedCapacity: {}};

  function validateGetParams(t, params) {
    t.equal(params.TableName, tableName, `params.TableName must be ${tableName}`);
    t.equal(params.Key, key, `params.Key must be ${JSON.stringify(key)}`);
    t.equal(params.ConsistentRead, opts.ConsistentRead, `params.ConsistentRead must be ${opts.ConsistentRead}`);
    t.equal(params.ReturnConsumedCapacity, opts.ReturnConsumedCapacity, `params.ReturnConsumedCapacity must be ${opts.ReturnConsumedCapacity}`);
  }

  context.dynamoDBDocClient = mockDynamoDBDocClient(t, 'dynamodb-utils.test', 1,
    {get: {result: result, validateArgs: validateGetParams}});

  getItem(tableName, key, opts, `country (${key.country})`, context)
    .then(
      res => {
        t.equal(res, result, `res must be ${JSON.stringify(result)}`);
        t.end();
      },
      err => {
        t.end(err);
      }
    );
});

test('getItem with simulated failure', t => {
  process.env.AWS_REGION = 'us-west-2';
  const context = contexts.configureStandardContext({}, undefined, require('./context-options'));

  const tableName = 'TEST_MyTestTable_DEV';
  const key = {country: 'ZA'};

  const opts = undefined;

  const fatalError = new Error('Planned DynamoDB failure');

  function validateGetParams(t, params) {
    t.equal(params.TableName, tableName, `params.TableName must be ${tableName}`);
    t.equal(params.Key, key, `params.Key must be ${JSON.stringify(key)}`);
    t.equal(params.ConsistentRead, undefined, `params.ConsistentRead must be ${undefined}`);
  }

  context.dynamoDBDocClient = mockDynamoDBDocClient(t, 'dynamodb-utils.test', 1,
    {get: {error: fatalError, validateArgs: validateGetParams}});

  getItem(tableName, key, opts, `country (${key.country})`, context)
    .then(
      res => {
        t.fail(`getItem should NOT have succeeded with result ${JSON.stringify(res)}`);
        t.end();
      },
      err => {
        t.pass(`getItem must fail with an error - ${err}`);
        t.end();
      }
    );
});

// ---------------------------------------------------------------------------------------------------------------------
// updateProjectionExpression
// ---------------------------------------------------------------------------------------------------------------------

test('updateProjectionExpression', t => {
  function check(opts, expressions, expected) {
    const before = copy(opts, deep);
    t.deepEqual(updateProjectionExpression(opts, expressions), expected, `updateProjectExpression(${JSON.stringify(before)}, ${JSON.stringify(expressions)}) must be ${JSON.stringify(expected)}`);
  }

  // Empty or non-array expressions
  check(undefined, undefined, undefined);
  check(null, undefined, null);
  check({}, undefined, {});

  check(undefined, null, undefined);
  check(null, null, null);
  check({}, null, {});

  check(undefined, [], undefined);
  check(null, [], null);
  check({}, [], {});

  let expressions = ['', '   '];
  check(undefined, expressions, {ProjectionExpression: undefined});
  check(null, expressions, {ProjectionExpression: undefined});
  check({}, expressions, {ProjectionExpression: undefined});
  check({ProjectionExpression: undefined}, expressions, {ProjectionExpression: undefined});
  check({ProjectionExpression: null}, expressions, {ProjectionExpression: undefined});
  check({ProjectionExpression: ''}, expressions, {ProjectionExpression: undefined});
  check({ProjectionExpression: '    '}, expressions, {ProjectionExpression: undefined});
  check({ProjectionExpression: '#col0'}, expressions, {ProjectionExpression: '#col0'});

  expressions = ['#col1'];
  check(undefined, expressions, {ProjectionExpression: '#col1'});
  check(null, expressions, {ProjectionExpression: '#col1'});
  check({}, expressions, {ProjectionExpression: '#col1'});
  check({ProjectionExpression: '#col1'}, expressions, {ProjectionExpression: '#col1'});
  check({ProjectionExpression: '#col0'}, expressions, {ProjectionExpression: '#col0,#col1'});

  expressions = ['col1', '#col2'];
  check(undefined, expressions, {ProjectionExpression: 'col1,#col2'});
  check(null, expressions, {ProjectionExpression: 'col1,#col2'});
  check({}, expressions, {ProjectionExpression: 'col1,#col2'});
  check({ProjectionExpression: 'col1'}, expressions, {ProjectionExpression: 'col1,#col2'});
  check({ProjectionExpression: '#col1'}, expressions, {ProjectionExpression: '#col1,col1,#col2'});
  check({ProjectionExpression: '#col0'}, expressions, {ProjectionExpression: '#col0,col1,#col2'});
  check({ProjectionExpression: 'col1,#col2'}, expressions, {ProjectionExpression: 'col1,#col2'});
  check({ProjectionExpression: '#col2,col1'}, expressions, {ProjectionExpression: '#col2,col1'});
  check({ProjectionExpression: 'col1,#col2,#col3'}, expressions, {ProjectionExpression: 'col1,#col2,#col3'});

  t.end();
});

// ---------------------------------------------------------------------------------------------------------------------
// updateExpressionAttributeNames
// ---------------------------------------------------------------------------------------------------------------------

test('updateExpressionAttributeNames', t => {
  function check(opts, expressionAttributeNames, expected) {
    const before = copy(opts, deep);
    t.deepEqual(updateExpressionAttributeNames(opts, expressionAttributeNames), expected, `updateExpressionAttributeNames(${JSON.stringify(before)}, ${JSON.stringify(expressionAttributeNames)}) must be ${JSON.stringify(expected)}`);
  }

  // Empty or non-object expression attribute names
  check(undefined, undefined, undefined);
  check(null, undefined, null);
  check({}, undefined, {});

  check(undefined, null, undefined);
  check(null, null, null);
  check({}, null, {});

  check(undefined, 123, undefined);
  check(null, '123', null);
  check({}, true, {});

  check(undefined, {'#a': 'a'}, { ExpressionAttributeNames: {'#a': 'a'}});
  check(null, {'#a': 'a'}, { ExpressionAttributeNames: {'#a': 'a'}});
  check({}, {'#a': 'a'}, { ExpressionAttributeNames: {'#a': 'a'}});
  check({ExpressionAttributeNames: {'#a': 'a'}}, {'#a': 'a'}, { ExpressionAttributeNames: {'#a': 'a'}});
  check({ExpressionAttributeNames: {'#b': 'b'}}, {'#a': 'a'}, { ExpressionAttributeNames: {'#b': 'b', '#a': 'a'}});
  check({ExpressionAttributeNames: {'#a': 'a', '#b': 'b'}}, {'#a': 'a'}, { ExpressionAttributeNames: {'#a': 'a', '#b': 'b'}});
  check({ExpressionAttributeNames: {'#a': 'a', '#b': 'b'}}, {'#c': 'c'}, { ExpressionAttributeNames: {'#a': 'a', '#b': 'b', '#c': 'c'}});
  check({ExpressionAttributeNames: {'#a': 'a', '#b': 'b'}}, {'#c': 'c', '#d': 'd'}, { ExpressionAttributeNames: {'#a': 'a', '#b': 'b', '#c': 'c', '#d': 'd'}});
  check({ExpressionAttributeNames: {'#a': 'a', '#b': 'b'}}, {'#b': 'b', '#c': 'c', '#d': 'd'}, { ExpressionAttributeNames: {'#a': 'a', '#b': 'b', '#c': 'c', '#d': 'd'}});

  t.end();
});

// ---------------------------------------------------------------------------------------------------------------------
// updateExpressionAttributeValues
// ---------------------------------------------------------------------------------------------------------------------

test('updateExpressionAttributeValues', t => {
  function check(opts, expressionAttributeValues, expected) {
    const before = copy(opts, deep);
    t.deepEqual(updateExpressionAttributeValues(opts, expressionAttributeValues), expected, `updateExpressionAttributeValues(${JSON.stringify(before)}, ${JSON.stringify(expressionAttributeValues)}) must be ${JSON.stringify(expected)}`);
  }

  // Empty or non-object expression attribute names
  check(undefined, undefined, undefined);
  check(null, undefined, null);
  check({}, undefined, {});

  check(undefined, null, undefined);
  check(null, null, null);
  check({}, null, {});

  check(undefined, 123, undefined);
  check(null, '123', null);
  check({}, true, {});

  check(undefined, {':a': 'a'}, { ExpressionAttributeValues: {':a': 'a'}});
  check(null, {':a': 'a'}, { ExpressionAttributeValues: {':a': 'a'}});
  check({}, {':a': 'a'}, { ExpressionAttributeValues: {':a': 'a'}});
  check({ExpressionAttributeValues: {':a': 'a'}}, {':a': 'a'}, { ExpressionAttributeValues: {':a': 'a'}});
  check({ExpressionAttributeValues: {':b': 'b'}}, {':a': 'a'}, { ExpressionAttributeValues: {':b': 'b', ':a': 'a'}});
  check({ExpressionAttributeValues: {':a': 'a', ':b': 'b'}}, {':a': 'a'}, { ExpressionAttributeValues: {':a': 'a', ':b': 'b'}});
  check({ExpressionAttributeValues: {':a': 'a', ':b': 'b'}}, {':c': 'c'}, { ExpressionAttributeValues: {':a': 'a', ':b': 'b', ':c': 'c'}});
  check({ExpressionAttributeValues: {':a': 'a', ':b': 'b'}}, {':c': 'c', ':d': 'd'}, { ExpressionAttributeValues: {':a': 'a', ':b': 'b', ':c': 'c', ':d': 'd'}});
  check({ExpressionAttributeValues: {':a': 'a', ':b': 'b'}}, {':b': 'b', ':c': 'c', ':d': 'd'}, { ExpressionAttributeValues: {':a': 'a', ':b': 'b', ':c': 'c', ':d': 'd'}});

  t.end();
});