'use strict';

const strings = require('core-functions/strings');
const isNotBlank = strings.isNotBlank;
const trim = strings.trim;

const merging = require('core-functions/merging');
const merge = merging.merge;
const mergeOpts = {deep: true, replace: false};

/**
 * Utilities for working with AWS DynamoDB.DocumentClient instances.
 * @module aws-core-utils/dynamodb-doc-client-utils
 * @author Byron du Preez
 */
exports._ = '_'; //IDE workaround

exports.getItem = getItem;
exports.updateProjectionExpression = updateProjectionExpression;
exports.updateExpressionAttributeNames = updateExpressionAttributeNames;
exports.updateExpressionAttributeValues = updateExpressionAttributeValues;

/**
 * Gets the item with the given key from the named DynamoDB table.
 * @param {string} tableName - the name of the DynamoDB table from which to load
 * @param {K} key - the key of the item to get
 * @param {DynamoGetOpts|undefined} [opts] - optional DynamoDB `get` parameter options to use
 * @param {string} desc - a description of the item being requested for logging purposes
 * @param {StandardContext} context - the context to use
 * @return {Promise.<DynamoGetResult.<I>>} a promise that will resolve with the result or reject with an error
 * @template I,K
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
        if (result && typeof result === 'object') {
          return result;
        }
        throw new TypeError(`Unexpected result from get ${desc} from ${tableName} - result (${JSON.stringify(result)})`);
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

/**
 * Updates the ProjectionExpression property of the given opts with the given extra expressions.
 * @param {DynamoGetOpts|DynamoQueryOpts|Object|undefined} opts - the options to update
 * @param {string[]} expressions - the expressions to add
 * @return {DynamoGetOpts|DynamoQueryOpts|Object} the updated options
 */
function updateProjectionExpression(opts, expressions) {
  if (!expressions || !Array.isArray(expressions) || expressions.length <= 0) return opts;
  if (!opts) opts = {};

  const projectionExpressions = opts.ProjectionExpression ?
    opts.ProjectionExpression.split(',').filter(isNotBlank).map(trim) : [];

  expressions.forEach(expression => {
    if (isNotBlank(expression) && projectionExpressions.indexOf(expression) === -1) {
      projectionExpressions.push(trim(expression));
    }
  });

  const projectionExpression = projectionExpressions.length > 0 ? projectionExpressions.join(',') : undefined;
  opts.ProjectionExpression = isNotBlank(projectionExpression) ? projectionExpression : undefined;
  return opts;
}

/**
 * Updates the ExpressionAttributeNames map of the given opts with the given map of extra expression attribute names.
 * @param {DynamoGetOpts|DynamoQueryOpts|Object|undefined} opts - the options to update
 * @param {Object.<string, string>} expressionAttributeNames - the map of extra expression attribute names to add
 * @return {DynamoGetOpts|DynamoQueryOpts|Object} the updated options
 */
function updateExpressionAttributeNames(opts, expressionAttributeNames) {
  if (!expressionAttributeNames || typeof expressionAttributeNames !== 'object') return opts;
  if (!opts) opts = {};
  if (!opts.ExpressionAttributeNames) opts.ExpressionAttributeNames = {};

  const keys = Object.getOwnPropertyNames(expressionAttributeNames);
  keys.forEach(key => {
    opts.ExpressionAttributeNames[key] = expressionAttributeNames[key];
  });

  return opts;
}

/**
 * Updates the ExpressionAttributeValues map of the given opts with the given map of extra expression attribute names.
 * @param {DynamoQueryOpts|Object|undefined} opts - the options to update
 * @param {Object.<string, string>} expressionAttributeValues - the map of extra expression attribute names to add
 * @return {DynamoQueryOpts|Object} the updated options
 */
function updateExpressionAttributeValues(opts, expressionAttributeValues) {
  if (!expressionAttributeValues || typeof expressionAttributeValues !== 'object') return opts;
  if (!opts) opts = {};
  if (!opts.ExpressionAttributeValues) opts.ExpressionAttributeValues = {};

  const keys = Object.getOwnPropertyNames(expressionAttributeValues);
  keys.forEach(key => {
    opts.ExpressionAttributeValues[key] = expressionAttributeValues[key];
  });

  return opts;
}