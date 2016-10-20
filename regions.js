'use strict';

/**
 * Utilities for resolving the AWS region from various sources (primarily for AWS Lambda usage).
 * @module aws-core-utils/regions
 * @author Byron du Preez
 */
module.exports = {
  getRegion: getRegion,
  getDefaultRegion: getDefaultRegion,
  //getRegionOrDefault: getRegionOrDefault,
  getInvokedFunctionArnRegion: getInvokedFunctionArnRegion,
  getEventAwsRegions: getEventAwsRegions,
  getEventSourceArnRegions: getEventSourceArnRegions,
  //resolveRegion: resolveRegion,
  ONLY_FOR_TESTING: {
    getRegionRaw: getRegionRaw,
    getDefaultRegionRaw: getDefaultRegionRaw,
    setRegionIfNotSet: setRegionIfNotSet
  }
};

const Strings = require('core-functions/strings');
const isBlank = Strings.isBlank;
const isNotBlank = Strings.isNotBlank;
const trim = Strings.trim;
const trimOrEmpty = Strings.trimOrEmpty;

const arns = require('./arns');
// const getArnComponent = arns.getArnComponent;
// const getArnPartition = arns.getArnPartition;
// const getArnService = arns.getArnService;
const getArnRegion = arns.getArnRegion;
// const getArnAccountId = arns.getArnAccountId;
// const getArnResources = arns.getArnResources;

/**
 * Gets the region in which this function is running from the AWS_REGION environment variable (if it exists); otherwise
 * returns an empty string.
 *
 * This is the best option to use to get the region within AWS Lambda code (and the only option to use at module-level
 * scope), since these environment variables will be set by AWS Lambda.
 *
 * @returns {string} the AWS region (if it exists); otherwise an empty string.
 */
function getRegion() {
  return trimOrEmpty(process.env.AWS_REGION);
}

/**
 * Gets the region from the AWS_DEFAULT_REGION environment variable; otherwise returns an empty string.
 * @returns {string} the AWS default region (if it exists); otherwise an empty string
 */
function getDefaultRegion() {
  return trimOrEmpty(process.env.AWS_DEFAULT_REGION);
}

/**
 * Sets the process.env.AWS_REGION environment variable to the given region, but ONLY if is is not already set!
 * NB: This only sets the region temporarily on the current process and should probably only be used for testing purposes.
 * @returns {boolean} true if set; false otherwise.
 */
function setRegionIfNotSet(awsRegion) {
  // Replaces an undefined or null awsRegion with '', otherwise it will become 'undefined' or 'null' on process.env
  const newRegion = trimOrEmpty(awsRegion);

  // Check if AWS region is already set or not
  const region = getRegion();
  if (isBlank(region)) {
    // Attempt to set the AWS_REGION
    try {
      process.env.AWS_REGION = newRegion;
      return true;
    } catch (err) {
      console.error(`Failed to set AWS_REGION env variable to (${newRegion}) - ${err}`, err.stack);
    }
  } else {
    console.log(`Ignoring attempt to change ALREADY set AWS_REGION env variable (${process.env.AWS_REGION}) to (${newRegion})`);
  }
  return false;
}

/**
 * Extracts the region from the invokedFunctionArn of the given AWS Lambda context, which was passed to your Lambda
 * function.
 * @param {Object} awsContext the AWS context
 * @returns {string} the AWS region (if extracted); otherwise an empty string
 */
function getInvokedFunctionArnRegion(awsContext) {
  return awsContext && isNotBlank(awsContext.invokedFunctionArn) ? getArnRegion(awsContext.invokedFunctionArn) : '';
}

/**
 * Extracts the regions from the given event's record's awsRegion properties (if any); otherwise returns an empty array.
 *
 * Note that for this to work rhe given event should have records with an awsRegion property, which is the case for AWS
 * Kinesis and DynamoDB stream events and for S3 Put and Delete events (and possibly for other AWS events as well).
 *
 * @param event the event from which to extract its records' AWS regions
 * @returns {string[]} the event's records' AWS regions (if any) or an empty array
 */
function getEventAwsRegions(event) {
  return event && event.Records ?
    event.Records.map(record => record.awsRegion ? trimOrEmpty(event.awsRegion) : '') : [];
}

/**
 * Extracts the regions from the given event's record's eventSourceARN properties (if any); otherwise returns an empty
 * array.
 *
 * Note that for this to work the given event should have records with an eventSourceARN property, which is the case for
 * AWS Kinesis and DynamoDB stream events.
 *
 * @param event the event from which to extract its records' event source ARN regions
 * @returns {string[]} the event's records' event source ARN regions (if any) or an empty array
 */
function getEventSourceArnRegions(event) {
  return event && event.Records ?
    event.Records.map(record => record.eventSourceARN ? getArnRegion(record.eventSourceARN) : '') : [];
}

// /**
//  * Extracts a region from the following resources in the following order:
//  * 1. Using {@linkcode getRegion}
//  * 2. The region extracted from the given AWS context's invokedFunctionArn (if any)
//  * 3. The first non-blank awsRegion (if any) extracted from the event's records
//  * 4. The first non-blank eventSourceARN region (if any) extracted from the event's records
//  *
//  * The detailed process followed is as follows:
//  * 1. Attempts to get the region using {@linkcode getRegion} (i.e. from AWS-specific environment variables).
//  *
//  * 2. Extracts and returns the region from the given awsContext's invokedFunctionArn, if it contains an
//  *    invokedFunctionArn in the form of "arn:aws:lambda:<region>:<accountId>:function:<functionName>[:functionAlias]".
//  *
//  * 3. Returns the first non-blank awsRegion (if any) extracted from the event's records, if any of them contain an awsRegion property.
//  *
//  * 4. Returns the first non-blank eventSourceARN region (if any) extracted from the event's records, if any of them contain an
//  *
//  * Extracts and returns the region from the given event's eventSourceARN, if it contains an eventSourceARN
//  *    in the form of "arn:aws:kinesis:<region>:<accountId>:stream/<streamName>".
//  *
//  * 5. Gives up and returns an empty string.
//  *
//  * @param {Object} event the Kinesis event to be checked
//  * @param {Object} awsContext the AWS context
//  * @return {string} the region if found; otherwise an empty string
//  */
// function resolveRegion(event, awsContext) {
//   // Attempt 1
//   let region = getRegion();
//   if (isNotBlank(region)) {
//     return region;
//   }
//   // Attempt 2
//   region = getInvokedFunctionArnRegion(awsContext);
//   if (isNotBlank(region)) {
//     return region;
//   }
//   // Attempt 3
//   region = getEventAwsRegions(event).find(r => isNotBlank(r));
//   if (isNotBlank(region)) {
//     return region;
//   }
//   // Attempt 4
//   region = getEventSourceArnRegions(event).find(r => isNotBlank(r));
//   if (isNotBlank(region)) {
//     return region;
//   }
//   // Give up
//   return '';
// }


/**
 * Gets the region in which this function is running from the AWS_REGION environment variable (if it exists); otherwise
 * returns an empty string, undefined or null.
 *
 * Note: Added for testing, use {@linkcode getRegion} instead, which also converts undefined and null to empty strings
 *
 * @returns {string|undefined|null} the AWS region (if it exists); otherwise an empty string, undefined or null.
 */
function getRegionRaw() {
  return trim(process.env.AWS_REGION);
}

/**
 * Gets the region from the AWS_DEFAULT_REGION environment variable (if it exists); otherwise returns an empty string,
 * undefined or null.
 *
 * Note: Added for testing, use {@linkcode getDefaultRegion} instead, which also converts undefined and null to empty
 * strings
 *
 * @returns {string|undefined|null} the AWS default region (if it exists); otherwise an empty string, undefined or null
 */
function getDefaultRegionRaw() {
  return trim(process.env.AWS_DEFAULT_REGION);
}
