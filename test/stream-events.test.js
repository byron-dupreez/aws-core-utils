'use strict';

/**
 * Unit tests for aws-core-utils/stream-events.js
 * @author Byron du Preez
 */

const test = require("tape");

// The test subject
const streamEvents = require('../stream-events');
const getEventSourceARNs = streamEvents.getEventSourceARNs;
const getEventSourceStreamNames = streamEvents.getEventSourceStreamNames;
const getEventSourceStreamName = streamEvents.getEventSourceStreamName;

const validateStreamEventRecord = streamEvents.validateStreamEventRecord;
const validateKinesisStreamEventRecord = streamEvents.validateKinesisStreamEventRecord;
const validateDynamoDBStreamEventRecord = streamEvents.validateDynamoDBStreamEventRecord;

const Strings = require('core-functions/strings');
const trim = Strings.trim;
const trimOrEmpty = Strings.trimOrEmpty;
const isNotBlank = Strings.isNotBlank;
const stringify = Strings.stringify;

const samples = require('./samples');

// =====================================================================================================================
// getEventSourceARNs
// =====================================================================================================================

test('getEventSourceARNs', t => {
  function check(streamNames) {
    const eventSourceArns = streamNames.map(streamName =>
      isNotBlank(streamName) ? samples.sampleEventSourceArn('eventSourceArnRegion', trim(streamName)) : trim(streamName));
    const records = eventSourceArns.map(eventSourceArn =>
      samples.sampleKinesisRecord(undefined, undefined, eventSourceArn, 'eventAwsRegion'));
    const event = samples.sampleKinesisEventWithRecords(records);

    // get the event source ARNs
    const actual = getEventSourceARNs(event);

    t.deepEqual(actual, eventSourceArns, `${stringify(actual)} must be ${stringify(eventSourceArns)}`);
  }

  // no records
  check([]);

  // record with no eventSourceARN
  check([undefined]);
  check([null]);
  check(['']);
  check(['  \n\r\t   ']);

  // multiple record with no eventSourceARNs
  check([undefined, null, '', '  \n\r\t   ']);

  // record(s) with eventSourceARNs
  check(['Stream1']);
  check(['StreamA', 'StreamB']);
  check(['StreamX', 'StreamX', 'StreamZ']);

  // record(s) with and without eventSourceARNs
  check([undefined, 'StreamA1', ' ', 'StreamB2', null, 'StreamC3']);

  t.end();
});

// =====================================================================================================================
// getEventSourceStreamNames
// =====================================================================================================================

test('getEventSourceStreamNames', t => {
  function check(streamNames) {
    const eventSourceArns = streamNames.map(streamName =>
      isNotBlank(streamName) ? samples.sampleEventSourceArn('eventSourceArnRegion', trim(streamName)) : trim(streamName));
    const records = eventSourceArns.map(eventSourceArn =>
      samples.sampleKinesisRecord(undefined, undefined, eventSourceArn, 'eventAwsRegion'));
    const event = samples.sampleKinesisEventWithRecords(records);

    // get the event source ARNs
    const actual = getEventSourceStreamNames(event);

    const expected = streamNames.map(trimOrEmpty);

    t.deepEqual(actual, expected, `streams ${stringify(streamNames)} -> ${stringify(actual)} must be ${stringify(expected)}`);
  }

  // no records
  check([]);

  // record with no eventSourceARN
  check([undefined]);
  check([null]);
  check(['']);
  check(['  \n\r\t   ']);

  // multiple records with no eventSourceARNs
  check([undefined, null, '', '  \n\r\t   ']);

  // record(s) with eventSourceARNs
  check(['Stream1']);
  check(['StreamA', 'StreamB']);
  check(['StreamX', 'StreamX', 'StreamZ']);

  // record(s) with and without eventSourceARNs
  check([undefined, 'StreamA1', undefined, 'StreamB2', null, 'StreamC3']);

  t.end();
});

// =====================================================================================================================
// getEventSourceStreamName
// =====================================================================================================================

test('getEventSourceStreamName', t => {
  function check(streamName) {
    const eventSourceArn = isNotBlank(streamName) ?
      samples.sampleEventSourceArn('eventSourceArnRegion', trim(streamName)) : trim(streamName);
    const record = samples.sampleKinesisRecord(undefined, undefined, eventSourceArn, 'eventAwsRegion');

    // get the event source ARNs
    const actual = getEventSourceStreamName(record);

    const expected = trimOrEmpty(streamName);

    t.equal(actual, expected, `stream (${stringify(streamName)}) -> ${stringify(actual)} must be ${stringify(expected)}`);
  }

  // record with no eventSourceARN
  check(undefined);

  // record with null or empty eventSourceARN
  check(null);
  check('');
  check('  \n\r\t   ');

  // record with eventSourceARN
  check('Stream1');
  check('StreamA');
  check('StreamX');

  t.end();
});

// =====================================================================================================================
// validateStreamEventRecord
// =====================================================================================================================

test('validateStreamEventRecord', t => {
  function check(record, mustPass) {
    const prefix = `validateStreamEventRecord(${stringify(record)})`;
    try {
      validateStreamEventRecord(record);

      if (mustPass) {
        t.pass(`${prefix} should have passed`);
      } else {
        t.fail(`${prefix} should NOT have passed`);
      }
    } catch (err) {
      if (mustPass) {
        t.fail(`${prefix} should NOT have failed (${err})`);
      } else {
        t.pass(`${prefix} should have failed (${err.message})`);
      }
    }
  }

  // no record
  check(undefined, false);
  check(null, false);

  // invalid records
  check(123, false);
  check("ABC", false);
  check(true, false);
  check({}, false);
  check({eventSource: 'aws:other'}, false);

  // invalid Kinesis records
  check({eventSource: 'aws:kinesis'}, false);
  check({eventSource: 'aws:kinesis', kinesis: {}}, false);

  // "valid" Kinesis records
  check({eventSource: 'aws:kinesis', kinesis: {data: "dummy_data"}}, true);

  // valid Kinesis records
  const sampleRecord = samples.sampleKinesisRecord(undefined, undefined, samples.sampleEventSourceArn('eventSourceArnRegion', trim("streamName")), 'eventAwsRegion');
  check(sampleRecord, true);

  const awsKinesisStreamsSampleEvent = samples.awsKinesisStreamsSampleEvent("identityArn", "eventSourceArn");
  awsKinesisStreamsSampleEvent.Records.forEach(record => {
    check(record, true);
  });


  // invalid DynamoDB stream event records
  check({eventSource: 'aws:dynamodb'}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OTHER"}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {StreamViewType: "KEYS_ONLY"}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE"}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", NewImage: {}}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE"}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", OldImage: {}}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES"}}, false);

  // "valid" DynamoDB stream event records
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "KEYS_ONLY"}}, true);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", OldImage: {}}}, true);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", NewImage: {}}}, true);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, NewImage: {}}}, true);

  // valid DynamoDB stream event records
  const awsDynamoDBUpdateSampleEvent = samples.awsDynamoDBUpdateSampleEvent("identityArn", "eventSourceArn");
  awsDynamoDBUpdateSampleEvent.Records.forEach(record => {
    check(record, true);
  });

  t.end();
});

// =====================================================================================================================
// validateKinesisStreamEventRecord
// =====================================================================================================================

test('validateKinesisStreamEventRecord', t => {
  function check(record, mustPass) {
    const prefix = `validateKinesisStreamEventRecord(${stringify(record)})`;
    try {
      validateKinesisStreamEventRecord(record);

      if (mustPass) {
        t.pass(`${prefix} should have passed`);
      } else {
        t.fail(`${prefix} should NOT have passed`);
      }
    } catch (err) {
      if (mustPass) {
        t.fail(`${prefix} should NOT have failed (${err})`);
      } else {
        t.pass(`${prefix} should have failed (${err.message})`);
      }
    }
  }

  // no record
  check(undefined, false);
  check(null, false);

  // invalid records
  check({}, false);
  check({eventSource: 'aws:other'}, false);

  // invalid Kinesis records
  check({eventSource: 'aws:kinesis'}, false);
  check({eventSource: 'aws:kinesis', kinesis: {}}, false);

  // "valid" Kinesis records
  check({eventSource: 'aws:kinesis', kinesis: {data: "dummy_data"}}, true);

  // valid Kinesis records
  const sampleRecord = samples.sampleKinesisRecord(undefined, undefined, samples.sampleEventSourceArn('eventSourceArnRegion', trim("streamName")), 'eventAwsRegion');
  check(sampleRecord, true);

  const awsKinesisStreamsSampleEvent = samples.awsKinesisStreamsSampleEvent("identityArn", "eventSourceArn");
  awsKinesisStreamsSampleEvent.Records.forEach(record => {
    check(record, true);
  });

  // invalid - since DynamoDB stream event records
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "KEYS_ONLY"}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", OldImage: {}}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", NewImage: {}}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, NewImage: {}}}, false);

  // invalid - since DynamoDB stream event records
  const awsDynamoDBUpdateSampleEvent = samples.awsDynamoDBUpdateSampleEvent("identityArn", "eventSourceArn");
  awsDynamoDBUpdateSampleEvent.Records.forEach(record => {
    check(record, false);
  });

  t.end();
});

// =====================================================================================================================
// validateDynamoDBStreamEventRecord
// =====================================================================================================================

test('validateDynamoDBStreamEventRecord', t => {
  function check(record, mustPass) {
    const prefix = `validateDynamoDBStreamEventRecord(${stringify(record)})`;
    try {
      validateDynamoDBStreamEventRecord(record);

      if (mustPass) {
        t.pass(`${prefix} should have passed`);
      } else {
        t.fail(`${prefix} should NOT have passed`);
      }
    } catch (err) {
      if (mustPass) {
        t.fail(`${prefix} should NOT have failed (${err})`);
      } else {
        t.pass(`${prefix} should have failed (${err.message})`);
      }
    }
  }

  // no record
  check(undefined, false);
  check(null, false);

  // invalid records
  check({}, false);
  check({eventSource: 'aws:other'}, false);

  // invalid DynamoDB stream event records
  check({eventSource: 'aws:dynamodb'}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OTHER"}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {StreamViewType: "KEYS_ONLY"}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE"}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", NewImage: {}}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE"}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", OldImage: {}}}, false);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES"}}, false);

  // "valid" DynamoDB stream event records
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "KEYS_ONLY"}}, true);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", OldImage: {}}}, true);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", NewImage: {}}}, true);
  check({eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, NewImage: {}}}, true);

  // valid DynamoDB stream event records
  const awsDynamoDBUpdateSampleEvent = samples.awsDynamoDBUpdateSampleEvent("identityArn", "eventSourceArn");
  awsDynamoDBUpdateSampleEvent.Records.forEach(record => {
    check(record, true);
  });

  // invalid - since Kinesis records
  check({eventSource: 'aws:kinesis', kinesis: {data: "dummy_data"}}, false);

  // invalid  - since Kinesis records
  const sampleRecord = samples.sampleKinesisRecord(undefined, undefined, samples.sampleEventSourceArn('eventSourceArnRegion', trim("streamName")), 'eventAwsRegion');
  check(sampleRecord, false);

  const awsKinesisStreamsSampleEvent = samples.awsKinesisStreamsSampleEvent("identityArn", "eventSourceArn");
  awsKinesisStreamsSampleEvent.Records.forEach(record => {
    check(record, false);
  });

  t.end();
});

