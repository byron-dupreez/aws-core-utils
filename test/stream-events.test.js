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

const Strings = require('core-functions/strings');
const trim = Strings.trim;
const trimOrEmpty = Strings.trimOrEmpty;
const isNotBlank = Strings.isNotBlank;
const stringify = Strings.stringify;

const samples = require('./samples');

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
