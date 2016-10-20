"use strict";

/**
 * Utilities for working with AWS errors.
 *
 * Usage:
 *   const AWSErrors = require('./aws-errors');
 *   const BadRequest = AWSErrors.BadRequest;
 *   ...
 *   throw new BadRequest('Invalid data');
 *
 * @module aws-core-utils/aws-errors.js
 * @author Byron du Preez
 */
module.exports = {

  isUnavailable: function isUnavailable(err) {
    return err.statusCode >= 500;
  },

  isConditionalCheckFailed: function isConditionalCheckFailed(err) {
    return err.code === 'ConditionalCheckFailedException';
  },

  isProvisionedThroughputExceeded: function isProvisionedThroughputExceeded(err) {
    return err.code === 'ProvisionedThroughputExceededException';
  },

  isThrottlingException: function isThrottlingException(err) {
    return err.code === 'ThrottlingException';
  },

  isLimitExceededException: function isLimitExceededException(err) {
    return err.code === 'LimitExceededException';
  },

  isThrottled: function isThrottled(err) {
    switch (err.code) {
      // DynamoDB-specific?
      case 'ProvisionedThroughputExceededException':
      case 'ThrottlingException':
      case 'ItemCollectionSizeLimitExceededException':
      case 'LimitExceededException':

      // S3-specific?
      //case 'ServiceUnavailable': // actually 503 error
      //case 'SlowDown': // actually 503 error

      // not DynamoDB-specific?
      case 'Throttling':
      case 'RequestLimitExceeded':
      case 'RequestThrottled':
        return true;
      default:
        return false;
    }
  },

  isRetryable: function isRetryable(err) {
    if (this.isNetworkingError(err)) return true;
    if (this.isExpiredCredentialsError(err)) return true;
    if (this.isThrottled(err)) return true;
    return err.statusCode >= 500;
    //return isThrottled(err) || err.code === 'ItemCollectionSizeLimitExceededException' ||
    //    err.code === 'UnrecognizedClientException' || err.retryable;
  },

  isExpiredCredentialsError: function isExpiredCredentialsError(err) {
    return err.code === 'ExpiredTokenException';
  },

  isNetworkingError: function isNetworkingError(err) {
    return err.code === 'NetworkingError';
  },

  wasS3ObjectNotFound(err) {
    return err.statusCode == 404 || // "no such key" if caller has s3:ListBucket permission
      err.statusCode == 403; // "access denied" if caller does NOT have s3:ListBucket permission
  }

};
