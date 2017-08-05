'use strict';

/**
 * Unit tests for aws-core-utils/kms-cache.js
 * @author Byron du Preez
 */

const test = require("tape");

// The test subject
const kmsCache = require('../kms-cache');
const setKMS = kmsCache.setKMS;
const getKMS = kmsCache.getKMS;
const deleteKMS = kmsCache.deleteKMS;
const configureKMS = kmsCache.configureKMS;

const regions = require('../regions');
const getRegion = regions.getRegion;
// const getRegionRaw = regions.ONLY_FOR_TESTING.getRegionRaw;
// const getDefaultRegion = regions.getDefaultRegion;
// const resolveRegion = regions.resolveRegion;
// const setRegionIfNotSet = regions.ONLY_FOR_TESTING.setRegionIfNotSet;

const logging = require('logging-utils');
const LogLevel = logging.LogLevel;

const Strings = require('core-functions/strings');
const stringify = Strings.stringify;
// const isBlank = Strings.isBlank;
// const isNotBlank = Strings.isNotBlank;
// const trim = Strings.trim;
// const trimOrEmpty = Strings.trimOrEmpty;

// =====================================================================================================================
// Tests for setKMS and getKMS
// =====================================================================================================================

test('setKMS and getKMS', t => {
  const context = {};
  logging.configureLogging(context, {logLevel: LogLevel.TRACE});

  // Set current region
  process.env.AWS_REGION = 'us-west-1';
  const region1 = getRegion();
  t.equal(region1, 'us-west-1', `current region must be us-west-1`);
  deleteKMS(region1); // make sure none before we start

  t.notOk(getKMS(), `getKMS() kms instance must not be cached yet`);
  t.notOk(getKMS(region1), `getKMS(${region1}) kms instance must not be cached yet`);


  // Cache new kms for current region
  const options0 = {};
  const kms0 = setKMS(options0, context);

  t.ok(kms0, `setKMS(${stringify(options0)}) must return an instance`);
  t.equal(kms0.config.region, region1, `kms 0 region must be ${region1}`);
  t.equal(kms0.config.maxRetries, undefined, `kms 0 maxRetries (${kms0.config.maxRetries}) must be undefined`);

  t.equal(getKMS(), kms0, `getKMS() gets cached instance for current region (${region1})`);
  t.equal(getKMS(region1), kms0, `getKMS(${region1}) gets cached instance`);


  // Re-use cached kms for options with explicit region same as current
  const options1 = { region: region1 }; //, maxRetries: 0 };
  const kms1 = setKMS(options1, context);

  t.ok(kms1, `setKMS(${stringify(options1)}) must return an instance`);
  t.equal(kms1.config.region, region1, `kms 1 region must be ${region1}`);
  t.equal(kms1.config.maxRetries, undefined, `kms 1 maxRetries must be undefined`);
  t.equal(kms1, kms0, `setKMS(${stringify(options1)}) must re-use cached instance 0 with same options`);

  t.equal(getKMS(), kms0, `getKMS() gets cached instance 0 for current region (${region1})`);
  t.equal(getKMS(region1), kms0, `getKMS(${region1}) gets cached instance 0`);


  // Force replacement of cached instance when options differ
  const maxRetries2 = 0; //kms1.config.maxRetries ? kms1.config.maxRetries * 2;
  const options2 = { region: region1, maxRetries: maxRetries2 };
  const kms2 = setKMS(options2, context);

  t.ok(kms2, `setKMS(${stringify(options2)}) must return an instance`);
  t.equal(kms2.config.region, region1, `kms 2 region must be ${region1}`);
  t.equal(kms2.config.maxRetries, maxRetries2, `kms 2 maxRetries must be ${maxRetries2}`);
  t.notEqual(kms2, kms0, `setKMS(${stringify(options2)}) must replace incompatible cached instance 0`);

  t.equal(getKMS(), kms2, `getKMS() gets cached instance 2 for current region (${region1})`);
  t.equal(getKMS(region1), kms2, `getKMS(${region1}) gets cached instance 2`);


  // Re-use newly cached instance when options same, but diff sequence
  const maxRetries3 = 0;
  const options3 = { maxRetries: maxRetries3, region: region1 };
  const kms3 = setKMS(options3, context);

  t.ok(kms3, `setKMS(${stringify(options3)}) must return an instance`);
  t.equal(kms3.config.region, region1, `kms 3 region must be ${region1}`);
  t.equal(kms3.config.maxRetries, maxRetries3, `kms 3 maxRetries must be ${maxRetries3}`);
  t.equal(kms3, kms2, `setKMS(${stringify(options3)}) must re-use cached instance 2 with re-ordered options`);

  t.equal(getKMS(), kms2, `getKMS() gets cached instance 2 for current region (${region1})`);
  t.equal(getKMS(region1), kms2, `getKMS(${region1}) gets cached instance 2`);


  // Change to using a different region, which will cache a new kms instance under new region
  const region2 = 'us-west-2';
  deleteKMS(region2); // make sure none before we start
  t.notOk(getKMS(region2), `getKMS(${region2}) kms instance must not be cached yet`);
  t.equal(getKMS(), kms2, `getKMS() still gets cached instance 2 for current region (${region1})`);

  // Cache a new kms instance for the different region
  const maxRetries4 = 0;
  const options4 = { region: region2, maxRetries: maxRetries4 };
  const kms4 = setKMS(options4, context);

  t.ok(kms4, `setKMS(${stringify(options4)}) must return an instance`);
  t.equal(kms4.config.region, region2, `kms 4 region must be ${region2}`);
  t.equal(kms4.config.maxRetries, maxRetries4, `kms 4 maxRetries must be ${maxRetries4}`);
  t.notEqual(kms4, kms2, `setKMS(${stringify(options4)}) must NOT be cached instance 2 for region (${region1})`);

  t.equal(getKMS(region2), kms4, `getKMS(${region2}) gets cached instance 4`);

  // Check cache for current region 1 is still intact
  t.equal(getKMS(), kms2, `getKMS() still gets cached instance 2 for current region (${region1})`);
  t.equal(getKMS(region1), kms2, `getKMS(${region1}) gets cached instance 2`);



  // Do NOT re-use new kms instance for the different region if maxRetries is undefined instead of zero
  const maxRetries5 = '';
  const options5 = { region: region2, maxRetries: maxRetries5 };
  const kms5 = setKMS(options5, context);

  t.ok(kms5, `setKMS(${stringify(options5)}) must return an instance`);
  t.equal(kms5.config.region, region2, `kms 5 region must be ${region2}`);
  t.equal(kms5.config.maxRetries, maxRetries5, `kms 5 maxRetries must be ${maxRetries5}`);
  t.notEqual(kms5, kms4, `setKMS(${stringify(options5)}) must NOT be cached instance 4 for region (${region2})`);



  // Delete cache for region 1
  t.ok(deleteKMS(region1), `must delete cached instance for region (${region1})`); // clean up
  t.equal(getKMS(region1), undefined, `getKMS(${region1}) gets undefined after delete`);

  // Delete cache for region 1
  t.ok(deleteKMS(region2), `must delete cached instance for region (${region2})`); // clean up
  t.equal(getKMS(region2), undefined, `getKMS(${region2}) gets undefined after delete`);

  t.end();
});

// =====================================================================================================================
// Tests for configureKMS
// =====================================================================================================================

test('configureKMS', t => {
  const context = {};
  logging.configureLogging(context, {logLevel: LogLevel.DEBUG});

  process.env.AWS_REGION = 'us-west-1';
  const region1 = getRegion();
  t.equal(region1, 'us-west-1', `current region must be us-west-1`);

  // Ensure not cached before we configure
  deleteKMS(region1);

  t.notOk(context.kms, 'context.kms must not be configured yet');

  // Configure it for the first time
  const maxRetries1 = 0;

  configureKMS(context, {maxRetries: maxRetries1});
  const kms1 = context.kms;

  t.ok(kms1, 'context.kms 1 must be configured now');
  t.equal(kms1.config.region, region1, `context.kms 1 region must be ${region1}`);
  t.equal(kms1.config.maxRetries, maxRetries1, `context.kms 1 maxRetries must be ${maxRetries1}`);

  // "Configure" it for the second time with same region & maxRetries (should give same kms instance back again)
  context.kms = undefined; // clear context.kms otherwise will always get it back

  configureKMS(context, {region: region1, maxRetries: maxRetries1});
  const kms1a = context.kms;

  t.ok(kms1a, 'context.kms 1a must be configured');
  t.equal(kms1a, kms1, 'context.kms 1a must be cached instance 1');
  t.equal(kms1a.config.region, region1, `context.kms 1a region must be ${region1}`);
  t.equal(kms1a.config.maxRetries, maxRetries1, `context.kms 1a maxRetries must be ${maxRetries1}`);

  // Configure a new kms with a different maxRetries
  const maxRetries2 = 10;
  context.kms = undefined; // clear context.kms otherwise will always get it back

  configureKMS(context, {maxRetries: maxRetries2});
  const kms2 = context.kms;

  t.ok(kms2, 'context.kms 2 must be configured');
  t.equal(kms2.config.region, region1, `context.kms 2 region must be ${region1}`);
  t.equal(kms2.config.maxRetries, maxRetries2, `context.kms 2 maxRetries must be ${maxRetries2}`);

  t.notEqual(kms2, kms1, 'context.kms 2 must not be cached instance 1');

  // Configure same again, should hit context "cache"
  configureKMS(context, {maxRetries: maxRetries2, region: region1});
  const kms2a = context.kms;

  t.ok(kms2a, 'context.kms 2a must be configured');
  t.equal(kms2a.config.region, region1, `context.kms 2a region must be ${region1}`);
  t.equal(kms2a.config.maxRetries, maxRetries2, `context.kms 2a maxRetries must be ${maxRetries2}`);

  t.equal(kms2a, kms2, 'context.kms 2a must be cached instance 2');
  t.notEqual(kms2a, kms1, 'context.kms 2a must not be cached instance 1');

  // Reconfigure "original" again
  context.kms = undefined; // clear context.kms otherwise will always get it back
  //deleteKMS(region1); // make sure its gone before we start

  configureKMS(context, {maxRetries: maxRetries1});
  const kms3 = context.kms;

  t.ok(kms3, 'context.kms 3 must be configured');
  t.equal(kms3.config.region, region1, `context.kms 3 region must be ${region1}`);
  t.equal(kms3.config.maxRetries, maxRetries1, `context.kms 3 maxRetries must be ${maxRetries1}`);

  t.notEqual(kms3, kms2, 'context.kms 3 must not be cached instance 2');
  t.notEqual(kms3, kms1, 'context.kms 3 must not be cached instance 1');

  // Change the region
  process.env.AWS_REGION = 'us-west-2';
  const region2 = getRegion();
  t.equal(region2, 'us-west-2');
  t.equal(region2, 'us-west-2', `current region must be us-west-2`);

  // Configure for new region
  context.kms = undefined; // clear context.kms otherwise will always get it back
  deleteKMS(region2); // make sure none before we start

  configureKMS(context, {maxRetries: maxRetries1});
  const kms4 = context.kms;

  t.ok(kms4, 'context.kms 4 must be configured');
  t.equal(kms4.config.region, region2, `context.kms 4 region must be ${region2}`);
  t.equal(kms4.config.maxRetries, maxRetries1, `context.kms 4 maxRetries must be ${maxRetries1}`);

  t.notEqual(kms4, kms3, 'context.kms 4 must NOT be cached instance 3');
  t.notEqual(kms4, kms2, 'context.kms 4 must NOT be cached instance 2');
  t.notEqual(kms4, kms1, 'context.kms 4 must NOT be cached instance 1');

  // Switch the region back again
  process.env.AWS_REGION = 'us-west-1';
  t.equal(getRegion(), 'us-west-1', `current region must be us-west-1`);

  // "Reconfigure" original again
  context.kms = undefined; // clear context.kms otherwise will always get it back
  configureKMS(context, {maxRetries: maxRetries1});
  const kms5 = context.kms;

  t.ok(kms5, 'context.kms must be configured');
  t.equal(kms5.config.region, region1, `context.kms 5 region must be ${region1}`);
  t.equal(kms5.config.maxRetries, maxRetries1, `context.kms 5 maxRetries must be ${maxRetries1}`);

  t.equal(kms5, kms3, 'context.kms 5 must be cached instance 3');

  t.end();
});
