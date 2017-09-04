'use strict';

/**
 * Unit tests for aws-core-utils/arns.js
 * @module aws-core-utils/arns
 * @author Byron du Preez
 */

const test = require('tape');

// The test subject
const arns = require('../arns');

const getArnComponent = arns.getArnComponent;
const getArnPartition = arns.getArnPartition;
const getArnService = arns.getArnService;
const getArnRegion = arns.getArnRegion;
const getArnAccountId = arns.getArnAccountId;
const getArnResources = arns.getArnResources;

const arn1 = "arn:partition:service:region:account-id:resource";
const arn2 = "arn:partition:service:region:account-id:resourcetype/resource";
const arn3 = "arn:partition:service:region:account-id:resourcetype:resource";
const samples = [arn1, arn2, arn3];

const expectedComponents = [
  ['arn', 'partition', 'service', 'region', 'account-id', 'resource'],
  ['arn', 'partition', 'service', 'region', 'account-id', 'resourcetype/resource'],
  ['arn', 'partition', 'service', 'region', 'account-id', 'resourcetype', 'resource']
];

function checkComponents(arn, id, expectedIndex, t) {
  const expected = expectedComponents[expectedIndex];
  const n = expected.length;
  for (let c = 0; c < n; c++) {
    const actual = getArnComponent(arn, c);
    t.equal(actual, expected[c], `arn ${id} component[${c}] must match ${expected[c]}`);
  }
  // Ensure out of bounds just returns undefined
  t.notOk(getArnComponent(arn, -1), `arn ${id} component[${-1}] must be undefined`);
  t.notOk(getArnComponent(arn, n), `arn ${id} component[${n}] must be undefined`);
  t.notOk(getArnComponent(arn, n + 1), `arn ${id} component[${n+1}] must be undefined`);
}

test('getArnComponent', t => {
  for (let i = 0; i < samples.length; i++) {
    checkComponents(samples[i], i+1, i, t);
  }
  t.end();
});

test('getArnPartition', t => {
  const expected = 'partition';
  t.equal(getArnPartition(arn1), expected, `must be ${expected}`);
  t.equal(getArnPartition(arn2), expected, `must be ${expected}`);
  t.equal(getArnPartition(arn3), expected, `must be ${expected}`);
  t.equal(getArnPartition(undefined), '', 'must be empty string');
  t.equal(getArnPartition(null), '', 'must be empty string');
  t.equal(getArnPartition('arn'), '', 'must be empty string');
  t.equal(getArnPartition('arn:'), '', 'must be empty string');
  t.end();
});

test('getArnService', t => {
  const expected = 'service';
  t.equal(getArnService(arn1), expected, `must be ${expected}`);
  t.equal(getArnService(arn2), expected, `must be ${expected}`);
  t.equal(getArnService(arn3), expected, `must be ${expected}`);
  t.equal(getArnService(undefined), '', 'must be empty string');
  t.equal(getArnService(null), '', 'must be empty string');
  t.equal(getArnService('arn:partition'), '', 'must be empty string');
  t.equal(getArnService('arn:partition:'), '', 'must be empty string');
  t.end();
});

test('getArnRegion', t => {
  const expected = 'region';
  t.equal(getArnRegion(arn1), expected, `must be ${expected}`);
  t.equal(getArnRegion(arn2), expected, `must be ${expected}`);
  t.equal(getArnRegion(arn3), expected, `must be ${expected}`);
  t.equal(getArnRegion(undefined), '', 'must be empty string');
  t.equal(getArnRegion(null), '', 'must be empty string');
  t.equal(getArnRegion('arn:partition:service'), '', 'must be empty string');
  t.equal(getArnRegion('arn:partition:service:'), '', 'must be empty string');
  t.end();
});

test('getArnAccountId', t => {
  const expected = 'account-id';
  t.equal(getArnAccountId(arn1), expected, `must be ${expected}`);
  t.equal(getArnAccountId(arn2), expected, `must be ${expected}`);
  t.equal(getArnAccountId(arn3), expected, `must be ${expected}`);
  t.equal(getArnAccountId(undefined), '', 'must be empty string');
  t.equal(getArnAccountId(null), '', 'must be empty string');
  t.equal(getArnAccountId('arn:partition:service:region'), '', 'must be empty string');
  t.equal(getArnAccountId('arn:partition:service:region:'), '', 'must be empty string');
  t.end();
});

test('getArnResources', t => {
  const arn1 = "arn:partition:service:region:account-id:resource";
  const arn2 = "arn:partition:service:region:account-id:resourcetype/resource";
  const arn3 = "arn:partition:service:region:account-id:resourcetype/resource/subResourceType/subResource";
  const arn4 = "arn:partition:service:region:account-id:resourcetype:resource";
  const arn5 = "arn:partition:service:region:account-id:resourcetype:resource:alias_or_version";
  const arn6 = "arn:partition:service:region:account-id:resourcetype:resource:alias_or_version:other1";
  const arn6a = "arn:partition:service:region:account-id:resourcetype:resource:alias_or_version:other1:other2";
  const arn6b = "arn:partition:service:region:account-id:resourcetype:resource:alias_or_version:other1:other2:other3";

  const expected0 = {resourceType: '', resource: '', subResourceType: '', subResource: '', aliasOrVersion: '', others: []};
  t.deepEqual(getArnResources(undefined), expected0, `undefined must give [${JSON.stringify(expected0)}]`);
  t.deepEqual(getArnResources(null), expected0, `null must give [${JSON.stringify(expected0)}]`);
  t.deepEqual(getArnResources(''), expected0, `'' must give [${JSON.stringify(expected0)}]`);
  t.deepEqual(getArnResources('arn:partition:service:region:account-id'), expected0, `too short 1 must give [${JSON.stringify(expected0)}]`);
  t.deepEqual(getArnResources('arn:partition:service:region:account-id:'), expected0, `too short 2 must give [${JSON.stringify(expected0)}]`);

  function shorter(s) {
    return s && s.startsWith('arn:partition:service:region:account-id') ?
      "..." + s.substring('arn:partition:service:region:account-id'.length) : s;
  }

  const expected1 = {resourceType: '', resource: 'resource', subResourceType: '', subResource: '', aliasOrVersion: '', others: []};
  t.deepEqual(getArnResources(arn1), expected1, `CASE 1: '${shorter(arn1)}' must give [${JSON.stringify(expected1)}]`);

  const expected2 = {resourceType: 'resourcetype', resource: 'resource', subResourceType: '', subResource: '', aliasOrVersion: '', others: []};
  t.deepEqual(getArnResources(arn2), expected2, `CASE 2: '${shorter(arn3)}' must give [${JSON.stringify(expected2)}]`);

  const expected3 = {resourceType: 'resourcetype', resource: 'resource', subResourceType: 'subResourceType', subResource: 'subResource', aliasOrVersion: '', others: []};
  t.deepEqual(getArnResources(arn3), expected3, `CASE 3: '${shorter(arn3)}' must give [${JSON.stringify(expected3)}]`);

  const arn3b = "arn:partition:service:region:account-id:table/MyTableName/stream/2020-10-10T08:18:22.385";
  const expected3b = {resourceType: 'table', resource: 'MyTableName', subResourceType: 'stream', subResource: '2020-10-10T08:18:22.385', aliasOrVersion: '', others: []};
  t.deepEqual(getArnResources(arn3b), expected3b, `CASE 3b: '${shorter(arn3)}' must give [${JSON.stringify(expected3b)}]`);

  const expected4 = {resourceType: 'resourcetype', resource: 'resource', subResourceType: '', subResource: '', aliasOrVersion: '', others: []};
  t.deepEqual(getArnResources(arn4), expected4, `CASE 4: '${shorter(arn4)}' must give [${JSON.stringify(expected4)}]`);

  const expected5 = {resourceType: 'resourcetype', resource: 'resource', subResourceType: '', subResource: '', aliasOrVersion: 'alias_or_version', others: []};
  t.deepEqual(getArnResources(arn5), expected5, `CASE 5: '${shorter(arn5)}' must give [${JSON.stringify(expected5)}]`);

  const expected6 = {resourceType: 'resourcetype', resource: 'resource', subResourceType: '', subResource: '', aliasOrVersion: 'alias_or_version', others: ['other1']};
  t.deepEqual(getArnResources(arn6), expected6, `CASE 6: '${shorter(arn6)}' must give [${JSON.stringify(expected6)}]`);

  const expected6a = {resourceType: 'resourcetype', resource: 'resource', subResourceType: '', subResource: '', aliasOrVersion: 'alias_or_version', others: ['other1','other2']};
  t.deepEqual(getArnResources(arn6a), expected6a, `CASE 6a: '${shorter(arn6a)}' must give [${JSON.stringify(expected6a)}]`);

  const expected6b = {resourceType: 'resourcetype', resource: 'resource', subResourceType: '', subResource: '', aliasOrVersion: 'alias_or_version', others: ['other1','other2','other3']};
  t.deepEqual(getArnResources(arn6b), expected6b, `CASE 6b: '${shorter(arn6b)}' must give [${JSON.stringify(expected6b)}]`);

  t.end();
});
