'use strict';

/**
 * Unit tests for aws-core-utils/stages.js
 * @author Byron du Preez
 */

const test = require("tape");

// The test subject
const stages = require('../stages');
const resolveStage = stages.resolveStage;
const resolveRawStage = stages.resolveRawStage;
const resolveStageUsingDefaultFunctions = stages.resolveStageUsingDefaultFunctions;
const convertAliasToStage = stages.convertAliasToStage;
const convertStreamNameSuffixToStage = stages.convertStreamNameSuffixToStage;
const appendStage = stages.appendStage;

//TODO add unit test for stages
