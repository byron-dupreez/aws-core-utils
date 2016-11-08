'use strict';

/**
 * Unit tests for aws-core-utils/kinesis-utils.js
 * @author Byron du Preez
 */

const test = require("tape");

// The test subject
const kinesisUtils = require('../kinesis-utils');
const configureKinesis = kinesisUtils.configureKinesis;

const regions = require('../regions');
const getRegion = regions.getRegion;
const getRegionRaw = regions.ONLY_FOR_TESTING.getRegionRaw;
// const getDefaultRegion = regions.getDefaultRegion;
// const resolveRegion = regions.resolveRegion;
const setRegionIfNotSet = regions.ONLY_FOR_TESTING.setRegionIfNotSet;

const logging = require('logging-utils');

// const Strings = require('core-functions/strings');
// const isBlank = Strings.isBlank;
// const isNotBlank = Strings.isNotBlank;
// const trim = Strings.trim;
// const trimOrEmpty = Strings.trimOrEmpty;

// =====================================================================================================================
// Tests for configureKinesis
// =====================================================================================================================

test('configureKinesis', t => {
  const context = {};
  logging.configureLogging(context, logging.DEBUG);

  t.notOk(context.kinesis, 'context.kinesis must not be configured yet');

  process.env.AWS_REGION = 'us-west-1';
  const region1 = getRegion();
  t.equal(region1, 'us-west-1');

  // Configure it for the first time
  const maxRetries1 = 0;
  configureKinesis(context, maxRetries1);

  const kinesis = context.kinesis;
  t.ok(context.kinesis, 'context.kinesis must be configured now');
  t.equal(kinesis.config.region, region1, `context.kinesis.config.region must be ${region1}`);
  t.equal(kinesis.config.maxRetries, maxRetries1, `context.kinesis.config.maxRetries must be ${maxRetries1}`);

  // "Configure" it for the second time with same region & maxRetries (should give same kinesis instance back again)
  context.kinesis = undefined; // clear context.kinesis otherwise will always get it back
  configureKinesis(context, maxRetries1);

  t.equal(context.kinesis, kinesis, 'context.kinesis must be same cached kinesis');

  // Configure a new kinesis with a different maxRetries
  //context.kinesis = undefined; // clear context.kinesis otherwise will always get it back
  const maxRetries2 = 10;
  configureKinesis(context, maxRetries2);

  const kinesis2 = context.kinesis;
  t.ok(context.kinesis, 'context.kinesis must be configured');
  t.equal(kinesis2.config.region, region1, `context.kinesis.config.region must be ${region1}`);
  t.equal(kinesis2.config.maxRetries, maxRetries2, `context.kinesis.config.maxRetries must be ${maxRetries2}`);

  t.notEqual(kinesis2, kinesis, 'context.kinesis must NOT be same cached kinesis');

  // Configure same again, should hit context "cache"
  configureKinesis(context, maxRetries2);

  t.ok(context.kinesis, 'context.kinesis must be configured');
  t.equal(kinesis2.config.region, region1, `context.kinesis.config.region must be ${region1}`);
  t.equal(kinesis2.config.maxRetries, maxRetries2, `context.kinesis.config.maxRetries must be ${maxRetries2}`);

  t.equal(context.kinesis, kinesis2, 'context.kinesis must be same "cached" context.kinesis');
  t.notEqual(context.kinesis, kinesis, 'context.kinesis must NOT be original cached kinesis');

  // Reconfigure original again
  configureKinesis(context, maxRetries1);
  const kinesis1 = context.kinesis;

  t.ok(context.kinesis, 'context.kinesis must be configured');
  t.equal(kinesis1.config.region, region1, `context.kinesis.config.region must be ${region1}`);
  t.equal(kinesis1.config.maxRetries, maxRetries1, `context.kinesis.config.maxRetries must be ${maxRetries1}`);

  t.equal(context.kinesis, kinesis, 'context.kinesis must be original cached kinesis again');

  // Change the region
  process.env.AWS_REGION = 'us-west-2';
  const region2 = getRegion();
  t.equal(region2, 'us-west-2');

  // Configure for new region
  configureKinesis(context, maxRetries1);
  const kinesis3 = context.kinesis;

  t.ok(context.kinesis, 'context.kinesis must be configured');
  t.equal(kinesis3.config.region, region2, `context.kinesis.config.region must be ${region2}`);
  t.equal(kinesis3.config.maxRetries, maxRetries1, `context.kinesis.config.maxRetries must be ${maxRetries1}`);

  t.notEqual(context.kinesis, kinesis, 'context.kinesis must NOT be original cached kinesis');
  t.notEqual(context.kinesis, kinesis2, 'context.kinesis must NOT be kinesis2 either');

  // Switch the region back again
  process.env.AWS_REGION = 'us-west-1';
  t.equal(getRegion(), 'us-west-1');

  // Reconfigure original again
  configureKinesis(context, maxRetries1);
  const kinesis4 = context.kinesis;

  t.ok(context.kinesis, 'context.kinesis must be configured');
  t.equal(kinesis4.config.region, region1, `context.kinesis.config.region must be ${region1}`);
  t.equal(kinesis4.config.maxRetries, maxRetries1, `context.kinesis.config.maxRetries must be ${maxRetries1}`);

  t.equal(context.kinesis, kinesis, 'context.kinesis must be original cached kinesis again');

  t.end();
});
