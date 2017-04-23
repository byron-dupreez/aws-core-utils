'use strict';

/**
 * Unit tests for aws-core-utils/regions.js
 * @author Byron du Preez
 */

const test = require("tape");

const uuid = require("uuid");

// The test subject
const regions = require('../regions');
const getRegion = regions.getRegion;
const getRegionRaw = regions.ONLY_FOR_TESTING.getRegionRaw;
// const getDefaultRegion = regions.getDefaultRegion;
// const resolveRegion = regions.resolveRegion;
const setRegionIfNotSet = regions.ONLY_FOR_TESTING.setRegionIfNotSet;

const Strings = require('core-functions/strings');
const isBlank = Strings.isBlank;
// const isNotBlank = Strings.isNotBlank;
// const trim = Strings.trim;
// const trimOrEmpty = Strings.trimOrEmpty;

// =====================================================================================================================
// Tests for getRegion
// =====================================================================================================================

test('getRegion and setRegionIfNotSet', t => {

  // Attempt to preserve the original AWS_REGION setting (unfortunately cannot preserve undefined or null)
  const origRegion = getRegionRaw();

  // check orig
  if (isBlank(origRegion)) {
    t.equal(origRegion, process.env.AWS_REGION, `original raw must be '${process.env.AWS_REGION}'`);
    t.equal(getRegion(), '', `original must be empty string '${process.env.AWS_REGION}'`);
  }

  // Must use empty string to "clear" property.env variable - undefined & null don't work (e.g. it sets it to 'undefined' or 'null')
  const unset = '';

  try {
    // "Clear" AWS_REGION to empty string
    //console.log(`BEFORE reset process.env.AWS_REGION = (${process.env.AWS_REGION})`);
    process.env.AWS_REGION = unset;
    //console.log(`AFTER reset process.env.AWS_REGION = '${process.env.AWS_REGION}' (orig was ${origRegion})`);
    t.equal(process.env.AWS_REGION, unset, `process.env.AWS_REGION must be '${unset}' after reset`);

    // check get when not set
    t.equal(getRegion(), unset, `must be '${unset}'`);

    // check will set, when not set
    const expected = 'TEST_REGION_1';
    t.ok(setRegionIfNotSet(expected), `must set successfully`);
    t.equal(getRegion(), expected, `must be ${expected}`);

    // check was NOT set, when already set set
    t.notOk(setRegionIfNotSet('TEST_REGION_3'), `must NOT set successfully`);
    t.equal(getRegion(), expected, `must still be ${expected}`);

  } finally {
    // "Restore" original aws region
    //console.log(`BEFORE restore process.env.AWS_REGION = '${process.env.AWS_REGION}' (orig was ${origRegion})`);
    process.env.AWS_REGION = isBlank(origRegion) ? unset : origRegion;
    //console.log(`AFTER restore process.env.AWS_REGION = '${process.env.AWS_REGION}' (orig was ${origRegion})`);
    // Check "restore" worked
    if (isBlank(origRegion)) {
      t.equal(getRegion(), unset, `must be "restored" to '${unset}' (orig was ${origRegion})`);
    } else {
      t.equal(getRegion(), origRegion, `must be restored to ${origRegion}`);
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
//   // const eventSourceArnRegion = 'ES_ARN_REGION';
//   // const eventAwsRegion = 'EVENT_AWS_REGION';
//   // const invokedFunctionArnRegion = 'IF_ARN_REGION';
//
//   const eventSourceArn = sampleEventSourceArn(streamName); //, eventSourceArnRegion);
//   //const record = sampleKinesisRecord(... eventSourceArn, eventAwsRegion);
//   //const event = sampleKinesisEventWithRecord(record);
//   const event = sampleKinesisEventWithSampleRecord(... eventSourceArn); //, eventAwsRegion);
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
