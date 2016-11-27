'use strict';

/**
 * Unit tests for aws-core-utils/dynamodb-utils.js
 * @author Byron du Preez
 */

const test = require("tape");

// The test subject
const dynamoDBUtils = require('../dynamodb-utils');
const toObjectFromDynamoDBMap = dynamoDBUtils.toObjectFromDynamoDBMap;
const toValueFromAttributeValue = dynamoDBUtils.toValueFromAttributeValue;
const toValueFromAttributeTypeAndValue = dynamoDBUtils.toValueFromAttributeTypeAndValue;
const toNumber = dynamoDBUtils.toNumber;
const toKeyValueStrings = dynamoDBUtils.toKeyValueStrings;

const strings = require('core-functions/strings');
const stringify = strings.stringify;

test('toNumber', t => {
  // A simple integer
  t.equal(toNumber('103'), 103, `toNumber('103') must be ${103}`);
  // A simple float
  t.equal(toNumber('3.1415679'), 3.1415679, `toNumber('3.1415679') must be ${3.1415679}`);

  // Too big to hold in an integer
  t.equal(toNumber('9223372036854775807'), 9223372036854775807, `toNumber('9223372036854775807') must be almost 9223372036854775807`);
  t.equal(toNumber('9223372036854775807'), 9223372036854776000, `toNumber('9223372036854775807') must be actually ${9223372036854775807}`);

  t.ok(Number.isNaN(toNumber('')), `toNumber('') must be NaN`);
  t.ok(Number.isNaN(toNumber('abc')), `toNumber('abc') must be NaN`);
  t.ok(Number.isNaN(toNumber(undefined)), `toNumber(undefined) must be NaN`);
  t.ok(Number.isNaN(toNumber(null)), `toNumber(null) must be NaN`);
  t.ok(Number.isNaN(toNumber({})), `toNumber({}) must be NaN`);
  t.ok(Number.isNaN(toNumber([])), `toNumber([]) must be NaN`);

  t.end();
});

test('toValueFromAttributeTypeAndValue', t => {
  t.equal(toValueFromAttributeTypeAndValue('NULL', true), null, `toValueFromAttributeTypeAndValue('NULL', true) must be null`);
  t.equal(toValueFromAttributeTypeAndValue('NULL', false), null, `toValueFromAttributeTypeAndValue('NULL', false) must be null`);

  t.equal(toValueFromAttributeTypeAndValue('S', 'abc'), 'abc', `toValueFromAttributeTypeAndValue('S', 'abc') must be 'abc'`);
  t.equal(toValueFromAttributeTypeAndValue('S', ''), '', `toValueFromAttributeTypeAndValue('S', '') must be ''`);

  t.equal(toValueFromAttributeTypeAndValue('N', '789'), 789, `toValueFromAttributeTypeAndValue('N', '789') must be 789`);
  t.equal(toValueFromAttributeTypeAndValue('N', '789.123'), 789.123, `toValueFromAttributeTypeAndValue('N', '789.123') must be 789.123`);
  t.equal(toValueFromAttributeTypeAndValue('N', 456), 456, `toValueFromAttributeTypeAndValue('N', 456) must be 456`);
  t.equal(toValueFromAttributeTypeAndValue('N', 123.789), 123.789, `toValueFromAttributeTypeAndValue('N', 123.789) must be 123.789`);

  t.equal(toValueFromAttributeTypeAndValue('BOOL', true), true, `toValueFromAttributeTypeAndValue('BOOL', true) must be true`);
  t.equal(toValueFromAttributeTypeAndValue('BOOL', 'true'), true, `toValueFromAttributeTypeAndValue('BOOL', 'true') must be true`);
  t.equal(toValueFromAttributeTypeAndValue('BOOL', false), false, `toValueFromAttributeTypeAndValue('BOOL', false) must be false`);
  t.equal(toValueFromAttributeTypeAndValue('BOOL', 'false'), false, `toValueFromAttributeTypeAndValue('BOOL', 'false') must be false`);

  t.deepEqual(toValueFromAttributeTypeAndValue('SS', ['abc', 'def']), ['abc', 'def'], `toValueFromAttributeTypeAndValue('SS', ['abc', 'def']) must be ['abc','def']`);

  t.deepEqual(toValueFromAttributeTypeAndValue('NS', ['789', '42']), [789, 42], `toValueFromAttributeTypeAndValue('NS', ['789', '42']) => ${stringify(toValueFromAttributeTypeAndValue('NS', ['789', '42']))} must be [789, 42]`);
  t.deepEqual(toValueFromAttributeTypeAndValue('NS', ['789.123']), [789.123], `toValueFromAttributeTypeAndValue('NS', ['789.123']) => ${stringify(toValueFromAttributeTypeAndValue('NS', ['789.123']))} must be [789.123]`);

  t.deepEqual(toValueFromAttributeTypeAndValue('L', [{'N': '789'}, {'S': '42'}]), [789, '42'], `toValueFromAttributeTypeAndValue('L', [{'N': '789'}, {'S': '42'}]) => ${JSON.stringify(toValueFromAttributeTypeAndValue('L', [{'N': '789'}, {'S': '42'}]))} must be [789, '42']`);
  t.deepEqual(toValueFromAttributeTypeAndValue('L', [{'M': {x: {'N': '789'}}}]), [{x: 789}], `toValueFromAttributeTypeAndValue('L', [{'M': {x: {'N': '789'}}}]) => ${stringify(toValueFromAttributeTypeAndValue('L', [{'M': {x: {'N': '789'}}}]))} must be [{x: 789}]`);

  t.deepEqual(toValueFromAttributeTypeAndValue('M', {id: {'N': '789'}, value: {'S': '42'}}), {id: 789, value: '42'}, `toValueFromAttributeTypeAndValue('M', {id: {'N': '789'}, value: {'S': '42'}}) => ${stringify(toValueFromAttributeTypeAndValue('M', {id: {'N': '789'}, value: {'S': '42'}}))} must be {id: 789, value: '42'}`);
  t.deepEqual(toValueFromAttributeTypeAndValue('M', {id: {'N': '789'}, x: {'M': { value: {'S': '42'}}}}), {id: 789, x: {value: '42'}}, `toValueFromAttributeTypeAndValue('M', {id: {'N': '789'}, x: {'M': { value: {'S': '42'}}}}) => ${stringify(toValueFromAttributeTypeAndValue('M', {id: {'N': '789'}, x: {'M': { value: {'S': '42'}}}}))} must be {id: 789, x: {value: '42'}}`);

  t.end();
});

test('toValueFromAttributeValue', t => {
  t.equal(toValueFromAttributeValue(undefined), undefined, `toValueFromAttributeValue(undefined) must be undefined`);
  t.equal(toValueFromAttributeValue(null), null, `toValueFromAttributeValue(null) must be null`);

  // Too few AttributeValue types
  t.throws(() => toValueFromAttributeValue({}), `toValueFromAttributeValue({}) must throw error for too few types`);

  // Too many AttributeValue types
  t.throws(() => toValueFromAttributeValue({'NULL': true, 'BOOL': true}), `toValueFromAttributeValue({}) must throw error for too many types`);

  t.equal(toValueFromAttributeValue({'NULL': true}), null, `toValueFromAttributeValue({'NULL': true}) must be null`);
  t.equal(toValueFromAttributeValue({'NULL': false}), null, `toValueFromAttributeValue({'NULL': false}) must be null`);

  t.equal(toValueFromAttributeValue({'S': 'abc'}), 'abc', `toValueFromAttributeValue({'S': 'abc'}) must be 'abc'`);
  t.equal(toValueFromAttributeValue({'S': ''}), '', `toValueFromAttributeValue({'S': ''}) must be ''`);

  t.equal(toValueFromAttributeValue({'N': '789'}), 789, `toValueFromAttributeValue({'N': '789'}) must be 789`);
  t.equal(toValueFromAttributeValue({'N': '789.123'}), 789.123, `toValueFromAttributeValue({'N': '789.123'}) must be 789.123`);

  t.equal(toValueFromAttributeValue({'BOOL': true}), true, `toValueFromAttributeValue({'BOOL': true}) must be true`);
  t.equal(toValueFromAttributeValue({'BOOL': 'true'}), true, `toValueFromAttributeValue({'BOOL': 'true'}) must be true`);
  t.equal(toValueFromAttributeValue({'BOOL': false}), false, `toValueFromAttributeValue({'BOOL': false}) must be false`);
  t.equal(toValueFromAttributeValue({'BOOL': 'false'}), false, `toValueFromAttributeValue({'BOOL: 'false'}) must be false`);

  t.deepEqual(toValueFromAttributeValue({'SS': ['abc', 'def']}), ['abc', 'def'], `toValueFromAttributeValue({'SS': ['abc', 'def']}) must be ['abc','def']`);

  t.deepEqual(toValueFromAttributeValue({'NS': ['789', '42']}), [789, 42], `toValueFromAttributeValue({'NS': ['789', '42']}) => ${stringify(toValueFromAttributeValue({'NS': ['789', '42']}))} must be [789, 42]`);
  t.deepEqual(toValueFromAttributeValue({'NS': ['789.123']}), [789.123], `toValueFromAttributeValue({'NS': ['789.123']}) => ${stringify(toValueFromAttributeValue({'NS': ['789.123']}))} must be [789.123]`);

  t.deepEqual(toValueFromAttributeValue({'L': [{'N': '789'}, {'S': '42'}]}), [789, '42'], `toValueFromAttributeValue({'L': [{'N': '789'}, {'S': '42'}]}) => ${JSON.stringify(toValueFromAttributeValue({'L': [{'N': '789'}, {'S': '42'}]}))} must be [789, '42']`);
  t.deepEqual(toValueFromAttributeValue({'L': [{'M': {x: {'N': '789'}}}]}), [{x: 789}], `toValueFromAttributeValue({'L': [{'M': {x: {'N': '789'}}}]}) => ${stringify(toValueFromAttributeValue({'L': [{'M': {x: {'N': '789'}}}]}))} must be [{x: 789}]`);

  t.deepEqual(toValueFromAttributeValue({'M': {id: {'N': '789'}, value: {'S': '42'}}}), {id: 789, value: '42'}, `toValueFromAttributeValue({'M': {id: {'N': '789'}, value: {'S': '42'}}}) => ${stringify(toValueFromAttributeValue({'M': {id: {'N': '789'}, value: {'S': '42'}}}))} must be {id: 789, value: '42'}`);
  t.deepEqual(toValueFromAttributeValue({'M': {id: {'N': '789'}, x: {'M': { value: {'S': '42'}}}}}), {id: 789, x: {value: '42'}}, `toValueFromAttributeValue({'M': {id: {'N': '789'}, x: {'M': { value: {'S': '42'}}}}}) => ${stringify(toValueFromAttributeValue({'M': {id: {'N': '789'}, x: {'M': { value: {'S': '42'}}}}}))} must be {id: 789, x: {value: '42'}}`);

  t.end();
});

test('toObjectFromDynamoDBMap', t => {
  t.deepEqual(toObjectFromDynamoDBMap(undefined), undefined, `toObjectFromDynamoDBMap(undefined) => ${JSON.stringify(toObjectFromDynamoDBMap(undefined))} must be undefined`);
  t.deepEqual(toObjectFromDynamoDBMap(null), null, `toObjectFromDynamoDBMap(null) => ${JSON.stringify(toObjectFromDynamoDBMap(null))} must be null`);
  t.deepEqual(toObjectFromDynamoDBMap({}), {}, `toObjectFromDynamoDBMap({}) => ${JSON.stringify(toObjectFromDynamoDBMap({}))} must be {}`);

  t.deepEqual(toObjectFromDynamoDBMap({id: {'N': '789'}}), {id: 789}, `toObjectFromDynamoDBMap({id: {'N': '789'}}) => ${JSON.stringify(toObjectFromDynamoDBMap({id: {'N': '789'}}))} must be {id: 789}`);
  t.deepEqual(toObjectFromDynamoDBMap({id: {'N': '789'}, value: {'S': '42'}}), {id: 789, value: '42'}, `toObjectFromDynamoDBMap({id: {'N': '789'}, value: {'S': '42'}}) => ${JSON.stringify(toObjectFromDynamoDBMap({id: {'N': '789'}, value: {'S': '42'}}))} must be {id: 789, value: '42'}`);
  t.deepEqual(toObjectFromDynamoDBMap({id: {'N': '789'}, x: {'M': { value: {'S': '42'}}}}), {id: 789, x: {value: '42'}}, `toObjectFromDynamoDBMap({id: {'N': '789'}, x: {'M': { value: {'S': '42'}}}}) => ${stringify(toObjectFromDynamoDBMap({id: {'N': '789'}, x: {'M': { value: {'S': '42'}}}}))} must be {id: 789, x: {value: '42'}}`);
  t.deepEqual(toObjectFromDynamoDBMap({obj: {'M': {id: {'N': '789'}, value: {'S': '42'}}}}), {obj: {id: 789, value: '42'}}, `toObjectFromDynamoDBMap({obj: {'M': {id: {'N': '789'}, value: {'S': '42'}}}}) => ${stringify(toObjectFromDynamoDBMap({obj: {'M': {id: {'N': '789'}, value: {'S': '42'}}}}))} must be {obj: {id: 789, value: '42'}}`);

  t.end();
});

test('toKeyValueStrings', t => {
  t.deepEqual(toKeyValueStrings(undefined), [], `toKeyValueStrings(undefined) => ${JSON.stringify(toKeyValueStrings(undefined))} must be []`);
  t.deepEqual(toKeyValueStrings(null), [], `toKeyValueStrings(null) => ${JSON.stringify(toKeyValueStrings(null))} must be []`);
  t.deepEqual(toKeyValueStrings({}), [], `toKeyValueStrings({}) => ${JSON.stringify(toKeyValueStrings({}))} must be []`);

  t.deepEqual(toKeyValueStrings({id: {'N': '123'}}), ['id:123'], `toKeyValueStrings({id: {'N': '123'}}) => ${JSON.stringify(toKeyValueStrings({id: {'N': '123'}}))} must be ['id:123']`);
  t.deepEqual(toKeyValueStrings({id: {'N': '456'}, value: {'S': '42'}}), ['id:456', 'value:42'], `toKeyValueStrings({id: {'N': '456'}, value: {'S': '42'}}) => ${JSON.stringify(toKeyValueStrings({id: {'N': '456'}, value: {'S': '42'}}))} must be ['id:456', 'value:42']`);
  t.deepEqual(toKeyValueStrings({id: {'N': '789'}, value: {'S': 'abc'}, bool: {'BOOL': true}}), ['id:789', 'value:abc', 'bool:true'], `toKeyValueStrings({id: {'N': '789'}, value: {'S': 'abc'}, bool: {'BOOL': true}}) => ${JSON.stringify(toKeyValueStrings({id: {'N': '789'}, value: {'S': 'abc'}, bool: {'BOOL': true}}))} must be ['id:789', 'value:abc', 'bool:true']`);
  t.deepEqual(toKeyValueStrings({id: {'N': '3.12456'}, x: {'M': { value: {'S': 'def'}}}}), ['id:3.12456', `x:${JSON.stringify({value: 'def'})}`], `toKeyValueStrings({id: {'N': '3.12456'}, x: {'M': { value: {'S': 'def'}}}}) => ${stringify(toKeyValueStrings({id: {'N': '3.12456'}, x: {'M': { value: {'S': 'def'}}}}))} must be ['id:3.12456', 'x:${JSON.stringify({value: 'def'})}']`);
  t.deepEqual(toKeyValueStrings({obj: {'M': {id: {'N': '1.01'}, value: {'S': 'xyz'}}}}), [`obj:${JSON.stringify({id: 1.01, value: 'xyz'})}`], `toKeyValueStrings({obj: {'M': {id: {'N': '1.01'}, value: {'S': 'xyz'}}}}) => ${stringify(toKeyValueStrings({obj: {'M': {id: {'N': '1.01'}, value: {'S': 'xyz'}}}}))} must be ['obj:${JSON.stringify({id: 1.01, value: 'xyz'})}']`);

  t.end();
});