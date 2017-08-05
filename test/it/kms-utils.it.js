'use strict';

/**
 * Unit tests for aws-core-utils/kms-utils.js
 * @author Byron du Preez
 */

const test = require('tape');

// Test subject
const kmsUtils = require('../../kms-utils');
const encryptKey = kmsUtils.encryptKey;
const decryptKey = kmsUtils.decryptKey;

// =====================================================================================================================
// Set the following properties to match the AWS KMS instance you want to test
// =====================================================================================================================
const region = 'eu-west-1';
const accountId = 'XXXXXXXXXXXX';
const kmsKeyAlias = 'kkkkkkkkkkkkkk';
// const kmsKeyAlias = 'aws/lambda';
const keyId = `arn:aws:kms:${region}:${accountId}:alias/${kmsKeyAlias}`;
// =====================================================================================================================

const plaintext = 'Shhhhhhhhhhhhhhh';

// const util = require('util');
// function show(o) {
//   return util.inspect(o);
// }

test('encryptKey & decryptKey', t => {
  const AWS = require('aws-sdk');
  const kms = new AWS.KMS({region: region});

  encryptKey(kms, keyId, plaintext).then(
    encrypted => {
      // console.log(`##### encrypted = ${show(encrypted)}`);
      t.ok(encrypted, `encrypted must be defined`);
      t.ok(encrypted.length > 0, `encrypted must be non-empty`);

      decryptKey(kms, encrypted).then(
        decrypted => {
          // console.log(`##### decrypted = ${show(decrypted)}`);
          t.ok(decrypted, `decrypted must be defined`);
          t.ok(decrypted.length > 0, `decrypted must be non-empty`);
          t.equal(decrypted, plaintext, `decrypted must be plaintext`);
          t.end();
        },
        err => {
          t.end(err);
        }
      );
    },
    err => {
      t.end(err);
    }
  );
});