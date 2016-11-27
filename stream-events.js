'use strict';

const arns = require('./arns');
const Strings = require('core-functions/strings');
const isNotBlank = Strings.isNotBlank;
const stringify = Strings.stringify;

/**
 * Utilities for extracting information from AWS Kinesis and AWS DynamoDB stream events.
 * @module aws-core-utils/stream-events
 * @author Byron du Preez
 */
module.exports = {
  /** Returns the event source ARNs of the given stream event's records */
  getEventSourceARNs: getEventSourceARNs,

  /** Extracts and returns the stream names from the given Kinesis stream event's records' eventSourceARNs */
  getKinesisEventSourceStreamNames: getKinesisEventSourceStreamNames,
  /** Extracts and returns the stream name from the given Kinesis stream event record's eventSourceARN */
  getKinesisEventSourceStreamName: getKinesisEventSourceStreamName,

  /** Extracts and returns the table name from the given DynamoDB stream event record's eventSourceARN */
  getDynamoDBEventSourceTableName: getDynamoDBEventSourceTableName,
  /** Extracts and returns the table name from the given DynamoDB stream event record's eventSourceARN */
  getDynamoDBEventSourceTableNameAndStreamTimestamp: getDynamoDBEventSourceTableNameAndStreamTimestamp,

  /** Validates the given stream event record and raises an error if the record is invalid or not a Kinesis or DynamoDB stream event record */
  validateStreamEventRecord: validateStreamEventRecord,
  /** Validates the given Kinesis stream event record and raises an error if the record is invalid or not a Kinesis stream event record */
  validateKinesisStreamEventRecord: validateKinesisStreamEventRecord,
  /** Validates the given DynamoDB stream event record and raises an error if the record is invalid or not a DynamoDB stream event record */
  validateDynamoDBStreamEventRecord: validateDynamoDBStreamEventRecord

  // /* * Returns a truncated version of the partition key and sequence number of the given stream event record for logging purposes */
  // toStreamEventRecordTruncatedKeyInfo: toStreamEventRecordTruncatedKeyInfo,
};

/**
 * Returns the event source ARNs of the given stream event's records (if any); otherwise returns an empty array.
 * @param event - a Kinesis or DynamoDB stream event
 * @returns {string[]} an array of event source ARNs (one for each stream event record)
 */
function getEventSourceARNs(event) {
  return event && event.Records ? event.Records.map(r => r.eventSourceARN) : [];
}

/**
 * Extracts and returns the stream names from the given Kinesis stream event's records' eventSourceARNs (if any); otherwise
 * returns an empty array.
 * @param event - a Kinesis or DynamoDB stream event
 * @returns {string[]} an array of event source stream names (one for each stream event record)
 */
function getKinesisEventSourceStreamNames(event) {
  return event && event.Records ? event.Records.map(getKinesisEventSourceStreamName) : [];
}

/**
 * Extracts and returns the stream name from the given Kinesis stream event record's eventSourceARN (if any); otherwise returns
 * an empty string.
 * @param record - a Kinesis stream event record
 * @returns {string} the stream name (if any) or an empty string
 */
function getKinesisEventSourceStreamName(record) {
  return record && isNotBlank(record.eventSourceARN) ? arns.getArnResources(record.eventSourceARN).resource : '';
}

/**
 * Extracts and returns an arrays containing the table name followed by the stream timestamp/suffix from the given
 * DynamoDB stream event record's eventSourceARN (if any); otherwise returns an array of 2 empty strings.
 *
 * Example of a DynamoDB stream event source ARN:
 * arn:aws:dynamodb:us-east-1:111111111111:table/test/stream/2020-10-10T08:18:22.385
 * where 'test' is the name of the table and '2020-10-10T08:18:22.385' is the stream timestamp/suffix
 *
 * @param record - a DynamoDB stream event record
 * @returns {[string, string]} an array containing the table name (if any or empty) followed by an empty string followed
 * by the stream timestamp/suffix (if any or empty)
 */
function getDynamoDBEventSourceTableNameAndStreamTimestamp(record) {
  if (record && isNotBlank(record.eventSourceARN)) {
    const resources = arns.getArnResources(record.eventSourceARN);
    return [resources.resource, resources.subResource];
  }
  return  ['', ''];
}

/**
 * Extracts and returns the table name from the given DynamoDB stream event record's eventSourceARN (if any); otherwise
 * returns an empty string.
 * @param record - a DynamoDB stream event record
 * @returns {string} the table name (if any) or an empty string (if none)
 */
function getDynamoDBEventSourceTableName(record) {
  return record && isNotBlank(record.eventSourceARN) ? arns.getArnResources(record.eventSourceARN).resource : '';
}
/**
 * Validates the given stream event record and raises an error if the record fails to meet any of the following criteria:
 * 1. It must be defined;
 * 2. It must contain a defined eventSource;
 * 3. It must be either a Kinesis or DynamoDB stream event record; and
 * 4. It must contain the required properties expected of its type (based on its eventSource).
 *
 * @param {Object} record - a Kinesis or DynamoDB stream event record
 * @throws {Error} if the record is invalid
 */
function validateStreamEventRecord(record) {
  if (!record) {
    throw new Error(`Missing entire stream event record (${record})`);
  }
  if (!record.eventSource) {
    throw new Error(`Missing eventSource property for stream event record (${stringify(record)})`);
  }
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
      // Only support Kinesis and DynamoDB stream event records for now
      throw new Error(`Unexpected eventSource (${record.eventSource}) on stream event record (${stringify(record)})`);
  }
}

/**
 * Validates the given Kinesis stream event record and raises an error if the record fails to meet any of the following criteria:
 * 1. It must be defined;
 * 2. It must be a Kinesis stream event record (i.e. must contain an eventSource of "aws:kinesis"); and
 * 3. It must contain kinesis and kinesis.data properties.
 *
 * @param {Object} record - a Kinesis stream event record
 * @param {string} [record.eventSource] - a stream event record's eventSource
 * @param {Object} [record.kinesis] - a Kinesis stream event record's kinesis object
 * @param {string} [record.kinesis.data] - a Kinesis stream event record's kinesis data
 * @throws {Error} if the record is invalid
 */
function validateKinesisStreamEventRecord(record) {
  if (!record) {
    throw new Error(`Missing entire Kinesis stream event record (${record})`);
  }
  if (!record.eventSource) {
    throw new Error(`Missing eventSource property for Kinesis stream event record (${stringify(record)})`);
  }
  if (record.eventSource !== "aws:kinesis") {
    throw new Error(`Unexpected eventSource (${record.eventSource}) on Kinesis stream event record (${stringify(record)})`)
  }
  _validateKinesisStreamEventRecord(record);
}

function _validateKinesisStreamEventRecord(record) {
  if (!record.kinesis) {
    throw new Error(`Missing kinesis property for Kinesis stream event record (${stringify(record)})`);
  }
  if (!record.kinesis.data) {
    throw new Error(`Missing data property for Kinesis stream event record (${stringify(record)})`);
  }
}

/**
 * Validates the given DynamoDB stream event record and raises an error if the record fails to meet any of the following criteria:
 * 1. It must be defined;
 * 2. It must be a DynamoDB stream event record (i.e. must contain an eventSource of "aws:dynamodb");
 * 3. It must contain dynamodb, dynamodb.Keys and dynamodb.StreamViewType properties; and
 * 4. It should contain dynamodb.NewImage and/or dynamodb.OldImage properties according to its StreamViewType.
 *
 * @param {Object} record - a DynamoDB stream event record
 * @param {string} [record.eventSource] - a stream event record's eventSource
 * @param {Object} [record.dynamodb] - a DynamoDB stream event record's dynamodb object
 * @param {Object} [record.dynamodb.Keys] - a DynamoDB stream event record's Keys object
 * @param {string} [record.dynamodb.StreamViewType] - a DynamoDB stream event record's stream view type
 * @param {Object} [record.dynamodb.NewImage] - a DynamoDB stream event record's new image object
 * @param {Object} [record.dynamodb.OldImage] - a DynamoDB stream event record's old image object
 * @throws {Error} if the record is invalid
 */
function validateDynamoDBStreamEventRecord(record) {
  if (!record) {
    throw new Error(`Missing entire DynamoDB stream event record (${record})`);
  }
  if (!record.eventSource) {
    throw new Error(`Missing eventSource property for DynamoDB stream event record (${stringify(record)})`);
  }
  if (record.eventSource !== "aws:dynamodb") {
    throw new Error(`Unexpected eventSource (${record.eventSource}) on DynamoDB stream event record (${stringify(record)})`)
  }
  _validateDynamoDBStreamEventRecord(record);
}

function _validateDynamoDBStreamEventRecord(record) {
  if (!record.dynamodb) {
    throw new Error(`Missing dynamodb property for DynamoDB stream event record (${stringify(record)})`);
  }
  if (!record.dynamodb.Keys) {
    throw new Error(`Missing Keys property for DynamoDB stream event record (${stringify(record)})`);
  }
  if (!record.dynamodb.StreamViewType) {
    throw new Error(`Missing StreamViewType property for DynamoDB stream event record (${stringify(record)})`);
  }
  switch (record.dynamodb.StreamViewType) {
    case 'KEYS_ONLY':
      break;

    case 'NEW_IMAGE':
      if (!record.dynamodb.NewImage) {
        throw new Error(`Missing NewImage property for DynamoDB stream event record (${stringify(record)})`);
      }
      break;

    case 'OLD_IMAGE':
      if (!record.dynamodb.OldImage) {
        throw new Error(`Missing OldImage property for DynamoDB stream event record (${stringify(record)})`);
      }
      break;

    case 'NEW_AND_OLD_IMAGES':
      if (!record.dynamodb.NewImage && !record.dynamodb.OldImage) {
        throw new Error(`Missing both NewImage and OldImage properties for DynamoDB stream event record (${stringify(record)})`);
      }
      break;

    default:
      throw new Error(`Unexpected StreamViewType (${record.dynamodb.StreamViewType}) on DynamoDB stream event record (${stringify(record)})`);
  }
}

// /**
//  * Returns short descriptive key information for the given Kinesis or DynamoDB stream record, which includes the
//  * record's partition key and the first & last 5 characters of its sequence number, for logging purposes.
//  * @param {Object} record - a Kinesis or DynamoDB stream record
//  * @return {string} short descriptive key information for the given record
//  */
// function toStreamEventRecordTruncatedKeyInfo(record) {
//   if (!record) return stringify(record);
//   if (record.kinesis) {
//     let seqNo = record.kinesis.sequenceNumber;
//     let seqNoFragment = seqNo ? seqNo.substring(0, 5) + "..." + seqNo.substring(seqNo.length - 5) : '';
//     return `${record.kinesis.partitionKey} ${seqNoFragment}`;
//   } else if (record.dynamodb) {
//     // TO DO
//   }
// }

