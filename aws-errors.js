"use strict";

/**
 * Utilities for working with and interpreting AWS errors.
 *
 * Usage:
 *   const awsErrors = require('./aws-errors');
 *
 * @module aws-core-utils/aws-errors.js
 * @author Byron du Preez
 */
module.exports = {
  // General error checks
  isUnavailable: isUnavailable,
  // Specific error checks
  isConditionalCheckFailed: isConditionalCheckFailed,
  isProvisionedThroughputExceeded: isProvisionedThroughputExceeded,
  isThrottlingException: isThrottlingException,
  isLimitExceededException: isLimitExceededException,
  isItemCollectionSizeLimitExceededException: isItemCollectionSizeLimitExceededException,
  // Summarized multiple error checks
  isThrottled: isThrottled,
  isLimitExceeded: isLimitExceeded,
  isRetryable: isRetryable,
  // Other specific error checks
  isExpiredCredentialsError: isExpiredCredentialsError,
  isNetworkingError: isNetworkingError,
  // S3 not found
  wasS3ObjectNotFound: wasS3ObjectNotFound,
  // DynamoDB resource not found
  isResourceNotFoundException: isResourceNotFoundException
};

function isUnavailable(err) {
  return err.statusCode >= 500;
}

function isConditionalCheckFailed(err) {
  return err.code === 'ConditionalCheckFailedException';
}

function isProvisionedThroughputExceeded(err) {
  return err.code === 'ProvisionedThroughputExceededException';
}

function isThrottlingException(err) {
  return err.code === 'ThrottlingException';
}

function isLimitExceededException(err) {
  return err.code === 'LimitExceededException';
}

function isItemCollectionSizeLimitExceededException(err) {
  return err.code === 'ItemCollectionSizeLimitExceededException';
}

function isLimitExceeded(err) {
  switch (err.code) {
    // DynamoDB-specific?
    case 'ItemCollectionSizeLimitExceededException':
    case 'LimitExceededException':
    // not DynamoDB-specific?
    case 'RequestLimitExceeded':
      return true;
    default:
      return false;
  }
}

function isThrottled(err) {
  switch (err.code) {
    // DynamoDB-specific?
    case 'ProvisionedThroughputExceededException':
    case 'ThrottlingException':

    // S3-specific?
    //case 'ServiceUnavailable': // actually 503 error
    case 'SlowDown': // actually 503 error

    // not DynamoDB-specific?
    case 'Throttling':
    case 'RequestThrottled':
      return true;
    default:
      return false;
  }
}

function isRetryable(err) {
  return err.statusCode >= 500 || isNetworkingError(err) || isExpiredCredentialsError(err) || isThrottled(err) ||
    isLimitExceeded(err) || err.retryable;
  //return isThrottled(err) || err.code === 'ItemCollectionSizeLimitExceededException' ||
  //    err.code === 'UnrecognizedClientException' || err.retryable;
}

function isExpiredCredentialsError(err) {
  return err.code === 'ExpiredTokenException';
}

function isNetworkingError(err) {
  return err.code === 'NetworkingError';
}

function wasS3ObjectNotFound(err) {
  return err.statusCode === 404 || err.statusCode === '404' || // "no such key" if caller has s3:ListBucket permission
    err.statusCode === 403 || err.statusCode === '403'; // "access denied" if caller does NOT have s3:ListBucket permission
}

function isResourceNotFoundException(err) {
  return err.code === 'ResourceNotFoundException';
}