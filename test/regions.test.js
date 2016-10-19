'use strict';

/**
 * Unit tests for aws-core-utils/regions.js
 * @author Byron du Preez
 */

const test = require("tape");

const uuid = require("node-uuid");

// The test subject
const regions = require('../regions');
const getAwsRegion = regions.getAwsRegion;
const getAwsRegionRaw = regions.ONLY_FOR_TESTING.getAwsRegionRaw;
// const getAwsDefaultRegion = regions.getAwsDefaultRegion;
// const resolveRegion = regions.resolveRegion;
const setAwsRegionIfNotSet = regions.ONLY_FOR_TESTING.setAwsRegionIfNotSet;

const Strings = require('core-functions/strings');
const isBlank = Strings.isBlank;
const isNotBlank = Strings.isNotBlank;
const trim = Strings.trim;
const trimOrEmpty = Strings.trimOrEmpty;

const INVOKED_FUNCTION_ARN_REGION = 'INVOKED_FUNCTION_ARN_REGION';
const EVENT_AWS_REGION = 'EVENT_AWS_REGION';
const EVENT_SOURCE_ARN_REGION = 'EVENT_SOURCE_ARN_REGION';

// function sampleRegion(region) {
//   return region ? region : defaultAwsRegion;
// }

// =====================================================================================================================
// Tests for getAwsRegion
// =====================================================================================================================

test('getAwsRegion and setAwsRegionIfNotSet', t => {

  // Attempt to preserve the original AWS_REGION setting (unfortunately cannot preserve undefined or null)
  const origAwsRegion = getAwsRegionRaw();

  // check orig
  if (isBlank(origAwsRegion)) {
    t.equal(origAwsRegion, process.env.AWS_REGION, `original raw must be '${process.env.AWS_REGION}'`);
    t.equal(getAwsRegion(), '', `original must be empty string '${process.env.AWS_REGION}'`);
  }

  // Must use empty string to "clear" property.env variable - undefined & null don't work (e.g. it sets it to 'undefined' or 'null')
  const unset = '';

  try {
    // "Clear" AWS_REGION to empty string
    console.log(`BEFORE reset process.env.AWS_REGION = (${process.env.AWS_REGION})`);
    process.env.AWS_REGION = unset;
    console.log(`AFTER reset process.env.AWS_REGION = '${process.env.AWS_REGION}' (orig was ${origAwsRegion})`);
    t.equal(process.env.AWS_REGION, unset, `process.env.AWS_REGION must be '${unset}' after reset`);

    // check get when not set
    t.equal(getAwsRegion(), unset, `must be '${unset}'`);

    // check will set, when not set
    const expected = 'TEST_REGION_1';
    t.ok(setAwsRegionIfNotSet(expected), `must set successfully`);
    t.equal(getAwsRegion(), expected, `must be ${expected}`);

    // check was NOT set, when already set set
    t.notOk(setAwsRegionIfNotSet('TEST_REGION_3'), `must NOT set successfully`);
    t.equal(getAwsRegion(), expected, `must still be ${expected}`);

  } finally {
    // "Restore" original aws region
    console.log(`BEFORE restore process.env.AWS_REGION = '${process.env.AWS_REGION}' (orig was ${origAwsRegion})`);
    process.env.AWS_REGION = isBlank(origAwsRegion) ? unset : origAwsRegion;
    console.log(`AFTER restore process.env.AWS_REGION = '${process.env.AWS_REGION}' (orig was ${origAwsRegion})`);
    // Check "restore" worked
    if (isBlank(origAwsRegion)) {
      t.equal(getAwsRegion(), unset, `must be "restored" to '${unset}' (orig was ${origAwsRegion})`);
    } else {
      t.equal(getAwsRegion(), origAwsRegion, `must be restored to ${origAwsRegion}`);
    }
    t.end();
  }
});

//TODO add tests for other methods
// =====================================================================================================================
// Tests for resolveRegion
// =====================================================================================================================

// test('resolveRegion with event.awsRegion defined and no event.eventSourceArn and no awsContext.invokedFunctionArn', t => {
//   // Create an event
//   const streamName = sampleStreamName('', '');
//   ;
//   // Configure different regions to each of the 3 sources
//   // const eventSourceArnRegion = EVENT_SOURCE_ARN_REGION;
//   // const eventAwsRegion = EVENT_AWS_REGION;
//   // const invokedFunctionArnRegion = INVOKED_FUNCTION_ARN_REGION;
//
//   const eventSourceArn = sampleEventSourceArn(streamName); //, eventSourceArnRegion);
//   //const record = sampleKinesisRecord(eventSourceArn, eventAwsRegion);
//   //const event = sampleKinesisEventWithRecord(record);
//   const event = sampleKinesisEventWithSampleRecord(eventSourceArn); //, eventAwsRegion);
//
//   // Create an AWS context
//   const functionName = sampleFunctionName;
//   const functionVersion = latestFunctionVersion;
//
//   const functionAlias = '';
//   const invokedFunctionArn = sampleInvokedFunctionArn(sampleFunctionName, functionAlias); //, invokedFunctionArnRegion);
//   const awsContext = sampleAwsContext(invokedFunctionArn, functionName, functionVersion);
//
//   const region = regions.resolveRegion(event, awsContext);
//   t.equal(region, EVENT_AWS_REGION);
//
//   t.end();
// });
