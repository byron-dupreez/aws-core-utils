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

const contexts = require('../contexts');

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
    {get: {result: result, validateParams: validateGetParams}});

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
    {get: {result: result, validateParams: validateGetParams}});

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
    {get: {result: result, validateParams: validateGetParams}});

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
    {get: {error: fatalError, validateParams: validateGetParams}});

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