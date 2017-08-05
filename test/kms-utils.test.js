'use strict';

/**
 * Unit tests for aws-core-utils/kms-utils.js
 * @author Byron du Preez
 */

const test = require('tape');

// Test subject
const kmsUtils = require('../kms-utils');
const encrypt = kmsUtils.encrypt;
const decrypt = kmsUtils.decrypt;
const encryptKey = kmsUtils.encryptKey;
const decryptKey = kmsUtils.decryptKey;

const kmsMocking = require('aws-core-test-utils/kms-mocking');
const mockKMS = kmsMocking.mockKMS;

// const util = require('util');

const accountId = 'XXXXXXXXXXXX';
const kmsKeyAlias = 'kkkkkkkkkkkkkk';
const region = 'eu-west-1';
process.env.AWS_REGION = region;
const keyId = `arn:aws:kms:${region}:${accountId}:alias/${kmsKeyAlias}`;

const plaintext = 'Shhhhhhhhhhhhhhh';
const ciphertext = 'DUMMY_ciphertext';
const ciphertextBase64 = new Buffer(ciphertext, 'utf8').toString('base64');

// function show(o) {
//   return util.inspect(o);
// }

// =====================================================================================================================
// encrypt & decrypt
// =====================================================================================================================

test('encrypt & decrypt', t => {
  const kms = mockKMS(undefined, plaintext, undefined, ciphertextBase64, 10);

  encrypt(kms, {KeyId: keyId, Plaintext: plaintext}).then(
    result => {
      const encrypted = result.CiphertextBlob && result.CiphertextBlob.toString('base64');
      // console.log(`##### encrypted = ${show(encrypted)}`);
      t.ok(encrypted, `encrypted must be defined`);
      t.ok(encrypted.length > 0, `encrypted must be non-empty`);
      t.equal(encrypted, ciphertextBase64, `encrypted must be ciphertextBase64`);

      decrypt(kms, {CiphertextBlob: new Buffer(ciphertextBase64, 'base64')}).then(
        result => {
          const decrypted = result.Plaintext && result.Plaintext.toString('utf8');
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

test('encrypt with error', t => {
  const encryptError = new Error('Encrypt kaboom');
  const kms = mockKMS(undefined, plaintext, encryptError, ciphertextBase64, 10);

  encrypt(kms, {KeyId: keyId, Plaintext: plaintext}).then(
    encrypted => {
      t.end(`encrypt must NOT succeed with a value (${encrypted})`);
    },
    err => {
      t.pass(`encrypt must fail`);
      t.equal(err, encryptError, `encrypt error must be planned error`);
      t.end();
    }
  );
});

test('decrypt with error', t => {
  const decryptError = new Error('Decrypt kaboom');
  const kms = mockKMS(decryptError, plaintext, undefined, ciphertextBase64, 10);

  decrypt(kms, {CiphertextBlob: new Buffer(ciphertextBase64, 'base64')}).then(
    decrypted => {
      t.end(`decrypt must NOT succeed with a value (${decrypted})`);
    },
    err => {
      t.pass(`decrypt must fail`);
      t.equal(err, decryptError, `decrypt error must be planned error`);
      t.end();
    }
  );
});

// =====================================================================================================================
// encryptKey & decryptKey
// =====================================================================================================================

test('encryptKey & decryptKey', t => {
  const kms = mockKMS(undefined, plaintext, undefined, ciphertextBase64, 10);

  encryptKey(kms, keyId, plaintext).then(
    encrypted => {
      // console.log(`##### encrypted = ${show(encrypted)}`);
      t.ok(encrypted, `encrypted must be defined`);
      t.ok(encrypted.length > 0, `encrypted must be non-empty`);
      t.equal(encrypted, ciphertextBase64, `encrypted must be ciphertextBase64`);

      decryptKey(kms, ciphertextBase64).then(
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

test('encryptKey with error', t => {
  const encryptError = new Error('Encrypt kaboom');
  const kms = mockKMS(undefined, plaintext, encryptError, ciphertextBase64, 10);

  encryptKey(kms, keyId, plaintext).then(
    encrypted => {
      t.end(`encryptKey must NOT succeed with a value (${encrypted})`);
    },
    err => {
      t.pass(`encryptKey must fail`);
      t.equal(err, encryptError, `encryptKey error must be planned error`);
      t.end();
    }
  );
});

test('decryptKey with error', t => {
  const decryptError = new Error('Decrypt kaboom');
  const kms = mockKMS(decryptError, plaintext, undefined, ciphertextBase64, 10);

  decryptKey(kms, ciphertextBase64).then(
    decrypted => {
      t.end(`decryptKey must NOT succeed with a value (${decrypted})`);
    },
    err => {
      t.pass(`decryptKey must fail`);
      t.equal(err, decryptError, `decryptKey error must be planned error`);
      t.end();
    }
  );
});