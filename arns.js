'use strict';

/**
 * Utilities for working with Amazon Resource Names (ARNs), which typically take the following general format:
 * - arn:partition:service:region:account-id:resource
 * - arn:partition:service:region:account-id:resourcetype/resource
 * - arn:partition:service:region:account-id:resourcetype:resource
 * - arn:partition:service:region:account-id:resourcetype:resource[:alias] (e.g. Lambda invokedFunctionArns)
 *
 * @see {@link http://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html}
 * @module aws-core-utils/arns
 * @author Byron du Preez
 */
module.exports = {
  getArnComponent: getArnComponent,
  getArnPartition: getArnPartition,
  getArnService: getArnService,
  getArnRegion: getArnRegion,
  getArnAccountId: getArnAccountId,
  getArnResources: getArnResources,
};

const Strings = require('core-functions/strings');
const trim = Strings.trim;
const trimOrEmpty = Strings.trimOrEmpty;
const isNotBlank = Strings.isNotBlank;

// ARN indexes
const PARTITION_INDEX = 1;
const SERVICE_INDEX = 2;
const REGION_INDEX = 3;
const ACCOUNT_ID_INDEX = 4;
const RESOURCE_OR_TYPE_INDEX = 5; // index of a resource (without a resource type) or a resource type

/**
 * Extracts the component at the given index of the given ARN.
 * @param {string} arn the ARN from which to extract the component
 * @param {number} index the index of the ARN component to retrieve
 * @returns {string} the component (if extracted) or empty string (if not)
 */
function getArnComponent(arn, index) {
  const components = isNotBlank(arn) ? trim(arn).split(':') : [];
  return components.length > index ? trimOrEmpty(components[index]) : '';
}

/**
 * Extracts the partition from the given ARN.
 * @param {string} arn the ARN from which to extract the partition
 * @returns {string} the partition (if extracted) or empty string (if not)
 */
function getArnPartition(arn) {
  return getArnComponent(arn, PARTITION_INDEX);
}

/**
 * Extracts the service from the given ARN.
 * @param {string} arn the ARN from which to extract the service
 * @returns {string} the service (if extracted) or empty string (if not)
 */
function getArnService(arn) {
  return getArnComponent(arn, SERVICE_INDEX);
}

/**
 * Extracts the region from the given ARN.
 * @param {string} arn the ARN from which to extract the region
 * @returns {string} the region (if extracted) or empty string (if not)
 */
function getArnRegion(arn) {
  return getArnComponent(arn, REGION_INDEX);
}

/**
 * Extracts the account id from the given ARN.
 * @param {string} arn the ARN from which to extract the account id
 * @returns {object} the account id (if extracted) or empty string (if not)
 */
function getArnAccountId(arn) {
  return getArnComponent(arn, ACCOUNT_ID_INDEX);
}

/**
 * Attempts to extract any and all resource-related components from the given ARN (if defined) and returns them as
 * an object containing resourceType, resource, aliasOrVersion and others (just in case there were even more components
 * after aliasOrVersion).
 *
 * Currently handles the following cases:
 * - arn:partition:service:region:account-id:resource
 * - arn:partition:service:region:account-id:resourcetype/resource
 * - arn:partition:service:region:account-id:resourcetype:resource
 * - arn:partition:service:region:account-id:resourcetype:resource:alias_or_version (e.g. Lambda invokedFunctionArns)
 * - arn:partition:service:region:account-id:resourcetype:resource:alias_or_version[:other]* (just in case more)
 *
 * @param {string} arn the ARN from which to extract the resource-related components
 * @returns {{resourceType: string, resource: string, aliasOrVersion: string, others: string[]}} an object containing
 * resourceType, resource, aliasOrVersion and others properties.
 */
function getArnResources(arn) {
  //return {resourceType: '', resource: '', aliasOrVersion: '', others: ['','']};
  const components = isNotBlank(arn) ? trim(arn).split(':') : [];

  // Identify which case we are dealing with
  if (components.length === RESOURCE_OR_TYPE_INDEX + 1) {
    // Must be either only 'resource' or 'resourcetype/resource' case
    const resourceOrType = trimOrEmpty(components[RESOURCE_OR_TYPE_INDEX]);

    const lastSlashPos = resourceOrType ? resourceOrType.lastIndexOf('/') : -1;
    if (lastSlashPos != -1) {
      // CASE: arn:partition:service:region:account-id:resourcetype/resource
      const resourceType = trimOrEmpty(resourceOrType.substring(0, lastSlashPos));
      const resource = trimOrEmpty(resourceOrType.substring(lastSlashPos + 1));
      return {resourceType: resourceType, resource: resource, aliasOrVersion: '', others: []};
    } else {
      // CASE: arn:partition:service:region:account-id:resource
      const resource = resourceOrType ? resourceOrType : '';
      return {resourceType: '', resource: resource, aliasOrVersion: '', others: []}
    }
  } else if (components.length === RESOURCE_OR_TYPE_INDEX + 2) {
    // CASE: arn:partition:service:region:account-id:resourcetype:resource
    const resourceType = trimOrEmpty(components[RESOURCE_OR_TYPE_INDEX]);
    const resource = trimOrEmpty(components[RESOURCE_OR_TYPE_INDEX + 1]);
    return {resourceType: resourceType, resource: resource, aliasOrVersion: '', others: []};

  } else if (components.length > RESOURCE_OR_TYPE_INDEX + 2) {
    // CASE: arn:partition:service:region:account-id:resourcetype:resource[:aliasOrVersion] (e.g. Lambda invokedFunctionArns)
    const resourceType = trimOrEmpty(components[RESOURCE_OR_TYPE_INDEX]);
    const resource = trimOrEmpty(components[RESOURCE_OR_TYPE_INDEX + 1]);
    const aliasOrVersion = trimOrEmpty(components[RESOURCE_OR_TYPE_INDEX + 2]);
    const others = components.slice(RESOURCE_OR_TYPE_INDEX + 3).map(trim);
    return {resourceType: resourceType, resource: resource, aliasOrVersion: aliasOrVersion, others: others};
  }

  // No resource-related components available from which to extract anything
  return {resourceType: '', resource: '', aliasOrVersion: '', others: []};
}
