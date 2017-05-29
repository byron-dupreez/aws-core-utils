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
const toKeyValuePairs = dynamoDBUtils.toKeyValuePairs;
const toStorableObject = dynamoDBUtils.toStorableObject;
const simplifyKeysNewImageAndOldImage = dynamoDBUtils.simplifyKeysNewImageAndOldImage;
const defaults = dynamoDBUtils.defaults;

const strings = require('core-functions/strings');
const stringify = strings.stringify;

const Objects = require('core-functions/objects');
const copy = Objects.copy;

const samples = require('./samples');

const putRequest = {
  TableName : 'Table',
  Item: {
    hashKey: 'hashkey',
    numAttribute: 1,
    boolAttribute: true,
    list1: [1, 'two', false, '', null],
    empty1: '',
    undefined1: undefined,
    map1: {
      foo: 'bar',
      empty2: '',
      undefined2: undefined,
      map2: {
        abc: 'abc',
        empty3: '',
        undefined3: undefined,
        spaces: '  ',
        null2: null
      }
    },
    null1: null
  }
};

test('toNumber', t => {
  // A simple integer
  t.equal(toNumber('103'), 103, `toNumber('103') must be ${103}`);
  // A simple float
  t.equal(toNumber('3.1415679'), 3.1415679, `toNumber('3.1415679') must be ${3.1415679}`);

  // +/- 2 to the power of 53 should still give numbers, since have about 54 bits of precisions for integers
  t.equal(toNumber('9007199254740992'), 9007199254740992, `toNumber('9007199254740992') must be ${9007199254740992}`);
  t.equal(toNumber('-9007199254740992'), -9007199254740992, `toNumber('-9007199254740992') must be ${-9007199254740992}`);

  // +/- 2 to the power of 54 is still ok
  t.equal(toNumber('18014398509481984'), 18014398509481984, `toNumber('18014398509481984') must be ${18014398509481984}`);
  t.equal(toNumber('-18014398509481984'), -18014398509481984, `toNumber('-18014398509481984') must be ${-18014398509481984}`);

  // +/- 2 to the power of 55 is too big
  t.notEqual(toNumber('36028797018963968'), 36028797018963968, `toNumber('36028797018963968') must NOT be ${36028797018963968}`);
  t.notEqual(toNumber('-36028797018963968'), -36028797018963968, `toNumber('-36028797018963968') must NOT be ${-36028797018963968}`);
  t.equal(toNumber('36028797018963968'), '36028797018963968', `toNumber('36028797018963968') must be '36028797018963968'`);
  t.equal(toNumber('-36028797018963968'), '-36028797018963968', `toNumber('-36028797018963968') must be '-36028797018963968'`);

  // +/- 2 to the power of 56 is too big
  t.notEqual(toNumber('72057594037927936'), 72057594037927936, `toNumber('72057594037927936') must NOT be ${72057594037927936}`);
  t.notEqual(toNumber('-72057594037927936'), -72057594037927936, `toNumber('-72057594037927936') must NOT be ${-72057594037927936}`);
  t.equal(toNumber('72057594037927936'), '72057594037927936', `toNumber('72057594037927936') must be '72057594037927936'`);
  t.equal(toNumber('-72057594037927936'), '-72057594037927936', `toNumber('-72057594037927936') must be '-72057594037927936'`);

  // Too big to hold in an integer
  t.equal(toNumber('9223372036854775807'), '9223372036854775807', `toNumber('9223372036854775807') must be '9223372036854775807'`);
  t.equal(toNumber('-9223372036854775808'), '-9223372036854775808', `toNumber('-9223372036854775808') must be '-9223372036854775808'`);

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

test('toKeyValuePairs', t => {
  t.deepEqual(toKeyValuePairs(undefined), [], `toKeyValuePairs(undefined) => ${JSON.stringify(toKeyValuePairs(undefined))} must be []`);
  t.deepEqual(toKeyValuePairs(null), [], `toKeyValuePairs(null) => ${JSON.stringify(toKeyValuePairs(null))} must be []`);
  t.deepEqual(toKeyValuePairs({}), [], `toKeyValuePairs({}) => ${JSON.stringify(toKeyValuePairs({}))} must be []`);

  t.deepEqual(toKeyValuePairs({id: {'N': '123'}}), [['id', 123]], `toKeyValuePairs({id: {'N': '123'}}) => ${JSON.stringify(toKeyValuePairs({id: {'N': '123'}}))} must be [['id',123]]`);
  t.deepEqual(toKeyValuePairs({id: {'N': '456'}, value: {'S': '42'}}), [['id', 456], ['value', '42']], `toKeyValuePairs({id: {'N': '456'}, value: {'S': '42'}}) => ${JSON.stringify(toKeyValuePairs({id: {'N': '456'}, value: {'S': '42'}}))} must be [['id', 456], ['value', '42']]`);
  t.deepEqual(toKeyValuePairs({id: {'N': '789'}, value: {'S': 'abc'}, bool: {'BOOL': true}}), [['id',789], ['value','abc'], ['bool',true]], `toKeyValuePairs({id: {'N': '789'}, value: {'S': 'abc'}, bool: {'BOOL': true}}) => ${JSON.stringify(toKeyValuePairs({id: {'N': '789'}, value: {'S': 'abc'}, bool: {'BOOL': true}}))} must be [['id',789], ['value','abc'], ['bool',true]]`);
  t.deepEqual(toKeyValuePairs({id: {'N': '3.12456'}, x: {'M': { value: {'S': 'def'}}}}), [['id',3.12456], ['x', {value: 'def'}]], `toKeyValuePairs({id: {'N': '3.12456'}, x: {'M': { value: {'S': 'def'}}}}) => ${stringify(toKeyValuePairs({id: {'N': '3.12456'}, x: {'M': { value: {'S': 'def'}}}}))} must be [['id',3.12456], ['x', {value: 'def'}]]`);
  t.deepEqual(toKeyValuePairs({obj: {'M': {id: {'N': '1.01'}, value: {'S': 'xyz'}}}}), [['obj', {id: 1.01, value: 'xyz'}]], `toKeyValuePairs({obj: {'M': {id: {'N': '1.01'}, value: {'S': 'xyz'}}}}) => ${stringify(toKeyValuePairs({obj: {'M': {id: {'N': '1.01'}, value: {'S': 'xyz'}}}}))} must be [['obj', {id: 1.01, value: 'xyz'}]]`);

  t.end();
});

test('toStorableObject with default emptyStringReplacement', t => {
  let emptyStringReplacement = defaults.emptyStringReplacement; // 'EMPTY_STRING';
  //Defaults.emptyStringReplacement = emptyStringReplacement;

  const item = toStorableObject(putRequest.Item);
  // console.log(`toStorableObject(putRequest.Item) = ${stringify(item)}`);

  const oldItem = putRequest.Item;

  // Check empty strings were replaced
  t.equal(item.empty1, emptyStringReplacement, `item.empty1 must be ${emptyStringReplacement}`);
  t.equal(item.map1.empty2, emptyStringReplacement, `item.map1.empty2 must be ${emptyStringReplacement}`);
  t.equal(item.map1.map2.empty3, emptyStringReplacement, `item.map1.map2.empty3 must be ${emptyStringReplacement}`);
  t.equal(item.list1[3], emptyStringReplacement, `item.list1[3] must be ${emptyStringReplacement}`);

  // Check non-empty strings are still intact
  t.equal(item.hashKey, oldItem.hashKey, `item.hashKey must be ${oldItem.hashKey}`);
  t.equal(item.map1.foo, oldItem.map1.foo, `item.map1.foo must be ${oldItem.map1.foo}`);
  t.equal(item.map1.map2.abc, oldItem.map1.map2.abc, `item.map1.map2.abc must be ${oldItem.map1.map2.abc}`);
  t.equal(item.map1.map2.spaces, oldItem.map1.map2.spaces, `item.map1.map2.spaces must be ${oldItem.map1.map2.spaces}`);
  t.equal(item.list1[1], oldItem.list1[1], `item.list1[1] must be ${oldItem.list1[1]}`);

  const itemKeys = Object.getOwnPropertyNames(item);
  const map1Keys = Object.getOwnPropertyNames(item.map1);
  const map2Keys = Object.getOwnPropertyNames(item.map1.map2);

  // Ensure that no undefined properties exist
  t.equal(itemKeys.indexOf('undefined1'), -1, `item.undefined1 must NOT exist`);
  t.equal(map1Keys.indexOf('undefined2'), -1, `item.map1.undefined2 must NOT exist`);
  t.equal(map2Keys.indexOf('undefined3'), -1, `item.map1.map2.undefined3 must NOT exist`);

  // Ensure that null properties are intact
  t.notEqual(itemKeys.indexOf('null1'), -1, `item.null1 must exist`);
  t.equal(item.null1, null, `item.null1 must be null`);
  t.equal(item.map1.map2.null2, null, `item.map1.map2.null2 must be null`);
  t.equal(item.list1[4], null, `item.list1[4] must be null`);

  t.end();
});

test('toStorableObject with overridden Defaults.emptyStringReplacement', t => {
  let emptyStringReplacement = 'EMPTY_STRING';
  // Override the default empty string replacement
  defaults.emptyStringReplacement = emptyStringReplacement;

  const item = toStorableObject(putRequest.Item);
  // console.log(`toStorableObject(putRequest.Item) = ${stringify(item)}`);

  const oldItem = putRequest.Item;

  // Check empty strings were replaced
  t.equal(item.empty1, emptyStringReplacement, `item.empty1 must be ${emptyStringReplacement}`);
  t.equal(item.map1.empty2, emptyStringReplacement, `item.map1.empty2 must be ${emptyStringReplacement}`);
  t.equal(item.map1.map2.empty3, emptyStringReplacement, `item.map1.map2.empty3 must be ${emptyStringReplacement}`);
  t.equal(item.list1[3], emptyStringReplacement, `item.list1[3] must be ${emptyStringReplacement}`);

  // Check non-empty strings are still intact
  t.equal(item.hashKey, oldItem.hashKey, `item.hashKey must be ${oldItem.hashKey}`);
  t.equal(item.map1.foo, oldItem.map1.foo, `item.map1.foo must be ${oldItem.map1.foo}`);
  t.equal(item.map1.map2.abc, oldItem.map1.map2.abc, `item.map1.map2.abc must be ${oldItem.map1.map2.abc}`);
  t.equal(item.map1.map2.spaces, oldItem.map1.map2.spaces, `item.map1.map2.spaces must be ${oldItem.map1.map2.spaces}`);
  t.equal(item.list1[1], oldItem.list1[1], `item.list1[1] must be ${oldItem.list1[1]}`);

  const itemKeys = Object.getOwnPropertyNames(item);
  const map1Keys = Object.getOwnPropertyNames(item.map1);
  const map2Keys = Object.getOwnPropertyNames(item.map1.map2);

  // Ensure that no undefined properties exist
  t.equal(itemKeys.indexOf('undefined1'), -1, `item.undefined1 must NOT exist`);
  t.equal(map1Keys.indexOf('undefined2'), -1, `item.map1.undefined2 must NOT exist`);
  t.equal(map2Keys.indexOf('undefined3'), -1, `item.map1.map2.undefined3 must NOT exist`);

  // Ensure that null properties are intact
  t.notEqual(itemKeys.indexOf('null1'), -1, `item.null1 must exist`);
  t.equal(item.null1, null, `item.null1 must be null`);
  t.equal(item.map1.map2.null2, null, `item.map1.map2.null2 must be null`);
  t.equal(item.list1[4], null, `item.list1[4] must be null`);

  t.end();
});

test('simplifyKeysNewImageAndOldImage', t => {
  const eventSourceARN = samples.sampleDynamoDBEventSourceArn('us-west-2', 'TestTable_DEV', '2017-03-13T21:33:45');
  const record = samples.sampleDynamoDBMessage('E001', '10000000000000000', eventSourceARN, '123', 456, 'ABC', 10, 1, 2, 3, '4', '5', true);
  const msg = copy(record, {deep: true});
  const dynamodb = msg.dynamodb;

  t.ok(dynamodb.Keys, `dynamodb.Keys must still exist`);
  t.ok(dynamodb.NewImage, `dynamodb.NewImage must still exist`);
  t.ok(dynamodb.OldImage, `dynamodb.OldImage must still exist`);
  t.notOk(dynamodb.keys, `dynamodb.keys must not exist yet`);
  t.notOk(dynamodb.newImage, `dynamodb.newImage must not exist yet`);
  t.notOk(dynamodb.oldImage, `dynamodb.oldImage must not exist yet`);

  simplifyKeysNewImageAndOldImage(dynamodb);

  const expected = {
    "keys": {
      "k1": "ABC",
      "k2": 10
    },
    "newImage": {
      "k1": "ABC",
      "k2": 10,
      "id1": "123",
      "id2": "456",
      "n1": 1,
      "n2": 2,
      "n3": 3,
      "n4": '4',
      "n5": '5'
    },
    "oldImage": {
      "k1": "ABC",
      "k2": 10,
      "id1": "123",
      "id2": "456",
      "n1": 1,
      "n2": 2,
      "n3": 2,
      "n4": '4',
      "n5": '5'
    }
  };

  t.deepEqual(dynamodb.keys, expected.keys, `dynamodb.keys must be ${stringify(expected.keys)}`);
  t.deepEqual(dynamodb.newImage, expected.newImage, `dynamodb.newImage must be ${stringify(expected.newImage)}`);
  t.deepEqual(dynamodb.oldImage, expected.oldImage, `dynamodb.oldImage must be ${stringify(expected.oldImage)}`);
  t.notOk(dynamodb.Keys, `dynamodb.Keys must no longer exist`);
  t.notOk(dynamodb.NewImage, `dynamodb.NewImage must no longer exist`);
  t.notOk(dynamodb.OldImage, `dynamodb.OldImage must no longer exist`);

  t.end();
});