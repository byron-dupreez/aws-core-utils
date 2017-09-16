'use strict';

const Strings = require('core-functions/strings');
const isNotBlank = Strings.isNotBlank;
const trim = Strings.trim;
const trimOrEmpty = Strings.trimOrEmpty;

const arns = require('./arns');
const getArnRegion = arns.getArnRegion;

// A map of region key objects by region, which is only needed, because WeakMaps can ONLY have object keys
const regionKeysByRegion = new Map();

/**
 * Utilities for resolving the AWS region from various sources (primarily for AWS Lambda usage).
 * @module aws-core-utils/regions
 * @author Byron du Preez
 */
exports._ = '_'; //IDE workaround

exports.getRegion = getRegion;
exports.setRegion = setRegion;
exports.getDefaultRegion = getDefaultRegion;
exports.getInvokedFunctionArnRegion = getInvokedFunctionArnRegion;
exports.getEventAwsRegions = getEventAwsRegions;
exports.getEventSourceArnRegions = getEventSourceArnRegions;
exports.configureRegion = configureRegion;

exports.getRegionKey = getRegionKey;
exports.getOrSetRegionKey = getOrSetRegionKey;
exports.listRegionKeys = listRegionKeys;

exports.getRegionRaw = getRegionRaw;
exports.getDefaultRegionRaw = getDefaultRegionRaw;

/**
 * Gets the region in which this function is running from the `AWS_REGION` environment variable and returns it as is if
 * it's neither "undefined" nor "null"; otherwise returns undefined.
 * @returns {string|undefined} the AWS region (if it exists); otherwise undefined.
 */
function getRegion() {
  const awsRegion = trim(process.env.AWS_REGION);
  return awsRegion !== "undefined" && awsRegion !== "null" ? awsRegion : undefined;
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
    // undefined or null, which sets it to the strings "undefined" or "null" respectively
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
  return process.env.AWS_REGION;
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
  return process.env.AWS_DEFAULT_REGION;
}

/**
 * Keeps context.region as is if it's already configured on the given context, otherwise gets the current region from
 * process.env.AWS_REGION and sets it on the context as context.region.
 * @param {Object|RegionAware} context - a context on which to set the region
 * @returns {RegionAware} the context with its existing region or the current AWS_REGION env variable value.
 */
function configureRegion(context) {
  // Resolve the AWS region, if it is not already defined on the context
  if (!context.region) {
    context.region = getRegion();
  }
  (context.debug || console.log)(`Using region (${process.env.AWS_REGION}) & context.region (${context.region})`);
  return context;
}

/**
 * Returns the existing region key object for the given region name (if any) or undefined (if none).
 * @param {string|undefined} [region] - the name of the region (defaults to current region if not defined)
 * @returns {{region: string}|undefined} a region key object (if one exists); otherwise undefined
 */
function getRegionKey(region) {
  const regionName = region ? region : getRegion();
  return regionKeysByRegion.get(regionName);
}

/**
 * Returns the existing region key object or sets & returns a new region key object for the given region name.
 * @param {string|undefined} [region] - the name of the region (defaults to current region if not defined)
 * @returns {{region: string}} a region key object
 */
function getOrSetRegionKey(region) {
  const regionName = region ? region : getRegion();
  let regionKey = regionKeysByRegion.get(regionName);
  if (!regionKey) {
    regionKey = {region: regionName};
    regionKeysByRegion.set(regionName, regionKey);
  }
  return regionKey;
}

/**
 * Lists the currently cached region keys (if any).
 * @return {Array.<{region: string}>} a list of region keys
 */
function listRegionKeys() {
  const regionKeys = new Array(regionKeysByRegion.size);
  const iter = regionKeysByRegion.values();
  let v = iter.next();
  let i = -1;
  while (!v.done) {
    regionKeys[++i] = v.value;
    v = iter.next();
  }
  return regionKeys;
}