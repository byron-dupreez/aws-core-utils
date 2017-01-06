'use strict';

/**
 * Utilities for working with AWS DynamoDB.
 * @module aws-core-utils/dynamodb-utils
 * @author Byron du Preez
 */
module.exports = {
  toObjectFromDynamoDBMap: toObjectFromDynamoDBMap,
  toValueFromAttributeValue: toValueFromAttributeValue,
  toValueFromAttributeTypeAndValue: toValueFromAttributeTypeAndValue,
  toNumber: toNumber,
  toKeyValueStrings: toKeyValueStrings,
  toKeyValuePairs: toKeyValuePairs
};

const Strings = require('core-functions/strings');
const stringify = Strings.stringify;

/**
 * Attempts to convert the given DynamoDB map object containing keys and Attribute values into a JavaScript object.
 * @param {Object} dynamoDBMap - a DynamoDB map object with keys and AttributeValue values
 * @returns {Object} a JavaScript object
 */
function toObjectFromDynamoDBMap(dynamoDBMap) {
  if (!dynamoDBMap || typeof dynamoDBMap !== 'object') {
    return dynamoDBMap;
  }
  const object = {};
  const keys = Object.getOwnPropertyNames(dynamoDBMap);
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i];
    object[key] = toValueFromAttributeValue(dynamoDBMap[key]);
  }
  return object;
}

/**
 * Attempts to convert the given DynamoDB AttributeValue object into its equivalent JavaScript value.
 * @param {Object} attributeValue - a DynamoDB AttributeValue object
 * @returns {*} a JavaScript value
 */
function toValueFromAttributeValue(attributeValue) {
  if (!attributeValue || typeof attributeValue !== 'object') {
    return attributeValue;
  }
  const values = Object.getOwnPropertyNames(attributeValue).map(type => {
    return toValueFromAttributeTypeAndValue(type, attributeValue[type])
  });
  if (values.length !== 1) {
    throw new Error(`Found ${values.length} values on DynamoDB AttributeValue (${stringify(attributeValue)}), but expected only one!`);
  }
  return values[0];
}

/**
 * Attempts to convert the given DynamoDB AttributeValue value into its original type based on the given DynamoDB
 * AttributeValue type.
 * @param {string} attributeType - a DynamoDB AttributeValue type
 * @param {*} value - a DynamoDB AttributeValue value
 * @returns {*} a JavaScript value
 */
function toValueFromAttributeTypeAndValue(attributeType, value) {
  switch (attributeType) {
    case 'S':
      return value;
    case 'N':
      return toNumber(value);
    case 'BOOL':
      return value === true || value === 'true';
    case 'NULL':
      return null;
    case 'M':
      return toObjectFromDynamoDBMap(value);
    case 'L':
      return value.map(v => toValueFromAttributeValue(v));
    case 'SS':
      return value;
    case 'NS':
      return value.map(v => toNumber(v));
    case 'B':
    case 'BS':
      return value;
    default:
      throw new Error(`Unexpected DynamoDB attribute value type (${attributeType})`);
  }
}

/**
 * Attempts to convert the given value into a number, but keeps any integer string, which cannot be converted to a
 * number without losing precision.
 * @param {string} value - the value to convert
 * @returns {number|string} the number parsed from the value
 */
function toNumber(value) {
  if (value) {
    const typeOfValue = typeof value;
    if (typeOfValue === 'string' && value.indexOf('.') === -1) {
      // No decimal point, so try for an integer first
      const n = Number.parseInt(value);
      // Check if have enough precision to hold the given integer value ... otherwise rather keep the original string value
      return `${n}` === value ? n : Number.isNaN(n) ? NaN : value;
    } else if (typeOfValue === 'number') {
      return value;
    }
    return Number.parseFloat(value);
  }
  return NaN;
}

/**
 * Extracts an array of colon-separated key name and value strings from the given DynamoDB map object.
 * @param {Object} dynamoDBMap - a DynamoDB map object
 * @returns {string[]} an array of colon-separated key name and value strings
 */
function toKeyValueStrings(dynamoDBMap) {
  if (!dynamoDBMap || typeof dynamoDBMap !== 'object') {
    return [];
  }
  return Object.getOwnPropertyNames(dynamoDBMap).map(key => {
    const value = toValueFromAttributeValue(dynamoDBMap[key]);
    return `${key}:${stringify(value)}`;
  });
}

/**
 * Extracts an array of key value pairs from the given DynamoDB map object. Each key value pair is represented as an
 * array containing a key property name followed by its associated value.
 * @param {Object} dynamoDBMap - a DynamoDB map object
 * @returns {string[]} an array of key name and value pairs
 */
function toKeyValuePairs(dynamoDBMap) {
  if (!dynamoDBMap || typeof dynamoDBMap !== 'object') {
    return [];
  }
  return Object.getOwnPropertyNames(dynamoDBMap).map(key => [key, toValueFromAttributeValue(dynamoDBMap[key])]);
}
