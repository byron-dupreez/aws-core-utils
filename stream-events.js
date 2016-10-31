'use strict';

const arns = require('./arns');
const Strings = require('core-functions/strings');
const isNotBlank = Strings.isNotBlank;

/**
 * Utilities for extracting information from AWS Kinesis and AWS DynamoDB stream events.
 * @module aws-core-utils/stream-events
 * @author Byron du Preez
 */
module.exports = {
  /** Returns the event source ARNs of the given stream event's records */
  getEventSourceARNs: getEventSourceARNs,
  /** Extracts and returns the stream names from the given stream event's records' eventSourceARNs */
  getEventSourceStreamNames: getEventSourceStreamNames,
  /** Extracts and returns the stream name from the given stream event record's eventSourceARN */
  getEventSourceStreamName: getEventSourceStreamName
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
 * Extracts and returns the stream names from the given stream event's records' eventSourceARNs (if any); otherwise
 * returns an empty array.
 * @param event - a Kinesis or DynamoDB stream event
 * @returns {string[]} an array of event source stream names (one for each stream event record)
 */
function getEventSourceStreamNames(event) {
  return event && event.Records ? event.Records.map(getEventSourceStreamName) : [];
}

/**
 * Extracts and returns the stream name from the given stream event record's eventSourceARN (if any); otherwise returns
 * an empty string.
 * @param record - a Kinesis or DynamoDB stream event record
 * @returns {string} the stream name (if any) or an empty string
 */
function getEventSourceStreamName(record) {
  return record && isNotBlank(record.eventSourceARN) ? arns.getArnResources(record.eventSourceARN).resource : '';
}
