'use strict';

/**
 * Unit tests for aws-core-utils/dynamodb-doc-client-cache.js
 * @author Byron du Preez
 */

const test = require("tape");

// The test subject
const dynamoDBDocClientCache = require('../dynamodb-doc-client-cache');
const setDynamoDBDocClient = dynamoDBDocClientCache.setDynamoDBDocClient;
const getDynamoDBDocClient = dynamoDBDocClientCache.getDynamoDBDocClient;
const deleteDynamoDBDocClient = dynamoDBDocClientCache.deleteDynamoDBDocClient;
const configureDynamoDBDocClient = dynamoDBDocClientCache.configureDynamoDBDocClient;

const regions = require('../regions');
const getRegion = regions.getRegion;

const logging = require('logging-utils');
const LogLevel = logging.LogLevel;

const Strings = require('core-functions/strings');
const stringify = Strings.stringify;

// =====================================================================================================================
// Tests for setDynamoDBDocClient and getDynamoDBDocClient
// =====================================================================================================================

test('setDynamoDBDocClient and getDynamoDBDocClient', t => {
  const context = {};
  logging.configureLogging(context, {logLevel: LogLevel.TRACE});

  // Set current region
  process.env.AWS_REGION = 'us-west-1';
  const region1 = getRegion();
  t.equal(region1, 'us-west-1', `current region must be us-west-1`);
  deleteDynamoDBDocClient(region1); // make sure none before we start

  t.notOk(getDynamoDBDocClient(), `getDynamoDBDocClient() dynamoDBDocClient instance must not be cached yet`);
  t.notOk(getDynamoDBDocClient(region1), `getDynamoDBDocClient(${region1}) dynamoDBDocClient instance must not be cached yet`);


  // Cache new dynamoDBDocClient for current region
  const options0 = {};
  const dynamoDBDocClient0 = setDynamoDBDocClient(options0, context);

  t.ok(dynamoDBDocClient0, `setDynamoDBDocClient(${stringify(options0)}) must return an instance`);
  t.equal(dynamoDBDocClient0.service.config.region, region1, `dynamoDBDocClient 0 region must be ${region1}`);
  t.equal(dynamoDBDocClient0.service.config.maxRetries, undefined, `dynamoDBDocClient 0 maxRetries (${dynamoDBDocClient0.service.config.maxRetries}) must be undefined`);

  t.equal(getDynamoDBDocClient(), dynamoDBDocClient0, `getDynamoDBDocClient() gets cached instance for current region (${region1})`);
  t.equal(getDynamoDBDocClient(region1), dynamoDBDocClient0, `getDynamoDBDocClient(${region1}) gets cached instance`);


  // Re-use cached dynamoDBDocClient for options with explicit region same as current
  const options1 = { region: region1 }; //, maxRetries: 0 };
  const dynamoDBDocClient1 = setDynamoDBDocClient(options1, context);

  t.ok(dynamoDBDocClient1, `setDynamoDBDocClient(${stringify(options1)}) must return an instance`);
  t.equal(dynamoDBDocClient1.service.config.region, region1, `dynamoDBDocClient 1 region must be ${region1}`);
  t.equal(dynamoDBDocClient1.service.config.maxRetries, undefined, `dynamoDBDocClient 1 maxRetries must be undefined`);
  t.equal(dynamoDBDocClient1, dynamoDBDocClient0, `setDynamoDBDocClient(${stringify(options1)}) must re-use cached instance 0 with same options`);

  t.equal(getDynamoDBDocClient(), dynamoDBDocClient0, `getDynamoDBDocClient() gets cached instance 0 for current region (${region1})`);
  t.equal(getDynamoDBDocClient(region1), dynamoDBDocClient0, `getDynamoDBDocClient(${region1}) gets cached instance 0`);


  // Force replacement of cached instance when options differ
  const maxRetries2 = 0; //dynamoDBDocClient1.service.config.maxRetries ? dynamoDBDocClient1.service.config.maxRetries * 2;
  const options2 = { region: region1, maxRetries: maxRetries2 };
  const dynamoDBDocClient2 = setDynamoDBDocClient(options2, context);

  t.ok(dynamoDBDocClient2, `setDynamoDBDocClient(${stringify(options2)}) must return an instance`);
  t.equal(dynamoDBDocClient2.service.config.region, region1, `dynamoDBDocClient 2 region must be ${region1}`);
  t.equal(dynamoDBDocClient2.service.config.maxRetries, maxRetries2, `dynamoDBDocClient 2 maxRetries must be ${maxRetries2}`);
  t.notEqual(dynamoDBDocClient2, dynamoDBDocClient0, `setDynamoDBDocClient(${stringify(options2)}) must replace incompatible cached instance 0`);

  t.equal(getDynamoDBDocClient(), dynamoDBDocClient2, `getDynamoDBDocClient() gets cached instance 2 for current region (${region1})`);
  t.equal(getDynamoDBDocClient(region1), dynamoDBDocClient2, `getDynamoDBDocClient(${region1}) gets cached instance 2`);


  // Re-use newly cached instance when options same, but diff sequence
  const maxRetries3 = 0;
  const options3 = { maxRetries: maxRetries3, region: region1 };
  const dynamoDBDocClient3 = setDynamoDBDocClient(options3, context);

  t.ok(dynamoDBDocClient3, `setDynamoDBDocClient(${stringify(options3)}) must return an instance`);
  t.equal(dynamoDBDocClient3.service.config.region, region1, `dynamoDBDocClient 3 region must be ${region1}`);
  t.equal(dynamoDBDocClient3.service.config.maxRetries, maxRetries3, `dynamoDBDocClient 3 maxRetries must be ${maxRetries3}`);
  t.equal(dynamoDBDocClient3, dynamoDBDocClient2, `setDynamoDBDocClient(${stringify(options3)}) must re-use cached instance 2 with re-ordered options`);

  t.equal(getDynamoDBDocClient(), dynamoDBDocClient2, `getDynamoDBDocClient() gets cached instance 2 for current region (${region1})`);
  t.equal(getDynamoDBDocClient(region1), dynamoDBDocClient2, `getDynamoDBDocClient(${region1}) gets cached instance 2`);


  // Change to using a different region, which will cache a new dynamoDBDocClient instance under new region
  const region2 = 'us-west-2';
  deleteDynamoDBDocClient(region2); // make sure none before we start
  t.notOk(getDynamoDBDocClient(region2), `getDynamoDBDocClient(${region2}) dynamoDBDocClient instance must not be cached yet`);
  t.equal(getDynamoDBDocClient(), dynamoDBDocClient2, `getDynamoDBDocClient() still gets cached instance 2 for current region (${region1})`);

  // Cache a new dynamoDBDocClient instance for the different region
  const maxRetries4 = 0;
  const options4 = { region: region2, maxRetries: maxRetries4 };
  const dynamoDBDocClient4 = setDynamoDBDocClient(options4, context);

  t.ok(dynamoDBDocClient4, `setDynamoDBDocClient(${stringify(options4)}) must return an instance`);
  t.equal(dynamoDBDocClient4.service.config.region, region2, `dynamoDBDocClient 4 region must be ${region2}`);
  t.equal(dynamoDBDocClient4.service.config.maxRetries, maxRetries4, `dynamoDBDocClient 4 maxRetries must be ${maxRetries4}`);
  t.notEqual(dynamoDBDocClient4, dynamoDBDocClient2, `setDynamoDBDocClient(${stringify(options4)}) must NOT be cached instance 2 for region (${region1})`);

  t.equal(getDynamoDBDocClient(region2), dynamoDBDocClient4, `getDynamoDBDocClient(${region2}) gets cached instance 4`);

  // Check cache for current region 1 is still intact
  t.equal(getDynamoDBDocClient(), dynamoDBDocClient2, `getDynamoDBDocClient() still gets cached instance 2 for current region (${region1})`);
  t.equal(getDynamoDBDocClient(region1), dynamoDBDocClient2, `getDynamoDBDocClient(${region1}) gets cached instance 2`);



  // Do NOT re-use new dynamoDBDocClient instance for the different region if maxRetries is undefined instead of zero
  const maxRetries5 = '';
  const options5 = { region: region2, maxRetries: maxRetries5 };
  const dynamoDBDocClient5 = setDynamoDBDocClient(options5, context);

  t.ok(dynamoDBDocClient5, `setDynamoDBDocClient(${stringify(options5)}) must return an instance`);
  t.equal(dynamoDBDocClient5.service.config.region, region2, `dynamoDBDocClient 5 region must be ${region2}`);
  t.equal(dynamoDBDocClient5.service.config.maxRetries, maxRetries5, `dynamoDBDocClient 5 maxRetries must be ${maxRetries5}`);
  t.notEqual(dynamoDBDocClient5, dynamoDBDocClient4, `setDynamoDBDocClient(${stringify(options5)}) must NOT be cached instance 4 for region (${region2})`);



  // Delete cache for region 1
  t.ok(deleteDynamoDBDocClient(region1), `must delete cached instance for region (${region1})`); // clean up
  t.equal(getDynamoDBDocClient(region1), undefined, `getDynamoDBDocClient(${region1}) gets undefined after delete`);

  // Delete cache for region 1
  t.ok(deleteDynamoDBDocClient(region2), `must delete cached instance for region (${region2})`); // clean up
  t.equal(getDynamoDBDocClient(region2), undefined, `getDynamoDBDocClient(${region2}) gets undefined after delete`);

  t.end();
});

// =====================================================================================================================
// Tests for configureDynamoDBDocClient
// =====================================================================================================================

test('configureDynamoDBDocClient', t => {
  const context = {};
  logging.configureLogging(context, {logLevel: LogLevel.DEBUG});

  process.env.AWS_REGION = 'us-west-1';
  const region1 = getRegion();
  t.equal(region1, 'us-west-1', `current region must be us-west-1`);

  // Ensure not cached before we configure
  deleteDynamoDBDocClient(region1);

  t.notOk(context.dynamoDBDocClient, 'context.dynamoDBDocClient must not be configured yet');

  // Configure it for the first time
  const maxRetries1 = 0;

  configureDynamoDBDocClient(context, {maxRetries: maxRetries1});
  const dynamoDBDocClient1 = context.dynamoDBDocClient;

  t.ok(dynamoDBDocClient1, 'context.dynamoDBDocClient 1 must be configured now');
  t.equal(dynamoDBDocClient1.service.config.region, region1, `context.dynamoDBDocClient 1 region must be ${region1}`);
  t.equal(dynamoDBDocClient1.service.config.maxRetries, maxRetries1, `context.dynamoDBDocClient 1 maxRetries must be ${maxRetries1}`);

  // "Configure" it for the second time with same region & maxRetries (should give same dynamoDBDocClient instance back again)
  context.dynamoDBDocClient = undefined; // clear context.dynamoDBDocClient otherwise will always get it back

  configureDynamoDBDocClient(context, {region: region1, maxRetries: maxRetries1});
  const dynamoDBDocClient1a = context.dynamoDBDocClient;

  t.ok(dynamoDBDocClient1a, 'context.dynamoDBDocClient 1a must be configured');
  t.equal(dynamoDBDocClient1a, dynamoDBDocClient1, 'context.dynamoDBDocClient 1a must be cached instance 1');
  t.equal(dynamoDBDocClient1a.service.config.region, region1, `context.dynamoDBDocClient 1a region must be ${region1}`);
  t.equal(dynamoDBDocClient1a.service.config.maxRetries, maxRetries1, `context.dynamoDBDocClient 1a maxRetries must be ${maxRetries1}`);

  // Configure a new dynamoDBDocClient with a different maxRetries
  const maxRetries2 = 10;
  context.dynamoDBDocClient = undefined; // clear context.dynamoDBDocClient otherwise will always get it back

  configureDynamoDBDocClient(context, {maxRetries: maxRetries2});
  const dynamoDBDocClient2 = context.dynamoDBDocClient;

  t.ok(dynamoDBDocClient2, 'context.dynamoDBDocClient 2 must be configured');
  t.equal(dynamoDBDocClient2.service.config.region, region1, `context.dynamoDBDocClient 2 region must be ${region1}`);
  t.equal(dynamoDBDocClient2.service.config.maxRetries, maxRetries2, `context.dynamoDBDocClient 2 maxRetries must be ${maxRetries2}`);

  t.notEqual(dynamoDBDocClient2, dynamoDBDocClient1, 'context.dynamoDBDocClient 2 must not be cached instance 1');

  // Configure same again, should hit context "cache"
  configureDynamoDBDocClient(context, {maxRetries: maxRetries2, region: region1});
  const dynamoDBDocClient2a = context.dynamoDBDocClient;

  t.ok(dynamoDBDocClient2a, 'context.dynamoDBDocClient 2a must be configured');
  t.equal(dynamoDBDocClient2a.service.config.region, region1, `context.dynamoDBDocClient 2a region must be ${region1}`);
  t.equal(dynamoDBDocClient2a.service.config.maxRetries, maxRetries2, `context.dynamoDBDocClient 2a maxRetries must be ${maxRetries2}`);

  t.equal(dynamoDBDocClient2a, dynamoDBDocClient2, 'context.dynamoDBDocClient 2a must be cached instance 2');
  t.notEqual(dynamoDBDocClient2a, dynamoDBDocClient1, 'context.dynamoDBDocClient 2a must not be cached instance 1');

  // Reconfigure "original" again
  context.dynamoDBDocClient = undefined; // clear context.dynamoDBDocClient otherwise will always get it back
  //deleteDynamoDBDocClient(region1); // make sure its gone before we start

  configureDynamoDBDocClient(context, {maxRetries: maxRetries1});
  const dynamoDBDocClient3 = context.dynamoDBDocClient;

  t.ok(dynamoDBDocClient3, 'context.dynamoDBDocClient 3 must be configured');
  t.equal(dynamoDBDocClient3.service.config.region, region1, `context.dynamoDBDocClient 3 region must be ${region1}`);
  t.equal(dynamoDBDocClient3.service.config.maxRetries, maxRetries1, `context.dynamoDBDocClient 3 maxRetries must be ${maxRetries1}`);

  t.notEqual(dynamoDBDocClient3, dynamoDBDocClient2, 'context.dynamoDBDocClient 3 must not be cached instance 2');
  t.notEqual(dynamoDBDocClient3, dynamoDBDocClient1, 'context.dynamoDBDocClient 3 must not be cached instance 1');

  // Change the region
  process.env.AWS_REGION = 'us-west-2';
  const region2 = getRegion();
  t.equal(region2, 'us-west-2');
  t.equal(region2, 'us-west-2', `current region must be us-west-2`);

  // Configure for new region
  context.dynamoDBDocClient = undefined; // clear context.dynamoDBDocClient otherwise will always get it back
  deleteDynamoDBDocClient(region2); // make sure none before we start

  configureDynamoDBDocClient(context, {maxRetries: maxRetries1});
  const dynamoDBDocClient4 = context.dynamoDBDocClient;

  t.ok(dynamoDBDocClient4, 'context.dynamoDBDocClient 4 must be configured');
  t.equal(dynamoDBDocClient4.service.config.region, region2, `context.dynamoDBDocClient 4 region must be ${region2}`);
  t.equal(dynamoDBDocClient4.service.config.maxRetries, maxRetries1, `context.dynamoDBDocClient 4 maxRetries must be ${maxRetries1}`);

  t.notEqual(dynamoDBDocClient4, dynamoDBDocClient3, 'context.dynamoDBDocClient 4 must NOT be cached instance 3');
  t.notEqual(dynamoDBDocClient4, dynamoDBDocClient2, 'context.dynamoDBDocClient 4 must NOT be cached instance 2');
  t.notEqual(dynamoDBDocClient4, dynamoDBDocClient1, 'context.dynamoDBDocClient 4 must NOT be cached instance 1');

  // Switch the region back again
  process.env.AWS_REGION = 'us-west-1';
  t.equal(getRegion(), 'us-west-1', `current region must be us-west-1`);

  // "Reconfigure" original again
  context.dynamoDBDocClient = undefined; // clear context.dynamoDBDocClient otherwise will always get it back
  configureDynamoDBDocClient(context, {maxRetries: maxRetries1});
  const dynamoDBDocClient5 = context.dynamoDBDocClient;

  t.ok(dynamoDBDocClient5, 'context.dynamoDBDocClient must be configured');
  t.equal(dynamoDBDocClient5.service.config.region, region1, `context.dynamoDBDocClient 5 region must be ${region1}`);
  t.equal(dynamoDBDocClient5.service.config.maxRetries, maxRetries1, `context.dynamoDBDocClient 5 maxRetries must be ${maxRetries1}`);

  t.equal(dynamoDBDocClient5, dynamoDBDocClient3, 'context.dynamoDBDocClient 5 must be cached instance 3');

  t.end();
});
