'use strict';

const regions = require('./regions');
const getRegion = regions.getRegion;
const getRegionKey = regions.getRegionKey;

const copying = require('core-functions/copying');
const copy = copying.copy;
const deep = {deep: true};

const Strings = require('core-functions/strings');
const stringify = Strings.stringify;

const deepEqual = require('deep-equal');
const strict = {strict:true};

let AWS = require('aws-sdk');

// Module-scope cache of AWS.Lambda instances by region key
let lambdaByRegionKey = new WeakMap();

// Module-scope cache of the Lambda options used to construct the AWS.Lambda instances by region key
let lambdaOptionsByRegionKey = new WeakMap();

/**
 * A module-scope cache of AWS.Lambda instances by region.
 * @module aws-core-utils/lambda-cache
 * @author Byron du Preez
 */
exports._ = '_'; //IDE workaround

exports.setLambda = setLambda;
exports.getLambda = getLambda;
exports.getLambdaOptionsUsed = getLambdaOptionsUsed;
exports.deleteLambda = deleteLambda;
exports.configureLambda = configureLambda;
exports.clearCache = clearCache;

/**
 * Creates and caches a new AWS Lambda instance with the given Lambda constructor options for either the region
 * specified in the given options (if any and region specified) or for the current region (if not) UNLESS a previously
 * cached Lambda instance exists and the given options EITHER match the options used to construct it OR are undefined,
 * empty or only region, in which case no new instance will be created and the cached instance will be returned instead.
 * If the given options do not match existing options and are not empty and not only region, then logs a warning that
 * the previously cached Lambda instance is being replaced and returns the new AWS Lambda instance.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils/logging#configureLogging})
 *
 * @param {Object|undefined} [lambdaOptions] - the optional Lambda constructor options to use
 * @param {string|undefined} [lambdaOptions.region] - an optional region to use instead of the current region
 * @param {Object|undefined} [context] - the context, which is just used for logging
 * @returns {AWS.Lambda} a cached or new AWS Lambda instance created and cached for the specified or current region
 */
function setLambda(lambdaOptions, context) {
  // If no options were specified, then use an empty object
  const options = lambdaOptions ? copy(lambdaOptions, deep) : {};

  // If no region was specified in the given lambda options, then set it to the current region
  let region = options.region;
  if (!region) {
    const currentRegion = getRegion();
    options.region = currentRegion;
    region = currentRegion;
  }
  const regionKey = regions.getOrSetRegionKey(region);

  // Check if there is already a Lambda instance cached for this region
  let lambda = lambdaByRegionKey.get(regionKey);
  if (lambda) {
    const debug = (context && context.debug) || console.log;
    // If caller specified no options, then accept the cached instance for the current region (regardless of its options)
    if (!lambdaOptions || Object.getOwnPropertyNames(lambdaOptions).length === 0) {
      debug(`Reusing cached Lambda instance for region (${region}) with ANY options, since no options were specified`);
      return lambda;
    }
    // If caller ONLY specified a region, then accept the cached instance for the region (regardless of its options)
    if (Object.getOwnPropertyNames(options).length === 1) {
      debug(`Reusing cached Lambda instance for region (${region}) with ANY options, since only region was specified`);
      return lambda;
    }
    // If the given options match the options used to construct the cached instance, then returns the cached instance
    const optionsUsed = lambdaOptionsByRegionKey.get(regionKey);

    if (deepEqual(optionsUsed, options, strict)) {
      // Use the cached instance if its config is identical to the modified options
      debug(`Reusing cached Lambda instance for region (${region}) with identical options`);
      return lambda;
    } else {
      const warn = (context && context.warn) || console.warn;
      warn(`Replacing cached Lambda instance (${stringify(optionsUsed)}) for region (${region}) with new instance (${stringify(options)})`);
    }
  }
  // Create a new lambda instance with the modified options
  lambda = new AWS.Lambda(options);
  // Cache the new instance and the options used to create it
  lambdaByRegionKey.set(regionKey, lambda);
  lambdaOptionsByRegionKey.set(regionKey, options);

  return lambda;
}

/**
 * Deletes the Lambda instance cached for the given region (if any) and returns true if successfully deleted or false
 * if it did not exist.
 * @param {string} region - the AWS region to use as a key
 * @returns {boolean} true if existed and deleted; false otherwise
 */
function deleteLambda(region) {
  const regionKey = getRegionKey(region);
  if (regionKey) {
    lambdaOptionsByRegionKey.delete(regionKey);
    return lambdaByRegionKey.delete(regionKey);
  }
  return false;
}

/**
 * Gets the Lambda instance cached for the given region (if specified and if previously cached); otherwise for the
 * current region (if previously cached); otherwise returns undefined.
 * @param {string} [region] - the optional AWS region to use - defaults to current AWS region if not specified
 * @returns {AWS.Lambda|undefined} the Lambda instance cached for the given or current region (if any); otherwise
 * returns undefined
 */
function getLambda(region) {
  const regionKey = getRegionKey(region);
  return regionKey ? lambdaByRegionKey.get(regionKey) : undefined;
}

/**
 * Gets the lambda options used to construct the Lambda instance cached for the given region (if specified and if
 * previously cached); otherwise for the current region (if previously cached); otherwise returns undefined.
 * @param {string} [region] - the optional AWS region to use - defaults to current AWS region if not specified
 * @returns {AWS.Lambda|undefined} the lambda options used to construct the Lambda instance cached for the given or
 * current region (if any); otherwise returns undefined
 */
function getLambdaOptionsUsed(region) {
  const regionKey = getRegionKey(region);
  return regionKey ? lambdaOptionsByRegionKey.get(regionKey) : undefined;
}

/**
 * Creates and caches a new AWS Lambda instance with the given Lambda constructor options for either the region
 * specified in the given options (if any and region specified) or for the current region (if not) UNLESS a previously
 * cached Lambda instance exists and the given options either match the options used to construct it or are undefined,
 * empty or only region was specified, in which case no new instance will be created and the cached instance will
 * be returned instead. If the given options do not match existing options and are not empty and not only region, then
 * logs a warning that the previously cached Lambda instance is being replaced and returns the new AWS Lambda
 * instance.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils/logging#configureLogging})
 *
 * Configures the given context, if it does not already have a context.lambda, with the cached lambda instance for
 * either the region specified in the given default lambda options (if any and region specified) or for the current
 * region (if not); otherwise with a new AWS.Lambda instance created and cached by {@linkcode setLambda} for
 * the specified or current region using the given default Lambda constructor options.
 *
 * Note that the given default Lambda constructor options will ONLY be used if no cached Lambda instance exists.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils/logging#configureLogging})
 *
 * @param {Object|LambdaAware} context - the context to configure
 * @param {Object|undefined} [lambdaOptions] - the optional Lambda constructor options to use if no cached Lambda
 * instance exists
 * @param {string|undefined} [lambdaOptions.region] - an optional region to use instead of the current region
 * @returns {LambdaAware} the given context configured with an AWS.Lambda instance
 */
function configureLambda(context, lambdaOptions) {
  if (!context.lambda) {
    context.lambda = setLambda(lambdaOptions, context);
  }
  return context;
}

/**
 * Clears the AWS.Lambda instance and options caches according to the currently cached region keys.
 */
function clearCache() {
  regions.listRegionKeys().forEach(regionKey => {
    lambdaByRegionKey.delete(regionKey);
    lambdaOptionsByRegionKey.delete(regionKey);
  });
}