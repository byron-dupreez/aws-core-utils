'use strict';

/**
 * Utilities for resolving the AWS region from various sources (primarily for AWS Lambda usage).
 * @module aws-core-utils/regions
 * @author Byron du Preez
 */
module.exports = {
  getRegion: getRegion,
  setRegion: setRegion,
  getDefaultRegion: getDefaultRegion,
  //getRegionOrDefault: getRegionOrDefault,
  getInvokedFunctionArnRegion: getInvokedFunctionArnRegion,
  getEventAwsRegions: getEventAwsRegions,
  getEventSourceArnRegions: getEventSourceArnRegions,
  configureRegion: configureRegion,
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
const getArnRegion = arns.getArnRegion;

/**
 * Gets the region in which this function is running from the `AWS_REGION` environment variable and returns it as is if
 * it's neither "undefined" nor "null"; otherwise logs a warning and returns undefined if it's "undefined" or "null" (or
 * undefined).
 *
 * The `AWS_REGION` environment variable is the best option to use to get the region within AWS Lambda code (and the
 * only option to use at module-level scope), since these environment variables will be set by AWS Lambda.
 *
 * An optional "hidden" 'failFast' boolean argument, which defaults to false, can be passed as true to raise an error if
 * the AWS_REGION env variable is not available or unusable
 *
 * @returns {string|undefined} the AWS region (if it exists); otherwise undefined.
 */
function getRegion() {
  const awsRegion = trim(process.env.AWS_REGION);
  const region = awsRegion !== "undefined" && awsRegion !== "null" ? awsRegion : undefined;
  if (!region) {
    const errorMsg = `Failed to get usable region from AWS_REGION env variable (${awsRegion}) - for unit testing call setRegion beforehand`;
    const failFast = arguments.length > 0 && arguments[0] === true;
    if (failFast) {
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    console.warn(errorMsg);
  }
  return region;
}

/**
 * Sets the `AWS_REGION` environment variable to the given region (if it's NOT undefined, "undefined", null or "null");
 * otherwise deletes `process.env.AWS_REGION`, which effectively "sets" it to undefined. NB: `delete` is used to avoid
 * the undesirable behaviour where setting `process.env.AWS_REGION` to undefined or null results in it containing the
 * string "undefined" or "null" respectively. NB: This only sets the region temporarily on the current process and
 * should largely only be used for testing purposes.
 * @param {string|undefined|null} awsRegion - the region to set on or delete from process.env.AWS_REGION
 */
function setRegion(awsRegion) {
  const region = trim(awsRegion);
  if (region === undefined || region === null || region === 'undefined' || region === 'null') {
    // If the given region is undefined or null, then must delete process.env.AWS_REGION rather than setting it to
    // undefined or null, which incorrectly sets it to the strings "undefined" or "null" respectively
    delete process.env.AWS_REGION;
  } else {
    process.env.AWS_REGION = region;
  }
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
 * @deprecated use `setRegion` instead
 * @returns {boolean} true if set; false otherwise.
 */
function setRegionIfNotSet(awsRegion) {
  const newRegion = trim(awsRegion);

  // Check if AWS region is already set or not
  const region = getRegionRaw();
  if (isBlank(region)) {
    setRegion(newRegion);
    return true;
  }
  if (process.env.AWS_REGION !== newRegion) {
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

/**
 * Keeps context.region as is if it's already configured on the given context, otherwise gets the current region from
 * process.env.AWS_REGION and if it's not blank, sets it on the context as context.region; otherwise either throws an
 * error if failFast is explicitly true.
 * @deprecated simply use `getRegion` directly instead when the region is required
 * @param {Object|RegionAware} context - a context on which to set the region
 * @param {boolean|undefined} [failFast] - an optional flag that is only used when AWS_REGION is needed and blank and
 * that determines whether the error will be raised (if failFast is explicitly true) or simply logged as a warning
 * @returns {RegionAware} the context with its existing region or the current AWS_REGION env variable value.
 * @throws {Error} if failFast is explicitly true and an AWS_REGION env variable is needed and not available
 */
function configureRegion(context, failFast) {
  // Resolve the AWS region, if it is not already defined on the context
  if (!context.region) {
    context.region = getRegion(failFast === true);
  }
  (context.info ? context.info : console.log)(`Using region (${getRegion()}) + context.region (${context.region})`);
  return context;
}