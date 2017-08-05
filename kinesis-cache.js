'use strict';

let AWS = require('aws-sdk');

// Module-scope cache of AWS.Kinesis instances by region key
let kinesisByRegionKey = new WeakMap();
// Module-scope cache of the Kinesis options used to construct the AWS.Kinesis instances by region key
let kinesisOptionsByRegionKey = new WeakMap();

const regions = require('./regions');
const getRegion = regions.getRegion;
const getRegionKey = regions.getRegionKey;

const Objects = require('core-functions/objects');
const copy = Objects.copy;
const deep = true;

const Strings = require('core-functions/strings');
const stringify = Strings.stringify;

const deepEqual = require('deep-equal');
const strict = {strict:true};

/**
 * A module-scope cache of AWS.Kinesis instances by region for Lambda.
 * @module aws-core-utils/kinesis-cache
 * @author Byron du Preez
 */
module.exports = {
  setKinesis: setKinesis,
  getKinesis: getKinesis,
  getKinesisOptionsUsed: getKinesisOptionsUsed,
  deleteKinesis: deleteKinesis,
  configureKinesis: configureKinesis
};

/**
 * Creates and caches a new AWS Kinesis instance with the given Kinesis constructor options for either the region
 * specified in the given options (if any and region specified) or for the current region (if not) UNLESS a previously
 * cached Kinesis instance exists and the given options EITHER match the options used to construct it OR are undefined,
 * empty or only region, in which case no new instance will be created and the cached instance will be returned instead.
 * If the given options do not match existing options and are not empty and not only region, then logs a warning that
 * the previously cached Kinesis instance is being replaced and returns the new AWS Kinesis instance.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils/logging#configureLogging})
 *
 * @param {Object|undefined} [kinesisOptions] - the optional Kinesis constructor options to use
 * @param {string|undefined} [kinesisOptions.region] - an optional region to use instead of the current region
 * @param {Object|undefined} [context] - the context, which is just used for logging
 * @returns {AWS.Kinesis} a cached or new AWS Kinesis instance created and cached for the specified or current region
 */
function setKinesis(kinesisOptions, context) {
  // If no options were specified, then use an empty object
  const options = kinesisOptions ? copy(kinesisOptions, deep) : {};

  // If no region was specified in the given kinesis options, then set it to the current region
  let region = options.region;
  if (!region) {
    const currentRegion = getRegion();
    options.region = currentRegion;
    region = currentRegion;
  }
  const regionKey = getRegionKey(region);

  // Check if there is already a Kinesis instance cached for this region
  let kinesis = kinesisByRegionKey.get(regionKey);
  if (kinesis) {
    const logInfo = context && context.info ? context.info : console.log;
    // If caller specified no options, then accept the cached instance for the current region (regardless of its options)
    if (!kinesisOptions || Object.getOwnPropertyNames(kinesisOptions).length === 0) {
      logInfo(`Reusing cached Kinesis instance for region (${region}) with ANY options, since no options were specified`);
      return kinesis;
    }
    // If caller ONLY specified a region, then accept the cached instance for the region (regardless of its options)
    if (Object.getOwnPropertyNames(options).length === 1) {
      logInfo(`Reusing cached Kinesis instance for region (${region}) with ANY options, since only region was specified`);
      return kinesis;
    }
    // If the given options match the options used to construct the cached instance, then returns the cached instance
    const optionsUsed = kinesisOptionsByRegionKey.get(regionKey);

    if (deepEqual(optionsUsed, options, strict)) {
      // Use the cached instance if its config is identical to the modified options
      logInfo(`Reusing cached Kinesis instance for region (${region}) with identical options`);
      return kinesis;
    } else {
      const logWarn = context && context.warn ? context.warn : console.warn;
      logWarn(`Replacing cached Kinesis instance (${stringify(optionsUsed)}) for region (${region}) with new instance (${stringify(options)})`);
    }
  }
  // Create a new kinesis instance with the modified options
  kinesis = new AWS.Kinesis(options);
  // Cache the new instance and the options used to create it
  kinesisByRegionKey.set(regionKey, kinesis);
  kinesisOptionsByRegionKey.set(regionKey, options);

  return kinesis;
}

/**
 * Deletes the Kinesis instance cached for the given region (if any) and returns true if successfully deleted or false
 * if it did not exist.
 * @param {string} region - the AWS region to use as a key
 * @returns {boolean} true if existed and deleted; false otherwise
 */
function deleteKinesis(region) {
  const regionKey = getRegionKey(region);
  kinesisOptionsByRegionKey.delete(regionKey);
  return kinesisByRegionKey.delete(regionKey);
}

/**
 * Gets the Kinesis instance cached for the given region (if specified and if previously cached); otherwise for the
 * current region (if previously cached); otherwise returns undefined.
 * @param {string} [region] - the optional AWS region to use - defaults to current AWS region if not specified
 * @returns {AWS.Kinesis|undefined} the Kinesis instance cached for the given or current region (if any); otherwise
 * returns undefined
 */
function getKinesis(region) {
  const regionKey = getRegionKey(region);
  return kinesisByRegionKey.get(regionKey);
}

/**
 * Gets the kinesis options used to construct the Kinesis instance cached for the given region (if specified and if
 * previously cached); otherwise for the current region (if previously cached); otherwise returns undefined.
 * @param {string} [region] - the optional AWS region to use - defaults to current AWS region if not specified
 * @returns {AWS.Kinesis|undefined} the kinesis options used to construct the Kinesis instance cached for the given or
 * current region (if any); otherwise returns undefined
 */
function getKinesisOptionsUsed(region) {
  const regionKey = getRegionKey(region);
  return kinesisOptionsByRegionKey.get(regionKey);
}

/**
 * Creates and caches a new AWS Kinesis instance with the given Kinesis constructor options for either the region
 * specified in the given options (if any and region specified) or for the current region (if not) UNLESS a previously
 * cached Kinesis instance exists and the given options either match the options used to construct it or are undefined,
 * empty or only region was specified, in which case no new instance will be created and the cached instance will
 * be returned instead. If the given options do not match existing options and are not empty and not only region, then
 * logs a warning that the previously cached Kinesis instance is being replaced and returns the new AWS Kinesis
 * instance.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils/logging#configureLogging})
 *
 * Configures the given context, if it does not already have a context.kinesis, with the cached kinesis instance for
 * either the region specified in the given default kinesis options (if any and region specified) or for the current
 * region (if not); otherwise with a new AWS.Kinesis instance created and cached by {@linkcode setKinesis} for
 * the specified or current region using the given default Kinesis constructor options.
 *
 * Note that the given default Kinesis constructor options will ONLY be used if no cached Kinesis instance exists.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils/logging#configureLogging})
 *
 * @param {Object|KinesisAware} context - the context to configure
 * @param {Object|undefined} [kinesisOptions] - the optional Kinesis constructor options to use if no cached Kinesis
 * instance exists
 * @param {string|undefined} [kinesisOptions.region] - an optional region to use instead of the current region
 * @returns {KinesisAware} the given context configured with an AWS.Kinesis instance
 */
function configureKinesis(context, kinesisOptions) {
  if (!context.kinesis) {
    context.kinesis = setKinesis(kinesisOptions, context);
  }
  return context;
}