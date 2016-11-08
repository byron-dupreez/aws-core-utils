'use strict';

let AWS = require("aws-sdk");
let kinesis = null; // simple, single module-scope cache for an AWS.Kinesis instance

const regions = require('./regions');

/**
 * Utilities for working with AWS.Kinesis and a simple, module-scope cache for a single AWS.Kinesis instance for Lambda.
 * @module aws-core-utils/kinesis-utils
 * @author Byron du Preez
 */
module.exports = {
  configureKinesis: configureKinesis
};

/**
 * Configures the given context, if it does not already have a context.kinesis, with the cached kinesis instance (if
 * any and if its region & maxRetries matches the current region and given maxRetries); otherwise with a new AWS.Kinesis
 * instance, which will be cached if there is no existing cached instance.
 *
 * Logging should be configured before calling this function (see {@linkcode logging-utils#configureLogging}
 *
 * @param {Object} context - the context to configure
 * @param {number} maxRetries - the maximum number of retries to configure on the AWS.Kinesis instance
 * @returns {Object} the given context
 */
function configureKinesis(context, maxRetries) {
  const region = regions.getRegion();

  const contextKinesisIncompatible = context.kinesis && context.kinesis.config &&
    (context.kinesis.config.region !== region || context.kinesis.config.maxRetries !== maxRetries);

  if (contextKinesisIncompatible) {
    if (context.warnEnabled) context.warn(`Existing context.kinesis with region (${context.kinesis.config.region}) & maxRetries (${context.kinesis.config.maxRetries}) is incompatible with region (${region}) & maxRetries (${maxRetries}) and will be replaced!`);
  }

  if (!context.kinesis || contextKinesisIncompatible) {
    if (kinesis && kinesis.config) {
      if (kinesis.config.region === region && kinesis.config.maxRetries === maxRetries) {
        // Use cached kinesis instance
        if (context.debugEnabled) context.debug(`Using cached kinesis instance with region (${kinesis.config.region}) & maxRetries (${kinesis.config.maxRetries})`);
        context.kinesis = kinesis;
      } else {
        // Cached kinesis instance has the wrong region and/or maxRetries, so create a new one
        if (context.debugEnabled) context.debug(`Cached kinesis has incompatible region (${kinesis.config.region}) & maxRetries (${kinesis.config.maxRetries}), so creating a new context.kinesis with region (${region}) & maxRetries (${maxRetries})`);
        context.kinesis = new AWS.Kinesis({region: region, maxRetries: maxRetries});
      }
    } else {
      // No cached kinesis yet, so create one and cache it
      kinesis = new AWS.Kinesis({region: region, maxRetries: maxRetries});
      if (context.debugEnabled) context.debug(`Cached a new kinesis instance with region (${kinesis.config.region}) & maxRetries (${kinesis.config.maxRetries})`);
      context.kinesis = kinesis;
    }
  } else {
    if (context.debugEnabled) context.debug(`Using compatible, existing context.kinesis instance with region (${context.kinesis.config.region}) & maxRetries (${context.kinesis.config.maxRetries})`);
  }
  return context;
}