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
const strict = {strict: true};

let AWS = require('aws-sdk');

// Module-scope cache of AWS.KMS instances by region key
let kmsByRegionKey = new WeakMap();

// Module-scope cache of the KMS options used to construct the AWS.KMS instances by region key
let kmsOptionsByRegionKey = new WeakMap();

/**
 * A module-scope cache of AWS.KMS instances by region.
 * @module aws-core-utils/kms-cache
 * @author Byron du Preez
 */
exports._$_ = '_$_'; //IDE workaround

exports.setKMS = setKMS;
exports.getKMS = getKMS;
exports.getKMSOptionsUsed = getKMSOptionsUsed;
exports.deleteKMS = deleteKMS;
exports.configureKMS = configureKMS;
exports.clearCache = clearCache;

/**
 * Creates and caches a new AWS KMS instance with the given KMS constructor options for either the region
 * specified in the given options (if any and region specified) or for the current region (if not) UNLESS a previously
 * cached KMS instance exists and the given options EITHER match the options used to construct it OR are undefined,
 * empty or only region, in which case no new instance will be created and the cached instance will be returned instead.
 * If the given options do not match existing options and are not empty and not only region, then logs a warning that
 * the previously cached KMS instance is being replaced and returns the new AWS KMS instance.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils/logging#configureLogging})
 *
 * @param {Object|undefined} [kmsOptions] - the optional KMS constructor options to use
 * @param {string|undefined} [kmsOptions.region] - an optional region to use instead of the current region
 * @param {Object|undefined} [context] - the context, which is just used for logging
 * @param {AWS|undefined} [context.AWS] - an optional, alternative AWS constructor to use (if unspecified, uses the standard AWS-SDK AWS constructor) - e.g. enables use of an AWS XRay-captured AWS constructor
 * @returns {AWS.KMS} a cached or new AWS KMS instance created and cached for the specified or current region
 */
function setKMS(kmsOptions, context) {
  // If no options were specified, then use an empty object
  const options = kmsOptions ? copy(kmsOptions, deep) : {};

  // If no region was specified in the given kms options, then set it to the current region
  let region = options.region;
  if (!region) {
    const currentRegion = getRegion();
    options.region = currentRegion;
    region = currentRegion;
  }
  const regionKey = regions.getOrSetRegionKey(region);

  // Check if there is already a KMS instance cached for this region
  let kms = kmsByRegionKey.get(regionKey);
  if (kms) {
    const debug = (context && context.debug) || console.log.bind(console);
    // If caller specified no options, then accept the cached instance for the current region (regardless of its options)
    if (!kmsOptions || Object.getOwnPropertyNames(kmsOptions).length === 0) {
      debug(`Reusing cached KMS instance for region (${region}) with ANY options, since no options were specified`);
      return kms;
    }
    // If caller ONLY specified a region, then accept the cached instance for the region (regardless of its options)
    if (Object.getOwnPropertyNames(options).length === 1) {
      debug(`Reusing cached KMS instance for region (${region}) with ANY options, since only region was specified`);
      return kms;
    }
    // If the given options match the options used to construct the cached instance, then returns the cached instance
    const optionsUsed = kmsOptionsByRegionKey.get(regionKey);

    if (deepEqual(optionsUsed, options, strict)) {
      // Use the cached instance if its config is identical to the modified options
      debug(`Reusing cached KMS instance for region (${region}) with identical options`);
      return kms;
    } else {
      const logger = context && context.warn ? context : console;
      logger.warn(`Replacing cached KMS instance (${stringify(optionsUsed)}) for region (${region}) with new instance (${stringify(options)})`);
    }
  }
  // Create a new kms instance with the modified options
  const Aws = context.AWS ? context.AWS : AWS;
  kms = new Aws.KMS(options);
  // Cache the new instance and the options used to create it
  kmsByRegionKey.set(regionKey, kms);
  kmsOptionsByRegionKey.set(regionKey, options);

  return kms;
}

/**
 * Deletes the KMS instance cached for the given region (if any) and returns true if successfully deleted or false
 * if it did not exist.
 * @param {string} region - the AWS region to use as a key
 * @returns {boolean} true if existed and deleted; false otherwise
 */
function deleteKMS(region) {
  const regionKey = getRegionKey(region);
  if (regionKey) {
    kmsOptionsByRegionKey.delete(regionKey);
    return kmsByRegionKey.delete(regionKey);
  }
  return false;
}

/**
 * Gets the KMS instance cached for the given region (if specified and if previously cached); otherwise for the
 * current region (if previously cached); otherwise returns undefined.
 * @param {string} [region] - the optional AWS region to use - defaults to current AWS region if not specified
 * @returns {AWS.KMS|undefined} the KMS instance cached for the given or current region (if any); otherwise
 * returns undefined
 */
function getKMS(region) {
  const regionKey = getRegionKey(region);
  return regionKey ? kmsByRegionKey.get(regionKey) : undefined;
}

/**
 * Gets the kms options used to construct the KMS instance cached for the given region (if specified and if
 * previously cached); otherwise for the current region (if previously cached); otherwise returns undefined.
 * @param {string} [region] - the optional AWS region to use - defaults to current AWS region if not specified
 * @returns {AWS.KMS|undefined} the kms options used to construct the KMS instance cached for the given or
 * current region (if any); otherwise returns undefined
 */
function getKMSOptionsUsed(region) {
  const regionKey = getRegionKey(region);
  return regionKey ? kmsOptionsByRegionKey.get(regionKey) : undefined;
}

/**
 * Creates and caches a new AWS KMS instance with the given KMS constructor options for either the region
 * specified in the given options (if any and region specified) or for the current region (if not) UNLESS a previously
 * cached KMS instance exists and the given options either match the options used to construct it or are undefined,
 * empty or only region was specified, in which case no new instance will be created and the cached instance will
 * be returned instead. If the given options do not match existing options and are not empty and not only region, then
 * logs a warning that the previously cached KMS instance is being replaced and returns the new AWS KMS
 * instance.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils/logging#configureLogging})
 *
 * Configures the given context, if it does not already have a context.kms, with the cached kms instance for
 * either the region specified in the given default kms options (if any and region specified) or for the current
 * region (if not); otherwise with a new AWS.KMS instance created and cached by {@linkcode setKMS} for
 * the specified or current region using the given default KMS constructor options.
 *
 * Note that the given default KMS constructor options will ONLY be used if no cached KMS instance exists.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils/logging#configureLogging})
 *
 * @param {Object|KMSAware} context - the context to configure
 * @param {Object|undefined} [kmsOptions] - the optional KMS constructor options to use if no cached KMS
 * instance exists
 * @param {string|undefined} [kmsOptions.region] - an optional region to use instead of the current region
 * @returns {KMSAware} the given context configured with an AWS.KMS instance
 */
function configureKMS(context, kmsOptions) {
  if (!context.kms) {
    context.kms = setKMS(kmsOptions, context);
  }
  return context;
}

/**
 * Clears the AWS.KMS instance and options caches according to the currently cached region keys.
 */
function clearCache() {
  regions.listRegionKeys().forEach(regionKey => {
    kmsByRegionKey.delete(regionKey);
    kmsOptionsByRegionKey.delete(regionKey);
  });
}