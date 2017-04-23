'use strict';

/**
 * Unit tests for aws-core-utils/stream-events.js
 * @author Byron du Preez
 */

const test = require("tape");

// The test subject
const streamEvents = require('../stream-events');
const getEventID = streamEvents.getEventID;
const getEventSource = streamEvents.getEventSource;
const getEventSourceARN = streamEvents.getEventSourceARN;
//const getEventSources = streamEvents.getEventSources;
const getEventSourceARNs = streamEvents.getEventSourceARNs;

const getKinesisEventSourceStreamNames = streamEvents.getKinesisEventSourceStreamNames;
const getKinesisEventSourceStreamName = streamEvents.getKinesisEventSourceStreamName;

const getKinesisShardId = streamEvents.getKinesisShardId;
const getKinesisShardIdFromEventID = streamEvents.getKinesisShardIdFromEventID;
const getKinesisShardIdAndEventNoFromEventID = streamEvents.getKinesisShardIdAndEventNoFromEventID;

const getKinesisSequenceNumber = streamEvents.getKinesisSequenceNumber;

// const getDynamoDBEventSourceTableName = streamEvents.getDynamoDBEventSourceTableName;
// const getDynamoDBEventSourceTableNameAndStreamTimestamp = streamEvents.getDynamoDBEventSourceTableNameAndStreamTimestamp;

const getDynamoDBSequenceNumber = streamEvents.getDynamoDBSequenceNumber;

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
// getEventID, getEventSource, getEventSourceARN, getKinesisSequenceNumber & getDynamoDBSequenceNumber
// =====================================================================================================================

test('getEventID, getEventSource, getEventSourceARN, getKinesisSequenceNumber & getDynamoDBSequenceNumber', t => {
  // With garbage
  t.equal(getEventID(undefined), '', `getEventID(undefined) must be ''`);
  t.equal(getEventSource(undefined), '', `getEventSource(undefined) must be ''`);
  t.equal(getEventSourceARN(undefined), '', `getEventSourceARN(undefined) must be ''`);
  t.equal(getKinesisSequenceNumber(undefined), '', `getKinesisSequenceNumber(undefined) must be ''`);
  t.equal(getDynamoDBSequenceNumber(undefined), '', `getDynamoDBSequenceNumber(undefined) must be ''`);

  t.equal(getEventID(null), '', `getEventID(null) must be ''`);
  t.equal(getEventSource(null), '', `getEventSource(null) must be ''`);
  t.equal(getEventSourceARN(null), '', `getEventSourceARN(null) must be ''`);
  t.equal(getKinesisSequenceNumber(null), '', `getKinesisSequenceNumber(null) must be ''`);
  t.equal(getDynamoDBSequenceNumber(null), '', `getDynamoDBSequenceNumber(null) must be ''`);

  t.equal(getEventID({}), '', `getEventID({}) must be ''`);
  t.equal(getEventSource({}), '', `getEventSource({}) must be ''`);
  t.equal(getEventSourceARN({}), '', `getEventSourceARN({}) must be ''`);
  t.equal(getKinesisSequenceNumber({}), '', `getKinesisSequenceNumber({}) must be ''`);
  t.equal(getDynamoDBSequenceNumber({}), '', `getDynamoDBSequenceNumber({}) must be ''`);

  t.equal(getEventID('junk'), '', `getEventID('junk') must be ''`);
  t.equal(getEventSource('junk'), '', `getEventSource('junk') must be ''`);
  t.equal(getEventSourceARN('junk'), '', `getEventSourceARN('junk') must be ''`);
  t.equal(getKinesisSequenceNumber('junk'), '', `getKinesisSequenceNumber('junk') must be ''`);
  t.equal(getDynamoDBSequenceNumber('junk'), '', `getDynamoDBSequenceNumber('junk') must be ''`);

  // With a Kinesis stream event record
  const kinesisEventSourceArn = samples.sampleKinesisEventSourceArn('eventSourceArnRegion', 'TestStream_QA');
  const kinesisRecord = samples.sampleKinesisRecord(undefined, undefined, undefined, undefined, kinesisEventSourceArn, 'eventAwsRegion');

  t.equal(getEventID(kinesisRecord), kinesisRecord.eventID, `getEventID(kinesisRecord) must be '${kinesisRecord.eventID}'`);
  t.equal(getEventSource(kinesisRecord), kinesisRecord.eventSource, `getEventSource(kinesisRecord) must be '${kinesisRecord.eventSource}'`);
  t.equal(getEventSourceARN(kinesisRecord), kinesisRecord.eventSourceARN, `getEventSourceARN(kinesisRecord) must be '${kinesisRecord.eventSourceARN}'`);
  t.equal(getKinesisSequenceNumber(kinesisRecord), kinesisRecord.kinesis.sequenceNumber, `getKinesisSequenceNumber(kinesisRecord) must be '${kinesisRecord.kinesis.sequenceNumber}'`);
  t.equal(getDynamoDBSequenceNumber(kinesisRecord), '', `getDynamoDBSequenceNumber(kinesisRecord) must be ''`);

  // With a DynamoDB stream event record
  const dynamoDBEventSourceArn = samples.sampleDynamoDBEventSourceArn('eventSourceArnRegion', 'TestStream_UAT');
  const dynamoDBRecord = samples.awsDynamoDBUpdateSampleEvent(dynamoDBEventSourceArn).Records[0];

  t.equal(getEventID(dynamoDBRecord), dynamoDBRecord.eventID, `getEventID(dynamoDBRecord) must be '${dynamoDBRecord.eventID}'`);
  t.equal(getEventSource(dynamoDBRecord), dynamoDBRecord.eventSource, `getEventSource(dynamoDBRecord) must be '${dynamoDBRecord.eventSource}'`);
  t.equal(getEventSourceARN(dynamoDBRecord), dynamoDBRecord.eventSourceARN, `getEventSourceARN(dynamoDBRecord) must be '${dynamoDBRecord.eventSourceARN}'`);
  t.equal(getDynamoDBSequenceNumber(dynamoDBRecord), dynamoDBRecord.dynamodb.SequenceNumber, `getDynamoDBSequenceNumber(dynamoDBRecord) must be '${stringify(dynamoDBRecord.dynamodb.SequenceNumber)}'`);
  t.equal(getKinesisSequenceNumber(dynamoDBRecord), '', `getKinesisSequenceNumber(dynamoDBRecord) must be ''`);

  t.end();
});

// =====================================================================================================================
// getEventSourceARNs
// =====================================================================================================================

test('getEventSourceARNs', t => {
  function check(streamNames) {
    const eventSourceArns = streamNames.map(streamName =>
      isNotBlank(streamName) ? samples.sampleKinesisEventSourceArn('eventSourceArnRegion', trimOrEmpty(streamName)) : trimOrEmpty(streamName));
    const records = eventSourceArns.map(eventSourceArn =>
      samples.sampleKinesisRecord(undefined, undefined, undefined, undefined, eventSourceArn, 'eventAwsRegion'));
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
// getKinesisEventSourceStreamNames
// =====================================================================================================================

test('getKinesisEventSourceStreamNames', t => {
  function check(streamNames) {
    const eventSourceArns = streamNames.map(streamName =>
      isNotBlank(streamName) ? samples.sampleKinesisEventSourceArn('eventSourceArnRegion', trim(streamName)) : trim(streamName));
    const records = eventSourceArns.map(eventSourceArn =>
      samples.sampleKinesisRecord(undefined, undefined, undefined, undefined, eventSourceArn, 'eventAwsRegion'));
    const event = samples.sampleKinesisEventWithRecords(records);

    // get the event source ARNs
    const actual = getKinesisEventSourceStreamNames(event);

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
// getKinesisEventSourceStreamName
// =====================================================================================================================

test('getKinesisEventSourceStreamName', t => {
  function check(streamName) {
    const eventSourceArn = isNotBlank(streamName) ?
      samples.sampleKinesisEventSourceArn('eventSourceArnRegion', trim(streamName)) : trim(streamName);
    const record = samples.sampleKinesisRecord(undefined, undefined, undefined, undefined, eventSourceArn, 'eventAwsRegion');

    // get the event source ARNs
    const actual = getKinesisEventSourceStreamName(record);

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
// getKinesisShardIdFromEventID
// =====================================================================================================================

test('getKinesisShardIdFromEventID', t => {
  // Other cases
  t.equal(getKinesisShardIdFromEventID(undefined), '', `eventID (undefined) shardId must be ''`);
  t.equal(getKinesisShardIdFromEventID(null), '', `eventID (null) shardId must be ''`);
  t.equal(getKinesisShardIdFromEventID(''), '', `eventID '' shardId must be ''`);
  t.equal(getKinesisShardIdFromEventID(':'), '', `eventID ':' shardId must be ''`);
  t.equal(getKinesisShardIdFromEventID('shardId-'), '', `eventID 'shardId-' shardId must be ''`);
  t.equal(getKinesisShardIdFromEventID('shardId-:'), 'shardId-', `eventID 'shardId-:' shardId must be 'shardId-'`);
  t.equal(getKinesisShardIdFromEventID('shardId-0:'), 'shardId-0', `eventID 'shardId-0:' shardId must be 'shardId-0'`);
  t.equal(getKinesisShardIdFromEventID('shardId-012:'), 'shardId-012', `eventID 'shardId-012:' shardId must be 'shardId-012'`);

  // More real eventIDs
  let eventID = 'shardId-000000000000:49545115243490985018280067714973144582180062593244200961';
  let expected = 'shardId-000000000000';
  t.equal(getKinesisShardIdFromEventID(eventID), expected, `eventID '${eventID}' shardId must be '${expected}'`);

  eventID = 'shardId-123456789012:49545115243490985018280067714973144582180062593244200961';
  expected = 'shardId-123456789012';
  t.equal(getKinesisShardIdFromEventID(eventID), expected, `eventID '${eventID}' shardId must be '${expected}'`);

  t.end();
});

// =====================================================================================================================
// getKinesisShardId
// =====================================================================================================================

test('getKinesisShardId', t => {
  function toRecord(eventID) {
    return {eventID: eventID};
  }
  // Other cases
  t.equal(getKinesisShardId(undefined), '', `record (undefined) shardId must be ''`);
  t.equal(getKinesisShardId({}), '', `record ({}) shardId must be ''`);
  t.equal(getKinesisShardId(toRecord(undefined)), '', `record ${JSON.stringify(toRecord(undefined))} shardId must be ''`);
  t.equal(getKinesisShardId(toRecord(null)), '', `record ${JSON.stringify(toRecord(null))} shardId must be ''`);
  t.equal(getKinesisShardId(toRecord('')), '', `record ${JSON.stringify(toRecord(''))} shardId must be ''`);
  t.equal(getKinesisShardId(toRecord(':')), '', `record ${JSON.stringify(toRecord(':'))} shardId must be ''`);
  t.equal(getKinesisShardId(toRecord('shardId-')), '', `record ${JSON.stringify(toRecord('shardId-'))} shardId must be ''`);
  t.equal(getKinesisShardId(toRecord('shardId-:')), 'shardId-', `record ${JSON.stringify(toRecord('shardId-:'))} shardId must be 'shardId-'`);
  t.equal(getKinesisShardId(toRecord('shardId-0:')), 'shardId-0', `record ${JSON.stringify(toRecord('shardId-0:'))} shardId must be 'shardId-0'`);
  t.equal(getKinesisShardId(toRecord('shardId-012:')), 'shardId-012', `record ${JSON.stringify(toRecord('shardId-012:'))} shardId must be 'shardId-012'`);

  // More real eventIDs
  let eventID = 'shardId-000000000000:49545115243490985018280067714973144582180062593244200961';
  let expected = 'shardId-000000000000';
  t.equal(getKinesisShardId(toRecord(eventID)), expected, `record ${JSON.stringify(toRecord(eventID))} shardId must be '${expected}'`);

  eventID = 'shardId-123456789012:49545115243490985018280067714973144582180062593244200961';
  expected = 'shardId-123456789012';
  t.equal(getKinesisShardId(toRecord(eventID)), expected, `record ${JSON.stringify(toRecord(eventID))} shardId must be '${expected}'`);

  t.end();
});

// =====================================================================================================================
// getKinesisShardIdAndEventNoFromEventID
// =====================================================================================================================

test('getKinesisShardIdAndEventNoFromEventID', t => {
  // Other cases
  t.deepEqual(getKinesisShardIdAndEventNoFromEventID(undefined), ['', ''], `eventID (undefined) shardId & eventNo must be ['','']`);
  t.deepEqual(getKinesisShardIdAndEventNoFromEventID(null), ['', ''], `eventID (null) shardId & eventNo must be ['','']`);
  t.deepEqual(getKinesisShardIdAndEventNoFromEventID(''), ['', ''], `eventID '' shardId & eventNo must be ['','']`);
  t.deepEqual(getKinesisShardIdAndEventNoFromEventID(':'), ['', ''], `eventID ':' shardId & eventNo must be ['','']`);
  t.deepEqual(getKinesisShardIdAndEventNoFromEventID('shardId-'), ['', ''], `eventID 'shardId-' shardId & eventNo must be ['','']`);
  t.deepEqual(getKinesisShardIdAndEventNoFromEventID('shardId-:'), ['shardId-', ''], `eventID 'shardId-:' shardId & eventNo must be ['shardId-','']`);
  t.deepEqual(getKinesisShardIdAndEventNoFromEventID('shardId-0:'), ['shardId-0', ''], `eventID 'shardId-0:' shardId & eventNo must be ['shardId-0','']`);
  t.deepEqual(getKinesisShardIdAndEventNoFromEventID('shardId-012:456'), ['shardId-012', '456'], `eventID 'shardId-012:456' shardId & eventNo must be ['shardId-012','456']`);

  t.equal(getKinesisShardIdFromEventID(undefined), '', `eventID (undefined) shardId must be ''`);
  t.equal(getKinesisShardIdFromEventID(null), '', `eventID (null) shardId must be ''`);
  t.equal(getKinesisShardIdFromEventID(''), '', `eventID '' shardId must be ''`);
  t.equal(getKinesisShardIdFromEventID(':'), '', `eventID ':' shardId must be ''`);
  t.equal(getKinesisShardIdFromEventID('shardId-'), '', `eventID 'shardId-' shardId must be ''`);
  t.equal(getKinesisShardIdFromEventID('shardId-:'), 'shardId-', `eventID 'shardId-:' shardId must be 'shardId-'`);
  t.equal(getKinesisShardIdFromEventID('shardId-0:'), 'shardId-0', `eventID 'shardId-0:' shardId must be 'shardId-0'`);
  t.equal(getKinesisShardIdFromEventID('shardId-012:'), 'shardId-012', `eventID 'shardId-012:' shardId must be 'shardId-012'`);

  // More real eventIDs
  let eventID = 'shardId-000000000000:49545115243490985018280067714973144582180062593244200961';
  let expected = ['shardId-000000000000', '49545115243490985018280067714973144582180062593244200961'];
  t.deepEqual(getKinesisShardIdAndEventNoFromEventID(eventID), expected, `eventID '${expected}' shardId & eventNo must be ${stringify(expected)}`);

  eventID = 'shardId-123456789012:49545115243490985018280067714973144582180062593244200962';
  expected = ['shardId-123456789012', '49545115243490985018280067714973144582180062593244200962'];
  t.deepEqual(getKinesisShardIdAndEventNoFromEventID(eventID), expected, `eventID '${expected}' shardId & eventNo must be ${stringify(expected)}`);

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
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:kinesis', kinesis: {partitionKey: 'shardId-000:123', data: "dummy_data", sequenceNumber: '123'}, eventName: 'aws:kinesis:record'}, true);

  // valid Kinesis records
  const sampleRecord = samples.sampleKinesisRecord(undefined, undefined, undefined, undefined, samples.sampleKinesisEventSourceArn('eventSourceArnRegion', trim("streamName")), 'eventAwsRegion');
  check(sampleRecord, true);

  const awsKinesisStreamsSampleEvent = samples.awsKinesisStreamsSampleEvent("identityArn", "eventSourceArn");
  awsKinesisStreamsSampleEvent.Records.forEach(record => {
    check(record, true);
  });


  // invalid DynamoDB stream event records
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OTHER"}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {StreamViewType: "KEYS_ONLY"}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE"}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", NewImage: {}}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE"}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", OldImage: {}}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES"}}, false);

  // "valid" DynamoDB stream event records
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "KEYS_ONLY", SequenceNumber: '123'}, eventName: 'MODIFY'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", OldImage: {}, SequenceNumber: '123'}, eventName: 'MODIFY'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", NewImage: {}, SequenceNumber: '123'}, eventName: 'MODIFY'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, NewImage: {}, SequenceNumber: '123'}, eventName: 'MODIFY'}, true);

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
  check({eventSource: 'aws:kinesis', kinesis: {data: "dummy_data"}}, false);

  // "valid" Kinesis records
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:kinesis', kinesis: {partitionKey: 'shardId-000-123', data: "dummy_data", sequenceNumber: '123'}, eventName: 'aws:kinesis:record'}, true);

  // valid Kinesis records
  const sampleRecord = samples.sampleKinesisRecord(undefined, undefined, undefined, undefined, samples.sampleKinesisEventSourceArn('eventSourceArnRegion', trim("streamName")), 'eventAwsRegion');
  check(sampleRecord, true);

  const awsKinesisStreamsSampleEvent = samples.awsKinesisStreamsSampleEvent("identityArn", "eventSourceArn");
  awsKinesisStreamsSampleEvent.Records.forEach(record => {
    check(record, true);
  });

  // invalid - since DynamoDB stream event records
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "KEYS_ONLY", SequenceNumber: '123'}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", OldImage: {}, SequenceNumber: '123'}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", NewImage: {}, SequenceNumber: '123'}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, NewImage: {}, SequenceNumber: '123'}}, false);

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
  check({eventID: 'eventID'}, false);
  check({eventSourceARN: 'eventSourceARN'}, false);
  check({eventID: 'eventID', eventSource: 'aws:other'}, false);
  check({eventSourceARN: 'eventSourceARN', eventSource: 'aws:other'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:other'}, false);

  // invalid Kinesis stream event records
  check({eventSource: 'aws:kinesis'}, false);
  check({eventID: 'eventID', eventSource: 'aws:kinesis'}, false);
  check({eventSourceARN: 'eventSourceARN', eventSource: 'aws:kinesis'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:kinesis'}, false);

  // invalid DynamoDB stream event records
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OTHER", SequenceNumber: '123'}}, false);

  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {StreamViewType: "KEYS_ONLY", SequenceNumber: '123'}, eventName: 'INSERT'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {StreamViewType: "KEYS_ONLY", SequenceNumber: '123'}, eventName: 'MODIFY'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {StreamViewType: "KEYS_ONLY", SequenceNumber: '123'}, eventName: 'REMOVE'}, false);

  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", SequenceNumber: '123'}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", SequenceNumber: '123'}, eventName: 'MODIFY'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", SequenceNumber: '123'}, eventName: 'REMOVE'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", NewImage: {}, SequenceNumber: '123'}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", NewImage: {}, SequenceNumber: '123'}, eventName: 'MODIFY'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", NewImage: {}, SequenceNumber: '123'}, eventName: 'REMOVE'}, false);

  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", SequenceNumber: '123'}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", SequenceNumber: '123'}, eventName: 'INSERT'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", SequenceNumber: '123'}, eventName: 'MODIFY'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", OldImage: {}, SequenceNumber: '123'}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", OldImage: {}, SequenceNumber: '123'}, eventName: 'INSERT'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", OldImage: {}, SequenceNumber: '123'}, eventName: 'MODIFY'}, false);

  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", SequenceNumber: '123'}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", SequenceNumber: '123'}, eventName: 'INSERT'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", SequenceNumber: '123'}, eventName: 'MODIFY'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", SequenceNumber: '123'}, eventName: 'REMOVE'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, SequenceNumber: '123'}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, SequenceNumber: '123'}, eventName: 'INSERT'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, SequenceNumber: '123'}, eventName: 'MODIFY'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", NewImage: {}, SequenceNumber: '123'}}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", NewImage: {}, SequenceNumber: '123'}, eventName: 'MODIFY'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", NewImage: {}, SequenceNumber: '123'}, eventName: 'REMOVE'}, false);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, NewImage: {}, SequenceNumber: '123'}}, false);

  // "valid" DynamoDB stream event records
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "KEYS_ONLY", SequenceNumber: '123'}, eventName: 'INSERT'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "KEYS_ONLY", SequenceNumber: '123'}, eventName: 'MODIFY'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "KEYS_ONLY", SequenceNumber: '123'}, eventName: 'REMOVE'}, true);

  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", SequenceNumber: '123'}, eventName: 'INSERT'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", NewImage: {}, SequenceNumber: '123'}, eventName: 'INSERT'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", OldImage: {}, SequenceNumber: '123'}, eventName: 'INSERT'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", OldImage: {}, SequenceNumber: '123'}, eventName: 'MODIFY'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "OLD_IMAGE", OldImage: {}, SequenceNumber: '123'}, eventName: 'REMOVE'}, true);

  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", SequenceNumber: '123'}, eventName: 'REMOVE'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", NewImage: {}, SequenceNumber: '123'}, eventName: 'INSERT'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", NewImage: {}, SequenceNumber: '123'}, eventName: 'MODIFY'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_IMAGE", NewImage: {}, SequenceNumber: '123'}, eventName: 'REMOVE'}, true);

  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, SequenceNumber: '123'}, eventName: 'REMOVE'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", NewImage: {}, SequenceNumber: '123'}, eventName: 'INSERT'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, NewImage: {}, SequenceNumber: '123'}, eventName: 'INSERT'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, NewImage: {}, SequenceNumber: '123'}, eventName: 'MODIFY'}, true);
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:dynamodb', dynamodb: {Keys: {}, StreamViewType: "NEW_AND_OLD_IMAGES", OldImage: {}, NewImage: {}, SequenceNumber: '123'}, eventName: 'REMOVE'}, true);

  // valid DynamoDB stream event records
  const awsDynamoDBUpdateSampleEvent = samples.awsDynamoDBUpdateSampleEvent("identityArn", "eventSourceArn");
  awsDynamoDBUpdateSampleEvent.Records.forEach(record => {
    check(record, true);
  });

  // invalid - since Kinesis records
  check({eventID: 'eventID', eventSourceARN: 'eventSourceARN', eventSource: 'aws:kinesis', kinesis: {data: "dummy_data"}}, false);

  // invalid  - since Kinesis records
  const sampleRecord = samples.sampleKinesisRecord(undefined, undefined, undefined, undefined, samples.sampleKinesisEventSourceArn('eventSourceArnRegion', trim("streamName")), 'eventAwsRegion');
  check(sampleRecord, false);

  const awsKinesisStreamsSampleEvent = samples.awsKinesisStreamsSampleEvent("identityArn", "eventSourceArn");
  awsKinesisStreamsSampleEvent.Records.forEach(record => {
    check(record, false);
  });

  t.end();
});

