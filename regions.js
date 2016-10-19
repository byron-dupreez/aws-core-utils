'use strict';

/**
 * Utilities for resolving the AWS region from various sources (primarily for AWS Lambda usage).
 * @module aws-core-utils/regions
 * @author Byron du Preez
 */
module.exports = {
  getAwsRegion: getAwsRegion,
  getAwsDefaultRegion: getAwsDefaultRegion,
  getAwsRegionOrDefault: getAwsRegionOrDefault,
  getInvokedFunctionArnRegion: getInvokedFunctionArnRegion,
  getEventAwsRegion: getEventAwsRegion,
  getEventSourceArnRegion: getEventSourceArnRegion,
  resolveRegion: resolveRegion,
  ONLY_FOR_TESTING: {
    getAwsRegionRaw: getAwsRegionRaw,
    getAwsDefaultRegionRaw: getAwsDefaultRegionRaw,
    setAwsRegionIfNotSet: setAwsRegionIfNotSet
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
function getAwsRegion() {
  return trimOrEmpty(process.env.AWS_REGION);
}

/**
 * Gets the region from the AWS_DEFAULT_REGION environment variable; otherwise returns an empty string.
 * @returns {string} the AWS default region (if it exists); otherwise an empty string
 */
function getAwsDefaultRegion() {
  return trimOrEmpty(process.env.AWS_DEFAULT_REGION);
}

/**
 * Gets the region from the AWS_REGION environment variable if it exists; otherwise from the AWS_DEFAULT_REGION
 * environment variable.
 * @returns {string} the AWS region (if it exists); otherwise the AWS default region (if that exists; otherwise an empty
 * string.
 */
function getAwsRegionOrDefault() {
  const awsRegion = getAwsRegion();
  return isNotBlank(awsRegion) ? awsRegion : getAwsDefaultRegion();
}

/**
 * Sets the process.env.AWS_REGION environment variable to the given region, but ONLY if is is not already set!
 * NB: This only sets the region temporarily on the current process and should probably only be used for testing purposes.
 * @returns {boolean} true if set; false otherwise.
 */
function setAwsRegionIfNotSet(awsRegion) {
  // Replaces an undefined or null awsRegion with '', otherwise it will become 'undefined' or 'null' on process.env
  const newRegion = trimOrEmpty(awsRegion);

  // Check if AWS region is already set or not
  const region = getAwsRegion();
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
 * Extracts the region from the given event's awsRegion property (if any); otherwise returns an empty string.
 *
 * Note that for this to work rhe given event should have an awsRegion property, which is the case for AWS Kinesis and
 * DynamoDB stream events and for S3 Put and Delete events (and possibly for other AWS events as well).
 *
 * @param event the event from which to extract the awsRegion
 * @returns {string} the AWS region (if extracted) or an empty string
 */
function getEventAwsRegion(event) {
  return event && event.awsRegion ? trimOrEmpty(event.awsRegion) : '';
}

/**
 * Extracts the region from the given event's eventSourceARN property (if any); otherwise returns an empty string.
 *
 * Note that for this to work the given event should have an eventSourceARN property, which is the case for AWS Kinesis
 * and DynamoDB stream events.
 *
 * @param event the event from which to access the eventSourceARN property
 * @returns {string} the AWS region (if extracted) or an empty string
 */
function getEventSourceArnRegion(event) {
  return event && isNotBlank(event.eventSourceARN) ? getArnRegion(event.eventSourceARN) : '';
}

/**
 * Extracts a region from the following resources in the following order:
 * 1. Using {@linkcode getAwsRegion}
 * 2. awsContext.invokedFunctionArn
 * 3. event.awsRegion
 * 4. awsContext.eventSourceARN
 *
 * The detailed process followed is as follows:
 * 1. Attempts to get the region using {@linkcode getAwsRegion} (i.e. from AWS-specific environment variables).
 *
 * 2. Extracts and returns the region from the given awsContext's invokedFunctionArn, if it contains an
 *    invokedFunctionArn in the form of "arn:aws:lambda:<region>:<accountId>:function:<functionName>[:functionAlias]".
 *    The ARN might be either a function ARN or an alias ARN (prefer the latter!). An unqualified ARN executes the
 *    $LATEST version (and cannot be used to extract an alias) and aliases execute the function version to which it they
 *    are pointing.
 *
 * 3. Returns the awsRegion from the given event's awsRegion, if it contains an awsRegion property.
 *
 * 4. Extracts and returns the region from the given event's eventSourceARN, if it contains an eventSourceARN
 *    in the form of "arn:aws:kinesis:<region>:<accountId>:stream/<streamName>".
 *
 * 5. Gives up and returns an empty string.
 *
 * @param {Object} event the Kinesis event to be checked
 * @param {Object} awsContext the AWS context
 * @return {string} the region if found; otherwise an empty string
 */
function resolveRegion(event, awsContext) {
  // Attempt 1
  let region = getAwsRegion();
  if (isNotBlank(region)) {
    return region;
  }
  // Attempt 2
  region = getInvokedFunctionArnRegion(awsContext);
  if (isNotBlank(region)) {
    return region;
  }
  // Attempt 3
  region = getEventAwsRegion(event);
  if (isNotBlank(region)) {
    return region;
  }
  // Attempt 4
  region = getEventSourceArnRegion(event);
  if (isNotBlank(region)) {
    return region;
  }
  // Give up
  return '';
}


/**
 * Gets the region in which this function is running from the AWS_REGION environment variable (if it exists); otherwise
 * returns an empty string, undefined or null.
 *
 * Note: Added for testing, use {@linkcode getAwsRegion} instead, which also converts undefined and null to empty strings
 *
 * @returns {string|undefined|null} the AWS region (if it exists); otherwise an empty string, undefined or null.
 */
function getAwsRegionRaw() {
  return trim(process.env.AWS_REGION);
}

/**
 * Gets the region from the AWS_DEFAULT_REGION environment variable (if it exists); otherwise returns an empty string,
 * undefined or null.
 *
 * Note: Added for testing, use {@linkcode getAwsDefaultRegion} instead, which also converts undefined and null to empty
 * strings
 *
 * @returns {string|undefined|null} the AWS default region (if it exists); otherwise an empty string, undefined or null
 */
function getAwsDefaultRegionRaw() {
  return trim(process.env.AWS_DEFAULT_REGION);
}

