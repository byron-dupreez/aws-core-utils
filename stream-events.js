'use strict';

const arns = require('./arns');

// Constants
const MAX_PARTITION_KEY_SIZE = 256;

/**
 * Utilities for validating and extracting information from AWS Kinesis and AWS DynamoDB stream events.
 * @module aws-core-utils/stream-events
 * @author Byron du Preez
 */
exports._$_ = '_$_'; //IDE workaround

exports.MAX_PARTITION_KEY_SIZE = MAX_PARTITION_KEY_SIZE;

exports.getEventID = getEventID;
exports.getEventName = getEventName;
exports.getEventSource = getEventSource;
exports.getEventSourceARN = getEventSourceARN;

exports.getEventSourceARNs = getEventSourceARNs;
exports.getEventSources = getEventSources;

exports.getKinesisEventSourceStreamNames = getKinesisEventSourceStreamNames;
exports.getKinesisEventSourceStreamName = getKinesisEventSourceStreamName;
exports.getKinesisShardId = getKinesisShardId;
exports.getKinesisShardIdFromEventID = getKinesisShardIdFromEventID;
exports.getKinesisShardIdAndEventNoFromEventID = getKinesisShardIdAndEventNoFromEventID;

exports.getKinesisSequenceNumber = getKinesisSequenceNumber;

exports.getDynamoDBEventSourceTableNames = getDynamoDBEventSourceTableNames;
exports.getDynamoDBEventSourceTableName = getDynamoDBEventSourceTableName;
exports.getDynamoDBEventSourceTableNameAndStreamTimestamp = getDynamoDBEventSourceTableNameAndStreamTimestamp;

exports.getDynamoDBSequenceNumber = getDynamoDBSequenceNumber;

exports.validateStreamEventRecord = validateStreamEventRecord;
exports.validateKinesisStreamEventRecord = validateKinesisStreamEventRecord;
exports.validateDynamoDBStreamEventRecord = validateDynamoDBStreamEventRecord;

// exports.toStreamEventRecordTruncatedKeyInfo = toStreamEventRecordTruncatedKeyInfo;

/**
 * Valid event names for a DynamoDB stream event.
 * @enum {string}
 * @readonly
 */
const DynamoDBEventName = {
  INSERT: 'INSERT',
  MODIFY: 'MODIFY',
  REMOVE: 'REMOVE'
};
exports.DynamoDBEventName = DynamoDBEventName;

/**
 * Returns the event id from the given stream event record.
 * @param {AnyStreamEventRecord|*} record - a stream event record
 * @returns {string} the event id (if any) or an empty string
 */
function getEventID(record) {
  return record && record.eventID ? record.eventID : '';
}

/**
 * Returns the event name from the given stream event record.
 * @param {AnyStreamEventRecord|*} record - a stream event record
 * @returns {string} the event name (if any) or an empty string
 */
function getEventName(record) {
  return record && record.eventName ? record.eventName : '';
}

/**
 * Returns the event source from the given stream event record.
 * @param {AnyStreamEventRecord|*} record - a stream event record
 * @returns {string} the event source (if any) or an empty string
 */
function getEventSource(record) {
  return record && record.eventSource ? record.eventSource : '';
}

/**
 * Returns the event source ARN from the given stream event record.
 * @param {AnyStreamEventRecord|*} record - a stream event record
 * @returns {string} the event source ARN (if any) or an empty string
 */
function getEventSourceARN(record) {
  return record && record.eventSourceARN ? record.eventSourceARN : '';
}

/**
 * Returns the event source ARNs of the given stream event's records (if any); otherwise returns an empty array.
 * @param {AnyStreamEvent|*} event - a Kinesis or DynamoDB stream event
 * @returns {string[]} an array of event source ARNs (one for each stream event record)
 */
function getEventSourceARNs(event) {
  return event && Array.isArray(event.Records) ? event.Records.map(getEventSourceARN) : [];
}

/**
 * Returns the event sources of the given stream event's records (if any); otherwise returns an empty array.
 * @param {AnyStreamEvent|*} event - a Kinesis or DynamoDB stream event
 * @returns {string[]} an array of event sources (one for each stream event record)
 */
function getEventSources(event) {
  return event && Array.isArray(event.Records) ? event.Records.map(getEventSource) : [];
}

/**
 * Extracts and returns the stream names from the given Kinesis stream event's records' eventSourceARNs (if any); otherwise
 * returns an empty array.
 * @param {KinesisEvent|*} event - a Kinesis stream event
 * @returns {string[]} an array of event source stream names (one for each stream event record)
 */
function getKinesisEventSourceStreamNames(event) {
  return event && Array.isArray(event.Records) ? event.Records.map(getKinesisEventSourceStreamName) : [];
}

/**
 * Extracts and returns the stream name from the given Kinesis stream event record's eventSourceARN (if any); otherwise returns
 * an empty string.
 * @param {KinesisEventRecord|*} record - a Kinesis stream event record
 * @returns {string} the stream name (if any) or an empty string
 */
function getKinesisEventSourceStreamName(record) {
  return record && record.eventSourceARN ? arns.getArnResources(record.eventSourceARN).resource : '';
}

/**
 * Extracts the shard id from the given Kinesis record's eventID.
 * @param {KinesisEventRecord|*} record - a Kinesis stream event record
 * @returns {string} the shard id (if any) or an empty string
 */
function getKinesisShardId(record) {
  return record && record.eventID ? getKinesisShardIdFromEventID(record.eventID) : '';
}

/**
 * Extracts the shard id from the given Kinesis eventID.
 * @param {string} eventID - an eventID from an AWS Kinesis stream event record.
 * @return {string|undefined} the shard id (if any) or an empty string
 */
function getKinesisShardIdFromEventID(eventID) {
  if (eventID) {
    const sepPos = eventID.indexOf(':');
    return sepPos !== -1 ? eventID.substring(0, sepPos) : '';
  }
  return '';
}

/**
 * Extracts the shard id and event number from the given Kinesis eventID.
 * @param {string} eventID - an eventID from an AWS Kinesis stream event record.
 * @return {[string,string]} an array containing: the shard id (if any) or an empty string; and the event number (if any)
 * or an empty string
 */
function getKinesisShardIdAndEventNoFromEventID(eventID) {
  if (eventID) {
    const sepPos = eventID.indexOf(':');
    return sepPos !== -1 ?
      [eventID.substring(0, sepPos), eventID.substring(sepPos + 1),] : ['', ''];
  }
  return ['', ''];
}

/**
 * Gets the sequence number from the given Kinesis stream event record.
 * @param {KinesisEventRecord|*} record - a Kinesis stream event record
 * @returns {string} the sequence number (if any) or an empty string
 */
function getKinesisSequenceNumber(record) {
  return record && record.kinesis && record.kinesis.sequenceNumber ? record.kinesis.sequenceNumber : '';
}

/**
 * Extracts and returns an arrays containing the table name followed by the stream timestamp/suffix from the given
 * DynamoDB stream event record's eventSourceARN (if any); otherwise returns an array of 2 empty strings.
 *
 * Example of a DynamoDB stream event source ARN:
 * arn:aws:dynamodb:us-east-1:111111111111:table/test/stream/2020-10-10T08:18:22.385
 * where 'test' is the name of the table and '2020-10-10T08:18:22.385' is the stream timestamp/suffix
 *
 * @param {DynamoDBEventRecord|*} record - a DynamoDB stream event record
 * @returns {[string, string]} an array containing the table name (if any or empty) followed by an empty string followed
 * by the stream timestamp/suffix (if any or empty)
 */
function getDynamoDBEventSourceTableNameAndStreamTimestamp(record) {
  if (record && record.eventSourceARN) {
    const resources = arns.getArnResources(record.eventSourceARN);
    return [resources.resource, resources.subResource];
  }
  return ['', ''];
}

/**
 * Extracts and returns the table names from the given DynamoDB stream event's records' eventSourceARNs (if any);
 * otherwise returns an empty array.
 * @param {DynamoDBEvent|*} event - a DynamoDB stream event
 * @returns {string[]} an array of event source table names (one for each stream event record)
 */
function getDynamoDBEventSourceTableNames(event) {
  return event && Array.isArray(event.Records) ? event.Records.map(getDynamoDBEventSourceTableName) : [];
}

/**
 * Extracts and returns the table name from the given DynamoDB stream event record's eventSourceARN (if any); otherwise
 * returns an empty string.
 * @param {DynamoDBEventRecord|*} record - a DynamoDB stream event record
 * @returns {string} the table name (if any) or an empty string (if none)
 */
function getDynamoDBEventSourceTableName(record) {
  return record && record.eventSourceARN ? arns.getArnResources(record.eventSourceARN).resource : '';
}

/**
 * Returns the sequence number from the given DynamoDB stream event record.
 * @param {DynamoDBEventRecord|*} record - a DynamoDB stream event record
 * @returns {string} the sequence number (if any) or an empty string
 */
function getDynamoDBSequenceNumber(record) {
  return record && record.dynamodb && record.dynamodb.SequenceNumber ? record.dynamodb.SequenceNumber : '';
}

/**
 * Validates the given stream event record and raises an error if the record fails to meet any of the following criteria:
 * 1. It must be a valid stream event record according to {@linkcode _validateStreamEventRecord};
 * 2. It must be either a Kinesis or DynamoDB stream event record; and
 * 3. It must contain the required properties expected of its type (based on its eventSource).
 *
 * @param {AnyStreamEventRecord|*} record - a Kinesis or DynamoDB stream event record
 * @throws {Error} if the record is invalid
 */
function validateStreamEventRecord(record) {
  _validateStreamEventRecord(record);

  switch (record.eventSource) {
    case "aws:kinesis":
      // Kinesis stream event record
      _validateKinesisStreamEventRecord(record);
      break;

    case "aws:dynamodb":
      // DynamoDB stream event record
      _validateDynamoDBStreamEventRecord(record);
      break;

    default:
      // Only support Kinesis and DynamoDB stream event records
      throw new Error(`Unexpected eventSource (${record.eventSource}) on stream event record (${record.eventID})`);
  }
}

/**
 * Validates the given stream event record and raises an error if the record fails to meet any of the following criteria:
 * 1. It must be a non-null object
 * 2. It must contain a defined eventID;
 * 3. It must contain a defined eventSourceARN;
 * 4. It must contain a defined eventSource;
 *
 * @param {AnyStreamEventRecord|*} record - a Kinesis or DynamoDB stream event record
 * @throws {Error} if the record is invalid
 */
function _validateStreamEventRecord(record) {
  if (!record || typeof record !== 'object') {
    throw new Error(`Invalid stream event record (${record}) - record must be a non-null object`);
  }
  if (!record.eventID) {
    throw new Error(`Missing eventID property for stream event record (${record.eventID})`);
  }
  if (!record.eventSourceARN) {
    throw new Error(`Missing eventSourceARN property for stream event record (${record.eventID})`);
  }
  if (!record.eventSource) {
    throw new Error(`Missing eventSource property for stream event record (${record.eventID})`);
  }
  if (!record.eventName) {
    throw new Error(`Missing eventName property for stream event record (${record.eventID})`);
  }
}

/**
 * Validates the given Kinesis stream event record and raises an error if the record fails to meet any of the following criteria:
 * 1. It must be a valid stream event record according to {@linkcode _validateStreamEventRecord};
 * 2. It must be a Kinesis stream event record (i.e. must contain an eventSource of "aws:kinesis"); and
 * 3. It must contain kinesis and kinesis.data properties.
 *
 * @param {KinesisEventRecord|*} record - a Kinesis stream event record
 * @throws {Error} if the record is invalid
 */
function validateKinesisStreamEventRecord(record) {
  _validateStreamEventRecord(record);

  if (record.eventSource !== "aws:kinesis") {
    throw new Error(`Unexpected eventSource (${record.eventSource}) on Kinesis stream event record (${record.eventID})`)
  }
  _validateKinesisStreamEventRecord(record);
}

/**
 * Validates the given Kinesis stream event record.
 * @param {KinesisEventRecord|*} record - a Kinesis stream event record
 * @private
 */
function _validateKinesisStreamEventRecord(record) {
  if (!record.kinesis) {
    throw new Error(`Missing kinesis property for Kinesis stream event record (${record.eventID})`);
  }
  if (!record.kinesis.data) {
    throw new Error(`Missing data property for Kinesis stream event record (${record.eventID})`);
  }
  if (!record.kinesis.partitionKey) {
    throw new Error(`Missing partitionKey property for Kinesis stream event record (${record.eventID})`);
  }
  if (!record.kinesis.sequenceNumber) {
    throw new Error(`Missing sequenceNumber property for Kinesis stream event record (${record.eventID})`);
  }
}

/**
 * Validates the given DynamoDB stream event record and raises an error if the record fails to meet any of the following criteria:
 * 1. It must be a valid stream event record according to {@linkcode _validateStreamEventRecord};
 * 2. It must be a DynamoDB stream event record (i.e. must contain an eventSource of "aws:dynamodb");
 * 3. It must contain dynamodb, dynamodb.Keys and dynamodb.StreamViewType properties; and
 * 4. It should contain dynamodb.NewImage and/or dynamodb.OldImage properties according to its StreamViewType.
 *
 * @param {DynamoDBEventRecord|*} record - a DynamoDB stream event record
 * @throws {Error} if the record is invalid
 */
function validateDynamoDBStreamEventRecord(record) {
  _validateStreamEventRecord(record);

  if (record.eventSource !== "aws:dynamodb") {
    throw new Error(`Unexpected eventSource (${record.eventSource}) on DynamoDB stream event record (${record.eventID})`)
  }
  _validateDynamoDBStreamEventRecord(record);
}

/**
 * Returns true if the given DynamoDB event name OR given DynamoDB stream event record's eventName is valid; false otherwise
 * @param {string|DynamoDBEventRecord} recordOrEventName - a DynamoDB event name OR DynamoDB stream event record
 * @returns {boolean} true if valid; false otherwise
 */
function isDynamoDBEventNameValid(recordOrEventName) {
  const eventName = recordOrEventName.eventName ? recordOrEventName.eventName : recordOrEventName;
  return eventName === DynamoDBEventName.INSERT || eventName === DynamoDBEventName.MODIFY || eventName === DynamoDBEventName.REMOVE;
}

/**
 * Validates the given DynamoDB stream event record.
 * @param {DynamoDBEventRecord|*} record - a DynamoDB stream event record
 * @private
 */
function _validateDynamoDBStreamEventRecord(record) {
  if (!isDynamoDBEventNameValid(record)) {
    throw new Error(`Invalid eventName property (${record.eventName}) for DynamoDB stream event record (${record.eventID})`);
  }
  if (!record.dynamodb) {
    throw new Error(`Missing dynamodb property for DynamoDB stream event record (${record.eventID})`);
  }
  if (!record.dynamodb.Keys) {
    throw new Error(`Missing Keys property for DynamoDB stream event record (${record.eventID})`);
  }
  if (!record.dynamodb.SequenceNumber) {
    throw new Error(`Missing SequenceNumber property for DynamoDB stream event record (${record.eventID})`);
  }
  if (!record.dynamodb.StreamViewType) {
    throw new Error(`Missing StreamViewType property for DynamoDB stream event record (${record.eventID})`);
  }
  switch (record.dynamodb.StreamViewType) {
    case 'KEYS_ONLY':
      break;

    case 'NEW_IMAGE':
      if (!record.dynamodb.NewImage && record.eventName !== 'REMOVE') {
        throw new Error(`Missing NewImage property for DynamoDB stream event record (${record.eventID})`);
      }
      break;

    case 'OLD_IMAGE':
      if (!record.dynamodb.OldImage && record.eventName !== 'INSERT') {
        throw new Error(`Missing OldImage property for DynamoDB stream event record (${record.eventID})`);
      }
      break;

    case 'NEW_AND_OLD_IMAGES':
      if ((!record.dynamodb.NewImage && record.eventName !== 'REMOVE') || (!record.dynamodb.OldImage && record.eventName !== 'INSERT')) {
        throw new Error(`Missing both NewImage and OldImage properties for DynamoDB stream event record (${record.eventID})`);
      }
      break;

    default:
      throw new Error(`Unexpected StreamViewType (${record.dynamodb.StreamViewType}) on DynamoDB stream event record (${record.eventID})`);
  }
}