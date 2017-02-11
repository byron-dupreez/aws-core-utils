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
const isBlank = Strings.isBlank;
const isNotBlank = Strings.isNotBlank;

// ARN indexes
const PARTITION_INDEX = 1;
const SERVICE_INDEX = 2;
const REGION_INDEX = 3;
const ACCOUNT_ID_INDEX = 4;

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
 * - CASE 1: arn:partition:service:region:account-id:resource
 * - CASE 2: arn:partition:service:region:account-id:resourcetype/resource
 * - CASE 3: arn:partition:service:region:account-id:resourcetype/resource/subResourceType/subResource
 * - CASE 4: arn:partition:service:region:account-id:resourcetype:resource
 * - CASE 5: arn:partition:service:region:account-id:resourcetype:resource:alias_or_version (e.g. Lambda invokedFunctionArns)
 * - CASE 6: arn:partition:service:region:account-id:resourcetype:resource:alias_or_version[:other]* (just in case more)
 *
 * e.g. of CASE 3: arn:aws:dynamodb:us-east-1:111111111111:table/test/stream/2020-10-10T08:18:22.385
 *
 * @param {string} arn the ARN from which to extract the resource-related components
 * @returns {ArnResources} an object containing the resource-related components
 */
function getArnResources(arn) {
  if (isBlank(arn)) {
    return {resourceType: '', resource: '', subResourceType: '', subResource: '', aliasOrVersion: '', others: []};
  }
  const arn1 = trim(arn);

  const resourceIndex = Strings.nthIndexOf(arn1, ':', 5);
  if (resourceIndex === -1) {
    return {resourceType: '', resource: '', subResourceType: '', subResource: '', aliasOrVersion: '', others: []};
  }

  const resourceSection = arn1.substring(resourceIndex + 1);

  const firstSlashIndex = resourceSection.indexOf('/');
  const firstColonIndex = resourceSection.indexOf(':');

  // Identify which case we are dealing with
  if (firstSlashIndex === -1 && firstColonIndex === -1) {
    // CASE 1: arn:partition:service:region:account-id:resource
    return {
      resourceType: '',
      resource: resourceSection,
      subResourceType: '',
      subResource: '',
      aliasOrVersion: '',
      others: []
    };
  } else if (firstSlashIndex !== -1 && (firstColonIndex === -1 || firstSlashIndex < firstColonIndex)) {
    // Slash cases
    const resourceType = trimOrEmpty(resourceSection.substring(0, firstSlashIndex));

    const secondSlashIndex = Strings.nthIndexOf(resourceSection, '/', 2);
    const thirdSlashIndex = Strings.nthIndexOf(resourceSection, '/', 3);

    if (secondSlashIndex !== -1 && thirdSlashIndex !== -1) {
      // CASE 3: arn:partition:service:region:account-id:resourcetype/resource/subResourceType/subResource
      //    e.g. arn:partition:service:region:account-id:table/{table_name}/stream/{2020-10-10T08:18:22.385}
      const resource = trimOrEmpty(resourceSection.substring(firstSlashIndex + 1, secondSlashIndex));
      const subResourceType = trimOrEmpty(resourceSection.substring(secondSlashIndex + 1, thirdSlashIndex));
      const subResource = trimOrEmpty(resourceSection.substring(thirdSlashIndex + 1));
      return {
        resourceType: resourceType,
        resource: resource,
        subResourceType: subResourceType,
        subResource: subResource,
        aliasOrVersion: '',
        others: []
      };
    } else {
      // CASE 2: arn:partition:service:region:account-id:resourcetype/resource
      const resource = trimOrEmpty(resourceSection.substring(firstSlashIndex + 1));
      return {
        resourceType: resourceType,
        resource: resource,
        subResourceType: '',
        subResource: '',
        aliasOrVersion: '',
        others: []
      };
    }
  } else {
    // Colon cases
    const resourceType = trimOrEmpty(resourceSection.substring(0, firstColonIndex));

    const secondColonIndex = Strings.nthIndexOf(resourceSection, ':', 2);

    if (secondColonIndex === -1) {
      // CASE 4: arn:partition:service:region:account-id:resourcetype:resource
      const resource = trimOrEmpty(resourceSection.substring(firstColonIndex + 1));
      return {
        resourceType: resourceType,
        resource: resource,
        subResourceType: '',
        subResource: '',
        aliasOrVersion: '',
        others: []
      };
    } else {
      const resource = trimOrEmpty(resourceSection.substring(firstColonIndex + 1, secondColonIndex));

      const thirdColonIndex = Strings.nthIndexOf(resourceSection, ':', 3);

      if (thirdColonIndex === -1) {
        // CASE 5: arn:partition:service:region:account-id:resourcetype:resource:alias_or_version (e.g. Lambda invokedFunctionArns)
        const aliasOrVersion = trimOrEmpty(resourceSection.substring(secondColonIndex + 1));
        return {
          resourceType: resourceType,
          resource: resource,
          subResourceType: '',
          subResource: '',
          aliasOrVersion: aliasOrVersion,
          others: []
        };
      } else {
        // CASE 6: arn:partition:service:region:account-id:resourcetype:resource:alias_or_version[:other]* (just in case more)
        const aliasOrVersion = trimOrEmpty(resourceSection.substring(secondColonIndex + 1, thirdColonIndex));
        const others = trimOrEmpty(resourceSection.substring(thirdColonIndex + 1)).split(':');
        return {
          resourceType: resourceType,
          resource: resource,
          subResourceType: '',
          subResource: '',
          aliasOrVersion: aliasOrVersion,
          others: others
        };
      }
    }
  }
}
