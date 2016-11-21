'use strict';

let AWS = require("aws-sdk");

// Module-scope cache of AWS.DynamoDB.DocumentClient instances by region key
let dynamoDBDocClientByRegionKey = new WeakMap();
// Module-scope cache of the DynamoDB.DocumentClient options used to construct the AWS.DynamoDB.DocumentClient instances by region key
let dynamoDBDocClientOptionsByRegionKey = new WeakMap();

// A map of region key objects by region, which is only needed, because WeakMaps can ONLY have object keys
const regionKeysByRegion = new Map();

const regions = require('./regions');

const Strings = require('core-functions/strings');
const stringify = Strings.stringify;

const deepEqual = require('deep-equal');
const strict = {strict:true};

/**
 * Utilities for working with AWS.DynamoDB.DocumentClients and a module-scope cache of AWS.DynamoDB.DocumentClient
 * instances by region for Lambda.
 * @module aws-core-utils/dynamodb-doc-client-utils
 * @author Byron du Preez
 */
module.exports = {
  setDynamoDBDocClient: setDynamoDBDocClient,
  getDynamoDBDocClient: getDynamoDBDocClient,
  getDynamoDBDocClientOptionsUsed: getDynamoDBDocClientOptionsUsed,
  deleteDynamoDBDocClient: deleteDynamoDBDocClient,
  configureDynamoDBDocClient: configureDynamoDBDocClient
};

/**
 * Creates and caches a new AWS DynamoDB.DocumentClient instance with the given DynamoDB.DocumentClient constructor
 * options for either the region specified in the given options (if any and region specified) or for the current region
 * (if not) UNLESS a previously cached DynamoDB.DocumentClient instance exists and the given options EITHER match the
 * options used to construct it OR are undefined, empty or only region, in which case no new instance will be created
 * and the cached instance will be returned instead. If the given options do not match existing options and are not
 * empty and not only region, then logs a warning that the previously cached DynamoDB.DocumentClient instance is being
 * replaced and returns the new AWS DynamoDB.DocumentClient instance.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils/logging#configureLogging}
 *
 * @param {Object|undefined} [dynamoDBDocClientOptions] - the optional DynamoDB.DocumentClient constructor options to use
 * @param {string|undefined} [dynamoDBDocClientOptions.region] - an optional region to use instead of the current region
 * @param {Object|undefined} [context] - the context, which is just used for logging
 * @returns {AWS.DynamoDB.DocumentClient} a cached or new AWS DynamoDB.DocumentClient instance created and cached for
 * the specified or current region
 */
function setDynamoDBDocClient(dynamoDBDocClientOptions, context) {
  // If no options were specified, then use an empty object
  const options = dynamoDBDocClientOptions ? dynamoDBDocClientOptions : {};

  // If no region was specified in the given dynamoDBDocClient options, then set it to the current region
  let region = options.region;
  if (!region) {
    const currentRegion = regions.getRegion();
    options.region = currentRegion;
    region = currentRegion;
  }
  const regionKey = getRegionKey(region);

  // Check if there is already a DynamoDB.DocumentClient instance cached for this region
  let dynamoDBDocClient = dynamoDBDocClientByRegionKey.get(regionKey);
  if (dynamoDBDocClient) {
    const logInfo = context && context.info ? context.info : console.log;
    // If caller specified no options, then accept the cached instance for the current region (regardless of its options)
    if (!dynamoDBDocClientOptions || Object.getOwnPropertyNames(dynamoDBDocClientOptions).length === 0) {
      logInfo(`Reusing cached DynamoDB.DocumentClient instance for region (${region}) with ANY options, since no options were specified`);
      return dynamoDBDocClient;
    }
    // If caller ONLY specified a region, then accept the cached instance for the region (regardless of its options)
    if (Object.getOwnPropertyNames(options).length === 1) {
      logInfo(`Reusing cached DynamoDB.DocumentClient instance for region (${region}) with ANY options, since only region was specified`);
      return dynamoDBDocClient;
    }
    // If the given options match the options used to construct the cached instance, then returns the cached instance
    const optionsUsed = dynamoDBDocClientOptionsByRegionKey.get(regionKey);

    if (deepEqual(optionsUsed, options, strict)) {
      // Use the cached instance if its config is identical to the modified options
      logInfo(`Reusing cached DynamoDB.DocumentClient instance for region (${region}) with identical options`);
      return dynamoDBDocClient;
    } else {
      const logWarn = context && context.warn ? context.warn : console.warn;
      logWarn(`Replacing cached DynamoDB.DocumentClient instance (${stringify(optionsUsed)}) for region (${region}) with new instance (${stringify(options)})`);
    }
  }
  // Create a new DynamoDB.DocumentClient instance with the modified options
  dynamoDBDocClient = new AWS.DynamoDB.DocumentClient(options);
  // Cache the new instance and the options used to create it
  dynamoDBDocClientByRegionKey.set(regionKey, dynamoDBDocClient);
  dynamoDBDocClientOptionsByRegionKey.set(regionKey, options);

  return dynamoDBDocClient;
}

/**
 * Deletes the DynamoDB.DocumentClient instance cached for the given region (if any) and returns true if successfully
 * deleted or false if it did not exist.
 * @param {string} region - the AWS region to use as a key
 * @returns {boolean} true if existed and deleted; false otherwise
 */
function deleteDynamoDBDocClient(region) {
  const regionKey = getRegionKey(region);
  dynamoDBDocClientOptionsByRegionKey.delete(regionKey);
  return dynamoDBDocClientByRegionKey.delete(regionKey);
}

/**
 * Gets the DynamoDB.DocumentClient instance cached for the given region (if specified and if previously cached);
 * otherwise for the current region (if previously cached); otherwise returns undefined.
 * @param {string} [region] - the optional AWS region to use - defaults to current AWS region if not specified
 * @returns {AWS.DynamoDB.DocumentClient|undefined} the DynamoDB.DocumentClient instance cached for the given or current
 * region (if any); otherwise returns undefined
 */
function getDynamoDBDocClient(region) {
  const regionKey = getRegionKey(region ? region : regions.getRegion());
  return dynamoDBDocClientByRegionKey.get(regionKey);
}

/**
 * Gets the DynamoDB.DocumentClient options used to construct the DynamoDB.DocumentClient instance cached for the given
 * region (if specified and if previously cached); otherwise for the current region (if previously cached); otherwise
 * returns undefined.
 * @param {string} [region] - the optional AWS region to use - defaults to current AWS region if not specified
 * @returns {AWS.DynamoDB.DocumentClient|undefined} the DynamoDB.DocumentClient options used to construct the
 * DynamoDB.DocumentClient instance cached for the given or current region (if any); otherwise returns undefined
 */
function getDynamoDBDocClientOptionsUsed(region) {
  const regionKey = getRegionKey(region ? region : regions.getRegion());
  return dynamoDBDocClientOptionsByRegionKey.get(regionKey);
}

function getRegionKey(region) {
  let regionKey = regionKeysByRegion.get(region);
  if (!regionKey) {
    regionKey = {region: region};
    regionKeysByRegion.set(region, regionKey);
  }
  return regionKey;
}

/**
 * Creates and caches a new AWS DynamoDB.DocumentClient instance with the given DynamoDB.DocumentClient constructor
 * options for either the region specified in the given options (if any and region specified) or for the current region
 * (if not) UNLESS a previously cached DynamoDB.DocumentClient instance exists and the given options either match the
 * options used to construct it or are undefined, empty or only region was specified, in which case no new instance will
 * be created and the cached instance will be returned instead. If the given options do not match existing options and
 * are not empty and not only region, then logs a warning that the previously cached DynamoDB.DocumentClient instance is
 * being replaced and returns the new AWS DynamoDB.DocumentClient instance.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils/logging#configureLogging})
 *
 * Configures the given context, if it does not already have a context.dynamoDBDocClient, with the cached
 * dynamoDBDocClient instance for either the region specified in the given default DynamoDB.DocumentClient options (if
 * any and region specified) or for the current region (if not); otherwise with a new AWS.DynamoDB.DocumentClient
 * instance created and cached by {@linkcode setDynamoDBDocClient} for the specified or current region using the given
 * default DynamoDB.DocumentClient constructor options.
 *
 * Note that the given default DynamoDB.DocumentClient constructor options will ONLY be used if no cached
 * DynamoDB.DocumentClient instance exists.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils/logging#configureLogging})
 *
 * @param {Object} context - the context to configure
 * @param {AWS.DynamoDB.DocumentClient} [context.dynamoDBDocClient] - the current DynamoDB.DocumentClient instance
 * cached on the context (if any)
 * @param {Object|undefined} [dynamoDBDocClientOptions] - the optional DynamoDB.DocumentClient constructor options to
 * use if no cached DynamoDB.DocumentClient instance exists
 * @param {string|undefined} [dynamoDBDocClientOptions.region] - an optional region to use instead of the current region
 * @returns {Object} the given context
 */
function configureDynamoDBDocClient(context, dynamoDBDocClientOptions) {
  if (!context.dynamoDBDocClient) {
    context.dynamoDBDocClient = setDynamoDBDocClient(dynamoDBDocClientOptions, context);
  }
  return context;
}