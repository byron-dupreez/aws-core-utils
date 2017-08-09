'use strict';

/**
 * Unit tests for aws-core-utils/lambda-cache.js
 * @author Byron du Preez
 */

const test = require("tape");

// The test subject
const lambdaCache = require('../lambda-cache');
const setLambda = lambdaCache.setLambda;
const getLambda = lambdaCache.getLambda;
const deleteLambda = lambdaCache.deleteLambda;
const configureLambda = lambdaCache.configureLambda;

const regions = require('../regions');
const getRegion = regions.getRegion;

const logging = require('logging-utils');
const LogLevel = logging.LogLevel;

const Strings = require('core-functions/strings');
const stringify = Strings.stringify;

// =====================================================================================================================
// Tests for setLambda and getLambda
// =====================================================================================================================

test('setLambda and getLambda', t => {
  const context = {};
  logging.configureLogging(context, {logLevel: LogLevel.TRACE});

  // Set current region
  process.env.AWS_REGION = 'us-west-1';
  const region1 = getRegion();
  t.equal(region1, 'us-west-1', `current region must be us-west-1`);
  deleteLambda(region1); // make sure none before we start

  t.notOk(getLambda(), `getLambda() lambda instance must not be cached yet`);
  t.notOk(getLambda(region1), `getLambda(${region1}) lambda instance must not be cached yet`);


  // Cache new lambda for current region
  const options0 = {};
  const lambda0 = setLambda(options0, context);

  t.ok(lambda0, `setLambda(${stringify(options0)}) must return an instance`);
  t.equal(lambda0.config.region, region1, `lambda 0 region must be ${region1}`);
  t.equal(lambda0.config.maxRetries, undefined, `lambda 0 maxRetries (${lambda0.config.maxRetries}) must be undefined`);

  t.equal(getLambda(), lambda0, `getLambda() gets cached instance for current region (${region1})`);
  t.equal(getLambda(region1), lambda0, `getLambda(${region1}) gets cached instance`);


  // Re-use cached lambda for options with explicit region same as current
  const options1 = { region: region1 }; //, maxRetries: 0 };
  const lambda1 = setLambda(options1, context);

  t.ok(lambda1, `setLambda(${stringify(options1)}) must return an instance`);
  t.equal(lambda1.config.region, region1, `lambda 1 region must be ${region1}`);
  t.equal(lambda1.config.maxRetries, undefined, `lambda 1 maxRetries must be undefined`);
  t.equal(lambda1, lambda0, `setLambda(${stringify(options1)}) must re-use cached instance 0 with same options`);

  t.equal(getLambda(), lambda0, `getLambda() gets cached instance 0 for current region (${region1})`);
  t.equal(getLambda(region1), lambda0, `getLambda(${region1}) gets cached instance 0`);


  // Force replacement of cached instance when options differ
  const maxRetries2 = 0; //lambda1.config.maxRetries ? lambda1.config.maxRetries * 2;
  const options2 = { region: region1, maxRetries: maxRetries2 };
  const lambda2 = setLambda(options2, context);

  t.ok(lambda2, `setLambda(${stringify(options2)}) must return an instance`);
  t.equal(lambda2.config.region, region1, `lambda 2 region must be ${region1}`);
  t.equal(lambda2.config.maxRetries, maxRetries2, `lambda 2 maxRetries must be ${maxRetries2}`);
  t.notEqual(lambda2, lambda0, `setLambda(${stringify(options2)}) must replace incompatible cached instance 0`);

  t.equal(getLambda(), lambda2, `getLambda() gets cached instance 2 for current region (${region1})`);
  t.equal(getLambda(region1), lambda2, `getLambda(${region1}) gets cached instance 2`);


  // Re-use newly cached instance when options same, but diff sequence
  const maxRetries3 = 0;
  const options3 = { maxRetries: maxRetries3, region: region1 };
  const lambda3 = setLambda(options3, context);

  t.ok(lambda3, `setLambda(${stringify(options3)}) must return an instance`);
  t.equal(lambda3.config.region, region1, `lambda 3 region must be ${region1}`);
  t.equal(lambda3.config.maxRetries, maxRetries3, `lambda 3 maxRetries must be ${maxRetries3}`);
  t.equal(lambda3, lambda2, `setLambda(${stringify(options3)}) must re-use cached instance 2 with re-ordered options`);

  t.equal(getLambda(), lambda2, `getLambda() gets cached instance 2 for current region (${region1})`);
  t.equal(getLambda(region1), lambda2, `getLambda(${region1}) gets cached instance 2`);


  // Change to using a different region, which will cache a new lambda instance under new region
  const region2 = 'us-west-2';
  deleteLambda(region2); // make sure none before we start
  t.notOk(getLambda(region2), `getLambda(${region2}) lambda instance must not be cached yet`);
  t.equal(getLambda(), lambda2, `getLambda() still gets cached instance 2 for current region (${region1})`);

  // Cache a new lambda instance for the different region
  const maxRetries4 = 0;
  const options4 = { region: region2, maxRetries: maxRetries4 };
  const lambda4 = setLambda(options4, context);

  t.ok(lambda4, `setLambda(${stringify(options4)}) must return an instance`);
  t.equal(lambda4.config.region, region2, `lambda 4 region must be ${region2}`);
  t.equal(lambda4.config.maxRetries, maxRetries4, `lambda 4 maxRetries must be ${maxRetries4}`);
  t.notEqual(lambda4, lambda2, `setLambda(${stringify(options4)}) must NOT be cached instance 2 for region (${region1})`);

  t.equal(getLambda(region2), lambda4, `getLambda(${region2}) gets cached instance 4`);

  // Check cache for current region 1 is still intact
  t.equal(getLambda(), lambda2, `getLambda() still gets cached instance 2 for current region (${region1})`);
  t.equal(getLambda(region1), lambda2, `getLambda(${region1}) gets cached instance 2`);



  // Do NOT re-use new lambda instance for the different region if maxRetries is undefined instead of zero
  const maxRetries5 = '';
  const options5 = { region: region2, maxRetries: maxRetries5 };
  const lambda5 = setLambda(options5, context);

  t.ok(lambda5, `setLambda(${stringify(options5)}) must return an instance`);
  t.equal(lambda5.config.region, region2, `lambda 5 region must be ${region2}`);
  t.equal(lambda5.config.maxRetries, maxRetries5, `lambda 5 maxRetries must be ${maxRetries5}`);
  t.notEqual(lambda5, lambda4, `setLambda(${stringify(options5)}) must NOT be cached instance 4 for region (${region2})`);



  // Delete cache for region 1
  t.ok(deleteLambda(region1), `must delete cached instance for region (${region1})`); // clean up
  t.equal(getLambda(region1), undefined, `getLambda(${region1}) gets undefined after delete`);

  // Delete cache for region 1
  t.ok(deleteLambda(region2), `must delete cached instance for region (${region2})`); // clean up
  t.equal(getLambda(region2), undefined, `getLambda(${region2}) gets undefined after delete`);

  t.end();
});

// =====================================================================================================================
// Tests for configureLambda
// =====================================================================================================================

test('configureLambda', t => {
  const context = {};
  logging.configureLogging(context, {logLevel: LogLevel.DEBUG});

  process.env.AWS_REGION = 'us-west-1';
  const region1 = getRegion();
  t.equal(region1, 'us-west-1', `current region must be us-west-1`);

  // Ensure not cached before we configure
  deleteLambda(region1);

  t.notOk(context.lambda, 'context.lambda must not be configured yet');

  // Configure it for the first time
  const maxRetries1 = 0;

  configureLambda(context, {maxRetries: maxRetries1});
  const lambda1 = context.lambda;

  t.ok(lambda1, 'context.lambda 1 must be configured now');
  t.equal(lambda1.config.region, region1, `context.lambda 1 region must be ${region1}`);
  t.equal(lambda1.config.maxRetries, maxRetries1, `context.lambda 1 maxRetries must be ${maxRetries1}`);

  // "Configure" it for the second time with same region & maxRetries (should give same lambda instance back again)
  context.lambda = undefined; // clear context.lambda otherwise will always get it back

  configureLambda(context, {region: region1, maxRetries: maxRetries1});
  const lambda1a = context.lambda;

  t.ok(lambda1a, 'context.lambda 1a must be configured');
  t.equal(lambda1a, lambda1, 'context.lambda 1a must be cached instance 1');
  t.equal(lambda1a.config.region, region1, `context.lambda 1a region must be ${region1}`);
  t.equal(lambda1a.config.maxRetries, maxRetries1, `context.lambda 1a maxRetries must be ${maxRetries1}`);

  // Configure a new lambda with a different maxRetries
  const maxRetries2 = 10;
  context.lambda = undefined; // clear context.lambda otherwise will always get it back

  configureLambda(context, {maxRetries: maxRetries2});
  const lambda2 = context.lambda;

  t.ok(lambda2, 'context.lambda 2 must be configured');
  t.equal(lambda2.config.region, region1, `context.lambda 2 region must be ${region1}`);
  t.equal(lambda2.config.maxRetries, maxRetries2, `context.lambda 2 maxRetries must be ${maxRetries2}`);

  t.notEqual(lambda2, lambda1, 'context.lambda 2 must not be cached instance 1');

  // Configure same again, should hit context "cache"
  configureLambda(context, {maxRetries: maxRetries2, region: region1});
  const lambda2a = context.lambda;

  t.ok(lambda2a, 'context.lambda 2a must be configured');
  t.equal(lambda2a.config.region, region1, `context.lambda 2a region must be ${region1}`);
  t.equal(lambda2a.config.maxRetries, maxRetries2, `context.lambda 2a maxRetries must be ${maxRetries2}`);

  t.equal(lambda2a, lambda2, 'context.lambda 2a must be cached instance 2');
  t.notEqual(lambda2a, lambda1, 'context.lambda 2a must not be cached instance 1');

  // Reconfigure "original" again
  context.lambda = undefined; // clear context.lambda otherwise will always get it back
  //deleteLambda(region1); // make sure its gone before we start

  configureLambda(context, {maxRetries: maxRetries1});
  const lambda3 = context.lambda;

  t.ok(lambda3, 'context.lambda 3 must be configured');
  t.equal(lambda3.config.region, region1, `context.lambda 3 region must be ${region1}`);
  t.equal(lambda3.config.maxRetries, maxRetries1, `context.lambda 3 maxRetries must be ${maxRetries1}`);

  t.notEqual(lambda3, lambda2, 'context.lambda 3 must not be cached instance 2');
  t.notEqual(lambda3, lambda1, 'context.lambda 3 must not be cached instance 1');

  // Change the region
  process.env.AWS_REGION = 'us-west-2';
  const region2 = getRegion();
  t.equal(region2, 'us-west-2');
  t.equal(region2, 'us-west-2', `current region must be us-west-2`);

  // Configure for new region
  context.lambda = undefined; // clear context.lambda otherwise will always get it back
  deleteLambda(region2); // make sure none before we start

  configureLambda(context, {maxRetries: maxRetries1});
  const lambda4 = context.lambda;

  t.ok(lambda4, 'context.lambda 4 must be configured');
  t.equal(lambda4.config.region, region2, `context.lambda 4 region must be ${region2}`);
  t.equal(lambda4.config.maxRetries, maxRetries1, `context.lambda 4 maxRetries must be ${maxRetries1}`);

  t.notEqual(lambda4, lambda3, 'context.lambda 4 must NOT be cached instance 3');
  t.notEqual(lambda4, lambda2, 'context.lambda 4 must NOT be cached instance 2');
  t.notEqual(lambda4, lambda1, 'context.lambda 4 must NOT be cached instance 1');

  // Switch the region back again
  process.env.AWS_REGION = 'us-west-1';
  t.equal(getRegion(), 'us-west-1', `current region must be us-west-1`);

  // "Reconfigure" original again
  context.lambda = undefined; // clear context.lambda otherwise will always get it back
  configureLambda(context, {maxRetries: maxRetries1});
  const lambda5 = context.lambda;

  t.ok(lambda5, 'context.lambda must be configured');
  t.equal(lambda5.config.region, region1, `context.lambda 5 region must be ${region1}`);
  t.equal(lambda5.config.maxRetries, maxRetries1, `context.lambda 5 maxRetries must be ${maxRetries1}`);

  t.equal(lambda5, lambda3, 'context.lambda 5 must be cached instance 3');

  t.end();
});
