'use strict';

const Promises = require('core-functions/promises');

/**
 * The various states of an event source mapping
 * @enum string
 */
const EventSourceMappingState = {
  Creating: "Creating",
  Enabled: "Enabled",
  Disabled: "Disabled",
  Enabling: "Enabling",
  Disabling: "Disabling",
  Updating: "Updating",
  Deleting: "Deleting"
};

/**
 * Utilities to simplify working with an AWS.Lambda instance.
 * @module aws-core-utils/lambda-utils
 * @author Byron du Preez
 */
module.exports = {
  EventSourceMappingState: EventSourceMappingState,
  listEventSourceMappings: listEventSourceMappings,
  updateEventSourceMapping: updateEventSourceMapping,
  disableEventSourceMapping: disableEventSourceMapping
};

/**
 * Lists the event source mappings for the given function name.
 * @param {AWS.Lambda|AwsLambda} lambda - the AWS.Lambda instance to use
 * @param {ListEventSourceMappingsParams} params - the parameters to use
 * @param {Logger|console|undefined} [logger] - the logger to use (defaults to console if omitted)
 * @returns {Promise.<ListEventSourceMappingsResult>}
 */
function listEventSourceMappings(lambda, params, logger) {
  logger = logger || console;
  const functionName = params.FunctionName;
  const listEventSourceMappingsAsync = Promises.wrapMethod(lambda, lambda.listEventSourceMappings);
  const startMs = Date.now();
  return listEventSourceMappingsAsync(params).then(
    result => {
      if (logger.traceEnabled) {
        const mappings = Array.isArray(result.EventSourceMappings) ? result.EventSourceMappings : [];
        const n = mappings.length;
        logger.trace(`Found ${n} event source mapping${n !== 1 ? 's' : ''} for ${functionName} - took ${Date.now() - startMs} ms - result (${JSON.stringify(result)})`);
      }
      return result;
    },
    err => {
      logger.error(`Failed to list event source mappings for function (${functionName}) - took ${Date.now() - startMs} ms`, err);
      throw err;
    }
  );
}

/**
 * Updates the Lambda function event source mapping identified by the given parameters with the given parameter values.
 * @param {AWS.Lambda|AwsLambda} lambda - the AWS.Lambda instance to use
 * @param {UpdateEventSourceMappingParams} params - the parameters to use
 * @param {Logger|console|undefined} [logger] - the logger to use (defaults to console if omitted)
 * @returns {Promise.<*>} a promise of the result returned by AWS Lambda
 */
function updateEventSourceMapping(lambda, params, logger) {
  logger = logger || console;
  const functionName = params.FunctionName;
  const uuid = params.UUID;
  const updateEventSourceMappingAsync = Promises.wrapMethod(lambda, lambda.updateEventSourceMapping);
  const startMs = Date.now();
  return updateEventSourceMappingAsync(params).then(
    result => {
      logger.info(`Updated event source mapping (${uuid}) for function (${functionName}) - took ${Date.now() - startMs} ms - result (${JSON.stringify(result)})`);
      return result;
    },
    err => {
      logger.error(`Failed to update event source mapping (${uuid}) for function (${functionName}) -  took ${Date.now() - startMs} ms`, err);
      throw err;
    }
  );
}

/**
 * Disables the identified event source mapping on the named function.
 * @param {AWS.Lambda|AwsLambda} lambda - the AWS.Lambda instance to use
 * @param {string} functionName - the name of the AWS.Lambda function on which the event source mapping is defined
 * @param {string} uuid - the unique identifier of the event source mapping to disable
 * @param {Logger|console|undefined} [logger] - the logger to use (defaults to console if omitted)
 * @returns {Promise.<*>} a promise of the result returned by AWS Lambda
 */
function disableEventSourceMapping(lambda, functionName, uuid, logger) {
  logger = logger || console;
  const params = {FunctionName: functionName, UUID: uuid, Enabled: false};
  const updateEventSourceMappingAsync = Promises.wrapMethod(lambda, lambda.updateEventSourceMapping);
  const startMs = Date.now();
  return updateEventSourceMappingAsync(params).then(
    result => {
      logger.info(`Disabled event source mapping (${uuid}) for function (${functionName}) - took ${Date.now() - startMs} ms - result (${JSON.stringify(result)})`);
      return result;
    },
    err => {
      logger.error(`Failed to disable event source mapping (${uuid}) for function (${functionName}) - took ${Date.now() - startMs} ms`, err);
      throw err;
    }
  );
}