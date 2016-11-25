'use strict';

/**
 * Unit tests for aws-core-utils/kinesis-cache.js
 * @author Byron du Preez
 */

const test = require("tape");

// The test subject
const kinesisCache = require('../kinesis-cache');
const setKinesis = kinesisCache.setKinesis;
const getKinesis = kinesisCache.getKinesis;
const deleteKinesis = kinesisCache.deleteKinesis;
const configureKinesis = kinesisCache.configureKinesis;

const regions = require('../regions');
const getRegion = regions.getRegion;
// const getRegionRaw = regions.ONLY_FOR_TESTING.getRegionRaw;
// const getDefaultRegion = regions.getDefaultRegion;
// const resolveRegion = regions.resolveRegion;
// const setRegionIfNotSet = regions.ONLY_FOR_TESTING.setRegionIfNotSet;

const logging = require('logging-utils');

const Strings = require('core-functions/strings');
const stringify = Strings.stringify;
// const isBlank = Strings.isBlank;
// const isNotBlank = Strings.isNotBlank;
// const trim = Strings.trim;
// const trimOrEmpty = Strings.trimOrEmpty;

// =====================================================================================================================
// Tests for setKinesis and getKinesis
// =====================================================================================================================

test('setKinesis and getKinesis', t => {
  const context = {};
  logging.configureLogging(context, logging.TRACE);

  // Set current region
  process.env.AWS_REGION = 'us-west-1';
  const region1 = getRegion();
  t.equal(region1, 'us-west-1', `current region must be us-west-1`);
  deleteKinesis(region1); // make sure none before we start

  t.notOk(getKinesis(), `getKinesis() kinesis instance must not be cached yet`);
  t.notOk(getKinesis(region1), `getKinesis(${region1}) kinesis instance must not be cached yet`);


  // Cache new kinesis for current region
  const options0 = {};
  const kinesis0 = setKinesis(options0, context);

  t.ok(kinesis0, `setKinesis(${stringify(options0)}) must return an instance`);
  t.equal(kinesis0.config.region, region1, `kinesis 0 region must be ${region1}`);
  t.equal(kinesis0.config.maxRetries, undefined, `kinesis 0 maxRetries (${kinesis0.config.maxRetries}) must be undefined`);

  t.equal(getKinesis(), kinesis0, `getKinesis() gets cached instance for current region (${region1})`);
  t.equal(getKinesis(region1), kinesis0, `getKinesis(${region1}) gets cached instance`);


  // Re-use cached kinesis for options with explicit region same as current
  const options1 = { region: region1 }; //, maxRetries: 0 };
  const kinesis1 = setKinesis(options1, context);

  t.ok(kinesis1, `setKinesis(${stringify(options1)}) must return an instance`);
  t.equal(kinesis1.config.region, region1, `kinesis 1 region must be ${region1}`);
  t.equal(kinesis1.config.maxRetries, undefined, `kinesis 1 maxRetries must be undefined`);
  t.equal(kinesis1, kinesis0, `setKinesis(${stringify(options1)}) must re-use cached instance 0 with same options`);

  t.equal(getKinesis(), kinesis0, `getKinesis() gets cached instance 0 for current region (${region1})`);
  t.equal(getKinesis(region1), kinesis0, `getKinesis(${region1}) gets cached instance 0`);


  // Force replacement of cached instance when options differ
  const maxRetries2 = 0; //kinesis1.config.maxRetries ? kinesis1.config.maxRetries * 2;
  const options2 = { region: region1, maxRetries: maxRetries2 };
  const kinesis2 = setKinesis(options2, context);

  t.ok(kinesis2, `setKinesis(${stringify(options2)}) must return an instance`);
  t.equal(kinesis2.config.region, region1, `kinesis 2 region must be ${region1}`);
  t.equal(kinesis2.config.maxRetries, maxRetries2, `kinesis 2 maxRetries must be ${maxRetries2}`);
  t.notEqual(kinesis2, kinesis0, `setKinesis(${stringify(options2)}) must replace incompatible cached instance 0`);

  t.equal(getKinesis(), kinesis2, `getKinesis() gets cached instance 2 for current region (${region1})`);
  t.equal(getKinesis(region1), kinesis2, `getKinesis(${region1}) gets cached instance 2`);


  // Re-use newly cached instance when options same, but diff sequence
  const maxRetries3 = 0;
  const options3 = { maxRetries: maxRetries3, region: region1 };
  const kinesis3 = setKinesis(options3, context);

  t.ok(kinesis3, `setKinesis(${stringify(options3)}) must return an instance`);
  t.equal(kinesis3.config.region, region1, `kinesis 3 region must be ${region1}`);
  t.equal(kinesis3.config.maxRetries, maxRetries3, `kinesis 3 maxRetries must be ${maxRetries3}`);
  t.equal(kinesis3, kinesis2, `setKinesis(${stringify(options3)}) must re-use cached instance 2 with re-ordered options`);

  t.equal(getKinesis(), kinesis2, `getKinesis() gets cached instance 2 for current region (${region1})`);
  t.equal(getKinesis(region1), kinesis2, `getKinesis(${region1}) gets cached instance 2`);


  // Change to using a different region, which will cache a new kinesis instance under new region
  const region2 = 'us-west-2';
  deleteKinesis(region2); // make sure none before we start
  t.notOk(getKinesis(region2), `getKinesis(${region2}) kinesis instance must not be cached yet`);
  t.equal(getKinesis(), kinesis2, `getKinesis() still gets cached instance 2 for current region (${region1})`);

  // Cache a new kinesis instance for the different region
  const maxRetries4 = 0;
  const options4 = { region: region2, maxRetries: maxRetries4 };
  const kinesis4 = setKinesis(options4, context);

  t.ok(kinesis4, `setKinesis(${stringify(options4)}) must return an instance`);
  t.equal(kinesis4.config.region, region2, `kinesis 4 region must be ${region2}`);
  t.equal(kinesis4.config.maxRetries, maxRetries4, `kinesis 4 maxRetries must be ${maxRetries4}`);
  t.notEqual(kinesis4, kinesis2, `setKinesis(${stringify(options4)}) must NOT be cached instance 2 for region (${region1})`);

  t.equal(getKinesis(region2), kinesis4, `getKinesis(${region2}) gets cached instance 4`);

  // Check cache for current region 1 is still intact
  t.equal(getKinesis(), kinesis2, `getKinesis() still gets cached instance 2 for current region (${region1})`);
  t.equal(getKinesis(region1), kinesis2, `getKinesis(${region1}) gets cached instance 2`);



  // Do NOT re-use new kinesis instance for the different region if maxRetries is undefined instead of zero
  const maxRetries5 = '';
  const options5 = { region: region2, maxRetries: maxRetries5 };
  const kinesis5 = setKinesis(options5, context);

  t.ok(kinesis5, `setKinesis(${stringify(options5)}) must return an instance`);
  t.equal(kinesis5.config.region, region2, `kinesis 5 region must be ${region2}`);
  t.equal(kinesis5.config.maxRetries, maxRetries5, `kinesis 5 maxRetries must be ${maxRetries5}`);
  t.notEqual(kinesis5, kinesis4, `setKinesis(${stringify(options5)}) must NOT be cached instance 4 for region (${region2})`);



  // Delete cache for region 1
  t.ok(deleteKinesis(region1), `must delete cached instance for region (${region1})`); // clean up
  t.equal(getKinesis(region1), undefined, `getKinesis(${region1}) gets undefined after delete`);

  // Delete cache for region 1
  t.ok(deleteKinesis(region2), `must delete cached instance for region (${region2})`); // clean up
  t.equal(getKinesis(region2), undefined, `getKinesis(${region2}) gets undefined after delete`);

  t.end();
});

// =====================================================================================================================
// Tests for configureKinesis
// =====================================================================================================================

test('configureKinesis', t => {
  const context = {};
  logging.configureLogging(context, logging.DEBUG);

  process.env.AWS_REGION = 'us-west-1';
  const region1 = getRegion();
  t.equal(region1, 'us-west-1', `current region must be us-west-1`);

  // Ensure not cached before we configure
  deleteKinesis(region1);

  t.notOk(context.kinesis, 'context.kinesis must not be configured yet');

  // Configure it for the first time
  const maxRetries1 = 0;

  configureKinesis(context, {maxRetries: maxRetries1});
  const kinesis1 = context.kinesis;

  t.ok(kinesis1, 'context.kinesis 1 must be configured now');
  t.equal(kinesis1.config.region, region1, `context.kinesis 1 region must be ${region1}`);
  t.equal(kinesis1.config.maxRetries, maxRetries1, `context.kinesis 1 maxRetries must be ${maxRetries1}`);

  // "Configure" it for the second time with same region & maxRetries (should give same kinesis instance back again)
  context.kinesis = undefined; // clear context.kinesis otherwise will always get it back

  configureKinesis(context, {region: region1, maxRetries: maxRetries1});
  const kinesis1a = context.kinesis;

  t.ok(kinesis1a, 'context.kinesis 1a must be configured');
  t.equal(kinesis1a, kinesis1, 'context.kinesis 1a must be cached instance 1');
  t.equal(kinesis1a.config.region, region1, `context.kinesis 1a region must be ${region1}`);
  t.equal(kinesis1a.config.maxRetries, maxRetries1, `context.kinesis 1a maxRetries must be ${maxRetries1}`);

  // Configure a new kinesis with a different maxRetries
  const maxRetries2 = 10;
  context.kinesis = undefined; // clear context.kinesis otherwise will always get it back

  configureKinesis(context, {maxRetries: maxRetries2});
  const kinesis2 = context.kinesis;

  t.ok(kinesis2, 'context.kinesis 2 must be configured');
  t.equal(kinesis2.config.region, region1, `context.kinesis 2 region must be ${region1}`);
  t.equal(kinesis2.config.maxRetries, maxRetries2, `context.kinesis 2 maxRetries must be ${maxRetries2}`);

  t.notEqual(kinesis2, kinesis1, 'context.kinesis 2 must not be cached instance 1');

  // Configure same again, should hit context "cache"
  configureKinesis(context, {maxRetries: maxRetries2, region: region1});
  const kinesis2a = context.kinesis;

  t.ok(kinesis2a, 'context.kinesis 2a must be configured');
  t.equal(kinesis2a.config.region, region1, `context.kinesis 2a region must be ${region1}`);
  t.equal(kinesis2a.config.maxRetries, maxRetries2, `context.kinesis 2a maxRetries must be ${maxRetries2}`);

  t.equal(kinesis2a, kinesis2, 'context.kinesis 2a must be cached instance 2');
  t.notEqual(kinesis2a, kinesis1, 'context.kinesis 2a must not be cached instance 1');

  // Reconfigure "original" again
  context.kinesis = undefined; // clear context.kinesis otherwise will always get it back
  //deleteKinesis(region1); // make sure its gone before we start

  configureKinesis(context, {maxRetries: maxRetries1});
  const kinesis3 = context.kinesis;

  t.ok(kinesis3, 'context.kinesis 3 must be configured');
  t.equal(kinesis3.config.region, region1, `context.kinesis 3 region must be ${region1}`);
  t.equal(kinesis3.config.maxRetries, maxRetries1, `context.kinesis 3 maxRetries must be ${maxRetries1}`);

  t.notEqual(kinesis3, kinesis2, 'context.kinesis 3 must not be cached instance 2');
  t.notEqual(kinesis3, kinesis1, 'context.kinesis 3 must not be cached instance 1');

  // Change the region
  process.env.AWS_REGION = 'us-west-2';
  const region2 = getRegion();
  t.equal(region2, 'us-west-2');
  t.equal(region2, 'us-west-2', `current region must be us-west-2`);

  // Configure for new region
  context.kinesis = undefined; // clear context.kinesis otherwise will always get it back
  deleteKinesis(region2); // make sure none before we start

  configureKinesis(context, {maxRetries: maxRetries1});
  const kinesis4 = context.kinesis;

  t.ok(kinesis4, 'context.kinesis 4 must be configured');
  t.equal(kinesis4.config.region, region2, `context.kinesis 4 region must be ${region2}`);
  t.equal(kinesis4.config.maxRetries, maxRetries1, `context.kinesis 4 maxRetries must be ${maxRetries1}`);

  t.notEqual(kinesis4, kinesis3, 'context.kinesis 4 must NOT be cached instance 3');
  t.notEqual(kinesis4, kinesis2, 'context.kinesis 4 must NOT be cached instance 2');
  t.notEqual(kinesis4, kinesis1, 'context.kinesis 4 must NOT be cached instance 1');

  // Switch the region back again
  process.env.AWS_REGION = 'us-west-1';
  t.equal(getRegion(), 'us-west-1', `current region must be us-west-1`);

  // "Reconfigure" original again
  context.kinesis = undefined; // clear context.kinesis otherwise will always get it back
  configureKinesis(context, {maxRetries: maxRetries1});
  const kinesis5 = context.kinesis;

  t.ok(kinesis5, 'context.kinesis must be configured');
  t.equal(kinesis5.config.region, region1, `context.kinesis 5 region must be ${region1}`);
  t.equal(kinesis5.config.maxRetries, maxRetries1, `context.kinesis 5 maxRetries must be ${maxRetries1}`);

  t.equal(kinesis5, kinesis3, 'context.kinesis 5 must be cached instance 3');

  t.end();
});
