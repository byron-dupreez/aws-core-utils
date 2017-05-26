'use strict';

const merging = require('core-functions/merging');
const merge = merging.merge;
const mergeOpts = {deep: true, replace: false};

/**
 * Utilities for working with AWS DynamoDB.DocumentClient instances.
 * @module aws-core-utils/dynamodb-doc-client-utils
 * @author Byron du Preez
 */

module.exports.getItem = getItem;

/**
 * Gets the item with the given key from the named DynamoDB table.
 * @template K - the type of the key object
 * @template I - the type of data returned in the DynamoDB result's `Item` property
 * @param {string} tableName - the name of the DynamoDB table from which to load
 * @param {K} key - the key of the item to get
 * @param {DynamoDBGetOpts|undefined} [opts] - optional DynamoDB `get` parameter options to use
 * @param {string} desc - a description of the item being requested for logging purposes
 * @param {StandardContext} context - the context to use
 * @return {Promise.<DynamoDBGetResult.<I>>} a promise that will resolve with the result or reject with an error
 */
function getItem(tableName, key, opts, desc, context) {
  try {
    const params = {
      TableName: tableName,
      Key: key
    };
    if (opts) merge(opts, params, mergeOpts);

    if (context.traceEnabled) context.trace(`Loading ${desc} from ${tableName} using params (${JSON.stringify(params)})`);

    return context.dynamoDBDocClient.get(params).promise()
      .then(result => {
        if (context.traceEnabled) context.trace(`Loaded ${desc} from ${tableName} - result (${JSON.stringify(result)})`);
        return result;
      })
      .catch(err => {
        context.error(`Failed to load ${desc} from ${tableName}`, err.stack);
        throw err;
      });

  } catch (err) {
    context.error(`Failed to load ${desc} from ${tableName}`, err.stack);
    return Promise.reject(err);
  }
}