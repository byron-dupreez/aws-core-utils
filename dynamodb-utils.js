'use strict';

/**
 * Defaults used by this module, which can be overridden to alter the default behaviour.
 * @namespace {DynamoDBUtilsDefaults} defaults
 */
const defaults = {
  emptyStringReplacement: ' '
};

/**
 * Utilities for working with AWS DynamoDB.
 * @module aws-core-utils/dynamodb-utils
 * @author Byron du Preez
 */
module.exports = {
  toObjectFromDynamoDBMap: toObjectFromDynamoDBMap,
  toValueFromAttributeValue: toValueFromAttributeValue,
  toValueFromAttributeTypeAndValue: toValueFromAttributeTypeAndValue,
  toKeyValueStrings: toKeyValueStrings,
  toKeyValuePairs: toKeyValuePairs,
  toStorableObject: toStorableObject,
  simplifyKeysNewImageAndOldImage: simplifyKeysNewImageAndOldImage,
  defaults: defaults
};

const Strings = require('core-functions/strings');
const stringify = Strings.stringify;

const Numbers = require('core-functions/numbers');
const toNumberOrIntegerLike = Numbers.toNumberOrIntegerLike;

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
      return toNumberOrIntegerLike(value);
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
      return value.map(v => toNumberOrIntegerLike(v));
    case 'B':
    case 'BS':
      return value;
    default:
      throw new Error(`Unexpected DynamoDB attribute value type (${attributeType})`);
  }
}

/**
 * Extracts an array of colon-separated key name and value strings from the given DynamoDB map object.
 * @param {Object} dynamoDBMap - a DynamoDB map object
 * @returns {string[]} an array of colon-separated key name and value strings
 */
function toKeyValueStrings(dynamoDBMap) {
  return dynamoDBMap && typeof dynamoDBMap === 'object' ?
    Object.getOwnPropertyNames(dynamoDBMap).map(key => `${key}:${stringify(toValueFromAttributeValue(dynamoDBMap[key]))}`) : [];
}

/**
 * Extracts an array of key value pairs from the given DynamoDB map object. Each key value pair is represented as an
 * array containing a key property name followed by its associated value.
 * @param {Object} dynamoDBMap - a DynamoDB map object
 * @returns {KeyValuePair[]} an array of key value pairs
 */
function toKeyValuePairs(dynamoDBMap) {
  return dynamoDBMap && typeof dynamoDBMap === 'object' ?
    Object.getOwnPropertyNames(dynamoDBMap).map(key => [key, toValueFromAttributeValue(dynamoDBMap[key])]) : [];
}

/**
 * Transforms the given object into an object that can be safely stored to DynamoDB with all of its empty strings
 * replaced with Defaults.emptyStringReplacement and with no undefined properties.
 * @param {Object} object - an object to be stored in DynamoDB
 * @returns {Object} an object that can be safely stored in DynamoDB
 */
function toStorableObject(object) {
  // Round-trip to JSON and back to eliminate all undefined properties and replace all empty strings
  return JSON.parse(JSON.stringify(object, emptyStringReplacer));
}

//noinspection JSUnusedLocalSymbols
/**
 * A replacer function to be used with JSON.stringify, which replaces all empty string values with Defaults.emptyStringReplacement.
 * @param {string} key - the key of the property being stringified (initially an empty key representing the object being stringified)
 * @param {*} value - the value being stringified
 * @returns {string} the non-empty string replacement value
 */
function emptyStringReplacer(key, value) {
  // DynamoDB does NOT accept any empty strings including ones inside arrays, so no special case for arrays is necessary
  return value === '' ? defaults.emptyStringReplacement : value;
}

/**
 * Converts and replaces all of the original DynamoDB attribute type & value format "Keys", "NewImage" and "OldImage"
 * properties (if any) on the given dynamodb property object with corresponding new simple object format "keys",
 * "newImage" and "oldImage" properties (each converted using {@link toObjectFromDynamoDBMap}). Deletes the original
 * "Keys", "NewImage" and "OldImage" properties from the given dynamodb property object after conversion.
 * @param {DynamodbProperty|SimpleDynamodbProperty} dynamodbProperty - a dynamodb object property
 * @returns {SimpleDynamodbProperty} the converted, simple objects only form of the given dynamodb property
 */
function simplifyKeysNewImageAndOldImage(dynamodbProperty) {
  if (dynamodbProperty) {
    if (dynamodbProperty.Keys) {
      dynamodbProperty.keys = toObjectFromDynamoDBMap(dynamodbProperty.Keys);
      delete dynamodbProperty.Keys;
    }
    if (dynamodbProperty.NewImage) {
      dynamodbProperty.newImage = toObjectFromDynamoDBMap(dynamodbProperty.NewImage);
      delete dynamodbProperty.NewImage;
    }
    if (dynamodbProperty.OldImage) {
      dynamodbProperty.oldImage = toObjectFromDynamoDBMap(dynamodbProperty.OldImage);
      delete dynamodbProperty.OldImage;
    }
  }
  return dynamodbProperty;
}