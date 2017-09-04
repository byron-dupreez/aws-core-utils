'use strict';

/**
 * Unit tests for aws-core-utils/regions.js
 * @author Byron du Preez
 */

const test = require('tape');

// The test subject
const regions = require('../regions');
const getRegion = regions.getRegion;
const setRegion = regions.setRegion;

const getRegionRaw = regions.getRegionRaw;

const Strings = require('core-functions/strings');
const isBlank = Strings.isBlank;

// =====================================================================================================================
// Tests for getRegion & setRegion
// =====================================================================================================================

test('getRegion and setRegion', t => {

  // Attempt to preserve the original AWS_REGION setting (unfortunately cannot preserve undefined or null)
  const origRegion = getRegionRaw();

  // check orig
  if (origRegion === undefined) {
    t.equal(origRegion, process.env.AWS_REGION, `original raw must be '${process.env.AWS_REGION}'`);
    t.equal(getRegion(), undefined, `original must be empty string '${process.env.AWS_REGION}'`);
  } else if (isBlank(origRegion)) {
    t.equal(origRegion, process.env.AWS_REGION, `original raw must be '${process.env.AWS_REGION}'`);
    t.equal(getRegion(), '', `original must be undefined '${process.env.AWS_REGION}'`);
  }

  // Must use delete to "clear" property.env variable - since setting to undefined & null don't work as intended
  try {
    // Clear AWS_REGION to undefined (by deleting it)
    delete process.env.AWS_REGION;
    t.equal(process.env.AWS_REGION, undefined, `process.env.AWS_REGION must be '${undefined}' after delete`);

    // check get when not set
    t.equal(getRegion(), undefined, `getRegion() must be '${undefined}'`);

    // check will set, when not set
    const expected = 'TEST_REGION_1';
    setRegion(expected);
    t.equal(getRegion(), expected, `setRegion('TEST_REGION_1') then getRegion() must be ${expected}`);
    t.equal(process.env.AWS_REGION, expected, `process.env.AWS_REGION must be ${expected}`);

    // check changed, when another set
    const expected2 = 'TEST_REGION_3';
    setRegion(expected2);
    t.equal(getRegion(), expected2, `setRegion('TEST_REGION_3') then getRegion() must now be ${expected2}`);
    t.equal(process.env.AWS_REGION, expected2, `process.env.AWS_REGION must be ${expected2}`);

  } finally {
    // "Restore" original aws region
    setRegion(origRegion);
    // Check "restore" worked
    if (origRegion === undefined) {
      t.equal(getRegion(), undefined, `getRegion() must be "restored" to undefined' (orig was ${origRegion})`);
    } else if (isBlank(origRegion)) {
      t.equal(getRegion(), '', `getRegion() must be "restored" to empty string (orig was '${origRegion}')`);
    } else {
      t.equal(getRegion(), origRegion, `getRegion() must be restored to ${origRegion}`);
    }
    t.end();
  }
});