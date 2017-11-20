'use strict';

/**
 * Utilities to simplify working with AWS.KMS instances.
 * @module aws-core-utils/kms-utils
 * @author Byron du Preez
 */
exports._$_ = '_$_'; //IDE workaround

exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.encryptKey = encryptKey;
exports.decryptKey = decryptKey;

/**
 * Encrypts the plaintext within the given KMS parameters using the given AWS.KMS instance & returns the KMS result.
 * @param {AWS.KMS} kms - an AWS.KMS instance to use
 * @param {KMSEncryptParams} params - the KMS encrypt parameters to use
 * @param {Logger|console|undefined} [logger] - an optional logger to use (defaults to console if omitted)
 * @returns {Promise.<KMSEncryptResult>} a promise of the KMS encrypt result
 */
function encrypt(kms, params, logger) {
  logger = logger || console;
  const startMs = Date.now();
  return kms.encrypt(params).promise().then(
    result => {
      if (logger.traceEnabled) logger.trace(`KMS encrypt success took ${Date.now() - startMs} ms`);
      return result;
    },
    err => {
      logger.error(`KMS encrypt failure took ${Date.now() - startMs} ms`, err);
      throw err;
    }
  );
}

/**
 * Decrypts the ciphertext within the given KMS parameters using the given AWS.KMS instance & returns the KMS result.
 * @param {AWS.KMS} kms - an AWS.KMS instance to use
 * @param {KMSDecryptParams} params - the KMS decrypt parameters to use
 * @param {Logger|console|undefined} [logger] - an optional logger to use (defaults to console if omitted)
 * @returns {Promise.<KMSDecryptResult>} a promise of the KMS decrypt result
 */
function decrypt(kms, params, logger) {
  logger = logger || console;
  const startMs = Date.now();
  return kms.decrypt(params).promise().then(
    result => {
      if (logger.traceEnabled) logger.trace(`KMS decrypt success took ${Date.now() - startMs} ms`);
      return result;
    },
    err => {
      logger.error(`KMS decrypt failure took ${Date.now() - startMs} ms`, err);
      throw err;
    }
  );
}

/**
 * Encrypts the given plaintext using the given AWS.KMS instance & returns the encrypted ciphertext.
 * @param {AWS.KMS} kms - an AWS.KMS instance to use
 * @param {string} keyId - the identifier of the CMK to use for encryption. You can use the key ID or Amazon Resource Name (ARN) of the CMK, or the name or ARN of an alias that refers to the CMK.
 * @param {string} plaintext - the plaintext to encrypt
 * @param {Logger|console|undefined} [logger] - an optional logger to use (defaults to console if omitted)
 * @returns {Promise.<string>} a promise of the encrypted ciphertext
 */
function encryptKey(kms, keyId, plaintext, logger) {
  const params = {KeyId: keyId, Plaintext: plaintext};
  return encrypt(kms, params, logger).then(result => result.CiphertextBlob && result.CiphertextBlob.toString('base64'));
}

/**
 * Decrypts the given ciphertext in base 64 using the given AWS.KMS instance & returns the decrypted plaintext.
 * @param {AWS.KMS} kms - an AWS.KMS instance to use
 * @param {string} ciphertextBase64 - the encrypted ciphertext in base 64 encoding
 * @param {Logger|console|undefined} [logger] - an optional logger to use (defaults to console if omitted)
 * @returns {Promise.<string>} a promise of the decrypted plaintext
 */
function decryptKey(kms, ciphertextBase64, logger) {
  const params = {CiphertextBlob: new Buffer(ciphertextBase64, 'base64')};
  return decrypt(kms, params, logger).then(result => result.Plaintext && result.Plaintext.toString('utf8'));
}