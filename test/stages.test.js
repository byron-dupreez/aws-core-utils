'use strict';

/**
 * Unit tests for aws-core-utils/stages.js
 * @author Byron du Preez
 */

const test = require("tape");

// The test subject
const stages = require('../stages');

// Configuration
const isStageHandlingConfigured = stages.isStageHandlingConfigured;
const configureStageHandlingWithSettings = stages.FOR_TESTING_ONLY.configureStageHandlingWithSettings;
const configureDefaultStageHandling = stages.configureDefaultStageHandling;
const getDefaultStageHandlingSettings = stages.getDefaultStageHandlingSettings;
const configureStageHandling = stages.configureStageHandling;
const getStageHandlingSetting = stages.getStageHandlingSetting;
// Stage resolution
const resolveStage = stages.resolveStage;
// Stream name qualification
// const toStageQualifiedStreamName = stages.toStageQualifiedStreamName;
// const extractStageFromQualifiedStreamName = stages.extractStageFromQualifiedStreamName;
// Resource name qualification
// const toStageQualifiedResourceName = stages.toStageQualifiedResourceName;
// const extractStageFromQualifiedResourceName = stages.extractStageFromQualifiedResourceName;

// DEFAULTS - default implementations
// ==================================
// Alias conversion
const convertAliasToStage = stages.DEFAULTS.convertAliasToStage;
// Stage-suffixed stream name qualification
const toStageSuffixedStreamName = stages.DEFAULTS.toStageSuffixedStreamName;
const extractStageFromSuffixedStreamName = stages.DEFAULTS.extractStageFromSuffixedStreamName;
// Stage-suffixed resource name qualification
const toStageSuffixedResourceName = stages.DEFAULTS.toStageSuffixedResourceName;
const extractStageFromSuffixedResourceName = stages.DEFAULTS.extractStageFromSuffixedResourceName;
// Generic utils
// const toStageSuffixedName = stages.DEFAULTS.toStageSuffixedName;
const toCase = stages.DEFAULTS.toCase;

const Strings = require('core-functions/strings');
//const trim = Strings.trim;
const trimOrEmpty = Strings.trimOrEmpty;
//const isBlank = Strings.isBlank;
const isNotBlank = Strings.isNotBlank;
const stringify = Strings.stringify;

const samples = require('./samples');
// Constants
// const latestFunctionVersion = samples.latestFunctionVersion;

// General
// const sampleNumberString = samples.sampleNumberString;

// For AWS contexts
const sampleInvokedFunctionArn = samples.sampleInvokedFunctionArn;
const sampleAwsContext = samples.sampleAwsContext;

// For Kinesis stream events
//const sampleStreamName = samples.sampleStreamName;
const sampleKinesisEventSourceArn = samples.sampleKinesisEventSourceArn;
// const sampleEventSourceArnFromPrefixSuffix = samples.sampleEventSourceArnFromPrefixSuffix;
// const sampleBase64Data = samples.sampleBase64Data;
const sampleKinesisEventWithSampleRecord = samples.sampleKinesisEventWithSampleRecord;
// const sampleKinesisEventWithRecord = samples.sampleKinesisEventWithRecord;
// const sampleKinesisEventWithRecords = samples.sampleKinesisEventWithRecords;


function checkConvertAliasToStage(t, alias, expected) {
  t.equal(convertAliasToStage(alias, undefined, undefined, undefined), expected, `'${alias}' must be '${expected}'`);
}

function checkExtractStageFromSuffixedStreamName(t, streamName, context, expected) {
  t.equal(extractStageFromSuffixedStreamName(streamName, context), expected, `'${streamName}' must be '${expected}'`);
}

function checkResolveStage(t, eventStage, functionVersion, functionAlias, streamName, context, expected) {
  // Create an AWS context
  const invokedFunctionArn = sampleInvokedFunctionArn('invokedFunctionArnRegion', 'functionName', functionAlias);
  const awsContext = sampleAwsContext('functionName', functionVersion, invokedFunctionArn);

  // Create a Kinesis event
  const eventSourceArn = sampleKinesisEventSourceArn('eventSourceArnRegion', streamName);
  const event = sampleKinesisEventWithSampleRecord(undefined, undefined, eventSourceArn, 'eventAwsRegion');
  if (isNotBlank(eventStage)) {
    event.stage = eventStage;
  }

  // Resolve the stage
  const actual = resolveStage(event, awsContext, context);

  t.equal(actual, expected, `resolve = stages.alias(${functionAlias}) stream(${streamName}) context(${context.stage}, ${context.defaultStage}) -> '${actual}' must be '${expected}'`);
}

function checkConfigureStageHandlingWithSettings(t, context, envStageName, customToStage,
  convertAliasToStage, injectStageIntoStreamName, extractStageFromStreamName,
  streamNameStageSeparator, injectStageIntoResourceName, extractStageFromResourceName,
  resourceNameStageSeparator, injectInCase, extractInCase, defaultStage, forceConfiguration) {

  const before = context.stageHandling;

  const envStageNameBefore = before ? before.envStageName : undefined;

  const customToStageBefore = before ? before.customToStage : undefined;
  const convertAliasToStageBefore = before ? before.convertAliasToStage : undefined;

  const injectStageIntoStreamNameBefore = before ? before.injectStageIntoStreamName : undefined;
  const extractStageFromStreamNameBefore = before ? before.extractStageFromStreamName : undefined;
  const streamNameStageSeparatorBefore = before ? before.streamNameStageSeparator : undefined;

  const injectStageIntoResourceNameBefore = before ? before.injectStageIntoResourceName : undefined;
  const extractStageFromResourceNameBefore = before ? before.extractStageFromResourceName : undefined;
  const resourceNameStageSeparatorBefore = before ? before.resourceNameStageSeparator : undefined;

  const injectInCaseBefore = before ? before.injectInCase : undefined;
  const extractInCaseBefore = before ? before.extractInCase : undefined;
  const defaultStageBefore = before ? before.defaultStage : undefined;

  const mustChange = forceConfiguration || !before;

  // Configure it
  const settings = {
    envStageName: envStageName,

    customToStage: customToStage,
    convertAliasToStage: convertAliasToStage,

    injectStageIntoStreamName: injectStageIntoStreamName,
    extractStageFromStreamName: extractStageFromStreamName,
    streamNameStageSeparator: streamNameStageSeparator,

    injectStageIntoResourceName: injectStageIntoResourceName,
    extractStageFromResourceName: extractStageFromResourceName,
    resourceNameStageSeparator: resourceNameStageSeparator,

    injectInCase: injectInCase,
    extractInCase: extractInCase,

    defaultStage: defaultStage,
  };
  configureStageHandlingWithSettings(context, settings, undefined, undefined, forceConfiguration);

  const after = context.stageHandling;

  const envStageNameAfter = after ? after.envStageName : undefined;

  const customToStageAfter = after ? after.customToStage : undefined;
  const convertAliasToStageAfter = after ? after.convertAliasToStage : undefined;

  const injectStageIntoStreamNameAfter = after ? after.injectStageIntoStreamName : undefined;
  const extractStageFromStreamNameAfter = after ? after.extractStageFromStreamName : undefined;
  const streamNameStageSeparatorAfter = after ? after.streamNameStageSeparator : undefined;

  const injectStageIntoResourceNameAfter = after ? after.injectStageIntoResourceName : undefined;
  const extractStageFromResourceNameAfter = after ? after.extractStageFromResourceName : undefined;
  const resourceNameStageSeparatorAfter = after ? after.resourceNameStageSeparator : undefined;

  const injectInCaseAfter = after ? after.injectInCase : undefined;
  const extractInCaseAfter = after ? after.extractInCase : undefined;
  const defaultStageAfter = after ? after.defaultStage : undefined;


  t.ok(isStageHandlingConfigured(context), `stage handling settings must be configured now`);

  // Set up the right expectations
  const envStageNameExpected = mustChange ? envStageName : envStageNameBefore;

  const customToStageExpected = mustChange ? customToStage : customToStageBefore;
  const convertAliasToStageExpected = mustChange ? convertAliasToStage : convertAliasToStageBefore;

  const injectStageIntoStreamNameExpected = mustChange ? injectStageIntoStreamName : injectStageIntoStreamNameBefore;
  const extractStageFromStreamNameExpected = mustChange ? extractStageFromStreamName : extractStageFromStreamNameBefore;
  const streamNameStageSeparatorExpected = mustChange ? streamNameStageSeparator : streamNameStageSeparatorBefore;

  const injectStageIntoResourceNameExpected = mustChange ? injectStageIntoResourceName : injectStageIntoResourceNameBefore;
  const extractStageFromResourceNameExpected = mustChange ? extractStageFromResourceName : extractStageFromResourceNameBefore;
  const resourceNameStageSeparatorExpected = mustChange ? resourceNameStageSeparator : resourceNameStageSeparatorBefore;

  const injectInCaseExpected = mustChange ? injectInCase : injectInCaseBefore;
  const extractInCaseExpected = mustChange ? extractInCase : extractInCaseBefore;
  const defaultStageExpected = mustChange ? defaultStage : defaultStageBefore;

  t.equal(getStageHandlingSetting(context, 'envStageName'), envStageNameExpected, `envStageName (${stringify(envStageNameAfter)}) must be ${stringify(envStageNameExpected)}`);

  t.deepEqual(getStageHandlingSetting(context, 'customToStage'), customToStageExpected, `customToStage (${stringify(customToStageAfter)}) must be ${stringify(customToStageExpected)}`);
  t.deepEqual(getStageHandlingSetting(context, 'convertAliasToStage'), convertAliasToStageExpected, `convertAliasToStage (${stringify(convertAliasToStageAfter)}) must be ${stringify(convertAliasToStageExpected)}`);

  t.deepEqual(getStageHandlingSetting(context, 'injectStageIntoStreamName'), injectStageIntoStreamNameExpected, `injectStageIntoStreamName (${stringify(injectStageIntoStreamNameAfter)}) must be ${stringify(injectStageIntoStreamNameExpected)}`);
  t.deepEqual(getStageHandlingSetting(context, 'extractStageFromStreamName'), extractStageFromStreamNameExpected, `extractStageFromStreamName (${stringify(extractStageFromStreamNameAfter)}) must be ${stringify(extractStageFromStreamNameExpected)}`);
  t.equal(getStageHandlingSetting(context, 'streamNameStageSeparator'), streamNameStageSeparatorExpected, `streamNameStageSeparator (${stringify(streamNameStageSeparatorAfter)}) must be ${stringify(streamNameStageSeparatorExpected)}`);

  t.deepEqual(getStageHandlingSetting(context, 'injectStageIntoResourceName'), injectStageIntoResourceNameExpected, `injectStageIntoResourceName (${stringify(injectStageIntoResourceNameAfter)}) must be ${stringify(injectStageIntoResourceNameExpected)}`);
  t.deepEqual(getStageHandlingSetting(context, 'extractStageFromResourceName'), extractStageFromResourceNameExpected, `extractStageFromResourceName (${stringify(extractStageFromResourceNameAfter)}) must be ${stringify(extractStageFromResourceNameExpected)}`);
  t.equal(getStageHandlingSetting(context, 'resourceNameStageSeparator'), resourceNameStageSeparatorExpected, `resourceNameStageSeparator (${stringify(resourceNameStageSeparatorAfter)}) must be ${stringify(resourceNameStageSeparatorExpected)}`);

  t.equal(getStageHandlingSetting(context, 'injectInCase'), injectInCaseExpected, `injectInCase (${stringify(injectInCaseAfter)}) must be ${stringify(injectInCaseExpected)}`);
  t.equal(getStageHandlingSetting(context, 'extractInCase'), extractInCaseExpected, `extractInCase (${stringify(extractInCaseAfter)}) must be ${stringify(extractInCaseExpected)}`);

  t.equal(getStageHandlingSetting(context, 'defaultStage'), defaultStageExpected, `defaultStage (${stringify(defaultStageAfter)}) must be ${stringify(defaultStageExpected)}`);

  // Check whether stage handling works with this configuration
  const expected = mustChange ? toCase(trimOrEmpty(defaultStageExpected), extractInCaseExpected) : toCase(trimOrEmpty(defaultStageBefore), extractInCaseBefore);
  checkResolveStage(t, '', '', '', '', context, expected);
}

function checkConfigureDefaultStageHandling(t, context, forceConfiguration) {
  const before = context.stageHandling;

  const envStageNameBefore = before ? before.envStageName : undefined;

  const customToStageBefore = before ? before.customToStage : undefined;
  const convertAliasToStageBefore = before ? before.convertAliasToStage : undefined;

  const injectStageIntoStreamNameBefore = before ? before.injectStageIntoStreamName : undefined;
  const extractStageFromStreamNameBefore = before ? before.extractStageFromStreamName : undefined;
  const streamNameStageSeparatorBefore = before ? before.streamNameStageSeparator : undefined;

  const injectStageIntoResourceNameBefore = before ? before.injectStageIntoResourceName : undefined;
  const extractStageFromResourceNameBefore = before ? before.extractStageFromResourceName : undefined;
  const resourceNameStageSeparatorBefore = before ? before.resourceNameStageSeparator : undefined;

  const injectInCaseBefore = before ? before.injectInCase : undefined;
  const extractInCaseBefore = before ? before.extractInCase : undefined;
  const defaultStageBefore = before ? before.defaultStage : undefined;

  const mustChange = forceConfiguration || !before;

  // Configure it
  configureDefaultStageHandling(context, undefined, undefined, undefined, forceConfiguration);

  const after = context.stageHandling;

  const envStageNameAfter = after ? after.envStageName : undefined;

  const customToStageAfter = after ? after.customToStage : undefined;
  const convertAliasToStageAfter = after ? after.convertAliasToStage : undefined;

  const injectStageIntoStreamNameAfter = after ? after.injectStageIntoStreamName : undefined;
  const extractStageFromStreamNameAfter = after ? after.extractStageFromStreamName : undefined;
  const streamNameStageSeparatorAfter = after ? after.streamNameStageSeparator : undefined;

  const injectStageIntoResourceNameAfter = after ? after.injectStageIntoResourceName : undefined;
  const extractStageFromResourceNameAfter = after ? after.extractStageFromResourceName : undefined;
  const resourceNameStageSeparatorAfter = after ? after.resourceNameStageSeparator : undefined;

  const injectInCaseAfter = after ? after.injectInCase : undefined;
  const extractInCaseAfter = after ? after.extractInCase : undefined;
  const defaultStageAfter = after ? after.defaultStage : undefined;

  t.ok(isStageHandlingConfigured(context), `stage handling settings must be configured now`);

  // Expect the defaults to be in place
  const envStageNameExpected = mustChange ? 'STAGE' : envStageNameBefore;

  const customToStageExpected = mustChange ? undefined : customToStageBefore;
  const convertAliasToStageExpected = mustChange ? convertAliasToStage : convertAliasToStageBefore;

  const injectStageIntoStreamNameExpected = mustChange ? toStageSuffixedStreamName : injectStageIntoStreamNameBefore;
  const extractStageFromStreamNameExpected = mustChange ? extractStageFromSuffixedStreamName : extractStageFromStreamNameBefore;
  const streamNameStageSeparatorExpected = mustChange ? '_' : streamNameStageSeparatorBefore;

  const injectStageIntoResourceNameExpected = mustChange ? toStageSuffixedResourceName : injectStageIntoResourceNameBefore;
  const extractStageFromResourceNameExpected = mustChange ? extractStageFromSuffixedResourceName : extractStageFromResourceNameBefore;
  const resourceNameStageSeparatorExpected = mustChange ? '_' : resourceNameStageSeparatorBefore;

  const injectInCaseExpected = mustChange ? 'upper' : injectInCaseBefore;
  const extractInCaseExpected = mustChange ? 'lower' : extractInCaseBefore;
  const defaultStageExpected = mustChange ? undefined : defaultStageBefore;

  t.equal(getStageHandlingSetting(context, 'envStageName'), envStageNameExpected, `envStageName (${stringify(envStageNameAfter)}) must be ${stringify(envStageNameExpected)}`);

  t.deepEqual(getStageHandlingSetting(context, 'customToStage'), customToStageExpected, `customToStage (${stringify(customToStageAfter)}) must be ${stringify(customToStageExpected)}`);
  t.deepEqual(getStageHandlingSetting(context, 'convertAliasToStage'), convertAliasToStageExpected, `convertAliasToStage (${stringify(convertAliasToStageAfter)}) must be ${stringify(convertAliasToStageExpected)}`);

  t.deepEqual(getStageHandlingSetting(context, 'injectStageIntoStreamName'), injectStageIntoStreamNameExpected, `injectStageIntoStreamName (${stringify(injectStageIntoStreamNameAfter)}) must be ${stringify(injectStageIntoStreamNameExpected)}`);
  t.deepEqual(getStageHandlingSetting(context, 'extractStageFromStreamName'), extractStageFromStreamNameExpected, `extractStageFromStreamName (${stringify(extractStageFromStreamNameAfter)}) must be ${stringify(extractStageFromStreamNameExpected)}`);
  t.equal(getStageHandlingSetting(context, 'streamNameStageSeparator'), streamNameStageSeparatorExpected, `streamNameStageSeparator (${stringify(streamNameStageSeparatorAfter)}) must be ${stringify(streamNameStageSeparatorExpected)}`);

  t.deepEqual(getStageHandlingSetting(context, 'injectStageIntoResourceName'), injectStageIntoResourceNameExpected, `injectStageIntoResourceName (${stringify(injectStageIntoResourceNameAfter)}) must be ${stringify(injectStageIntoResourceNameExpected)}`);
  t.deepEqual(getStageHandlingSetting(context, 'extractStageFromResourceName'), extractStageFromResourceNameExpected, `extractStageFromResourceName (${stringify(extractStageFromResourceNameAfter)}) must be ${stringify(extractStageFromResourceNameExpected)}`);
  t.equal(getStageHandlingSetting(context, 'resourceNameStageSeparator'), resourceNameStageSeparatorExpected, `resourceNameStageSeparator (${stringify(resourceNameStageSeparatorAfter)}) must be ${stringify(resourceNameStageSeparatorExpected)}`);

  t.equal(getStageHandlingSetting(context, 'injectInCase'), injectInCaseExpected, `injectInCase (${stringify(injectInCaseAfter)}) must be ${stringify(injectInCaseExpected)}`);
  t.equal(getStageHandlingSetting(context, 'extractInCase'), extractInCaseExpected, `extractInCase (${stringify(extractInCaseAfter)}) must be ${stringify(extractInCaseExpected)}`);
  t.equal(getStageHandlingSetting(context, 'defaultStage'), defaultStageExpected, `defaultStage (${stringify(defaultStageAfter)}) must be ${stringify(defaultStageExpected)}`);

  // Check whether stage handling works with this configuration
  const expected = toCase(trimOrEmpty(defaultStageExpected), extractInCaseExpected);
  checkResolveStage(t, '', '', '', '', context, expected);
}

function checkConfigureStageHandlingAndDependencies(t, context, settings, options, otherSettings, otherOptions, forceConfiguration) {

  const before = context.stageHandling;

  const envStageNameBefore = before ? before.envStageName : undefined;

  const customToStageBefore = before ? before.customToStage : undefined;
  const convertAliasToStageBefore = before ? before.convertAliasToStage : undefined;

  const injectStageIntoStreamNameBefore = before ? before.injectStageIntoStreamName : undefined;
  const extractStageFromStreamNameBefore = before ? before.extractStageFromStreamName : undefined;
  const streamNameStageSeparatorBefore = before ? before.streamNameStageSeparator : undefined;

  const injectStageIntoResourceNameBefore = before ? before.injectStageIntoResourceName : undefined;
  const extractStageFromResourceNameBefore = before ? before.extractStageFromResourceName : undefined;
  const resourceNameStageSeparatorBefore = before ? before.resourceNameStageSeparator : undefined;

  const injectInCaseBefore = before ? before.injectInCase : undefined;
  const extractInCaseBefore = before ? before.extractInCase : undefined;
  const defaultStageBefore = before ? before.defaultStage : undefined;

  const mustChange = forceConfiguration || !before;

  configureStageHandling(context, settings, options, otherSettings, otherOptions, forceConfiguration);

  const after = context.stageHandling;

  const envStageNameAfter = after ? after.envStageName : undefined;

  const customToStageAfter = after ? after.customToStage : undefined;
  const convertAliasToStageAfter = after ? after.convertAliasToStage : undefined;

  const injectStageIntoStreamNameAfter = after ? after.injectStageIntoStreamName : undefined;
  const extractStageFromStreamNameAfter = after ? after.extractStageFromStreamName : undefined;
  const streamNameStageSeparatorAfter = after ? after.streamNameStageSeparator : undefined;

  const injectStageIntoResourceNameAfter = after ? after.injectStageIntoResourceName : undefined;
  const extractStageFromResourceNameAfter = after ? after.extractStageFromResourceName : undefined;
  const resourceNameStageSeparatorAfter = after ? after.resourceNameStageSeparator : undefined;

  const injectInCaseAfter = after ? after.injectInCase : undefined;
  const extractInCaseAfter = after ? after.extractInCase : undefined;
  const defaultStageAfter = after ? after.defaultStage : undefined;


  t.ok(isStageHandlingConfigured(context), `stage handling settings must be configured now`);

  // Get defaults
  const defaults = getDefaultStageHandlingSettings(options);

  // Set up the right expectations
  const envStageNameExpected = mustChange ? settings ? settings.envStageName : defaults.envStageName : envStageNameBefore;

  const customToStageExpected = mustChange ? settings ? settings.customToStage : defaults.customToStage : customToStageBefore;
  const convertAliasToStageExpected = mustChange ? settings ? settings.convertAliasToStage : defaults.convertAliasToStage : convertAliasToStageBefore;

  const injectStageIntoStreamNameExpected = mustChange ? settings ? settings.injectStageIntoStreamName : defaults.injectStageIntoStreamName : injectStageIntoStreamNameBefore;
  const extractStageFromStreamNameExpected = mustChange ? settings ? settings.extractStageFromStreamName : defaults.extractStageFromStreamName : extractStageFromStreamNameBefore;
  const streamNameStageSeparatorExpected = mustChange ? settings ? settings.streamNameStageSeparator : defaults.streamNameStageSeparator : streamNameStageSeparatorBefore;

  const injectStageIntoResourceNameExpected = mustChange ? settings ? settings.injectStageIntoResourceName : defaults.injectStageIntoResourceName : injectStageIntoResourceNameBefore;
  const extractStageFromResourceNameExpected = mustChange ? settings ? settings.extractStageFromResourceName : defaults.extractStageFromResourceName : extractStageFromResourceNameBefore;
  const resourceNameStageSeparatorExpected = mustChange ? settings ? settings.resourceNameStageSeparator : defaults.resourceNameStageSeparator : resourceNameStageSeparatorBefore;

  const injectInCaseExpected = mustChange ? settings ? settings.injectInCase : defaults.injectInCase : injectInCaseBefore;
  const extractInCaseExpected = mustChange ? settings ? settings.extractInCase : defaults.extractInCase : extractInCaseBefore;
  const defaultStageExpected = mustChange ? settings ? settings.defaultStage : defaults.defaultStage : defaultStageBefore;

  t.equal(getStageHandlingSetting(context, 'envStageName'), envStageNameExpected, `envStageName (${stringify(envStageNameAfter)}) must be ${stringify(envStageNameExpected)}`);

  t.deepEqual(getStageHandlingSetting(context, 'customToStage'), customToStageExpected, `customToStage (${stringify(customToStageAfter)}) must be ${stringify(customToStageExpected)}`);
  t.deepEqual(getStageHandlingSetting(context, 'convertAliasToStage'), convertAliasToStageExpected, `convertAliasToStage (${stringify(convertAliasToStageAfter)}) must be ${stringify(convertAliasToStageExpected)}`);

  t.deepEqual(getStageHandlingSetting(context, 'injectStageIntoStreamName'), injectStageIntoStreamNameExpected, `injectStageIntoStreamName (${stringify(injectStageIntoStreamNameAfter)}) must be ${stringify(injectStageIntoStreamNameExpected)}`);
  t.deepEqual(getStageHandlingSetting(context, 'extractStageFromStreamName'), extractStageFromStreamNameExpected, `extractStageFromStreamName (${stringify(extractStageFromStreamNameAfter)}) must be ${stringify(extractStageFromStreamNameExpected)}`);
  t.equal(getStageHandlingSetting(context, 'streamNameStageSeparator'), streamNameStageSeparatorExpected, `streamNameStageSeparator (${stringify(streamNameStageSeparatorAfter)}) must be ${stringify(streamNameStageSeparatorExpected)}`);

  t.deepEqual(getStageHandlingSetting(context, 'injectStageIntoResourceName'), injectStageIntoResourceNameExpected, `injectStageIntoResourceName (${stringify(injectStageIntoResourceNameAfter)}) must be ${stringify(injectStageIntoResourceNameExpected)}`);
  t.deepEqual(getStageHandlingSetting(context, 'extractStageFromResourceName'), extractStageFromResourceNameExpected, `extractStageFromResourceName (${stringify(extractStageFromResourceNameAfter)}) must be ${stringify(extractStageFromResourceNameExpected)}`);
  t.equal(getStageHandlingSetting(context, 'resourceNameStageSeparator'), resourceNameStageSeparatorExpected, `resourceNameStageSeparator (${stringify(resourceNameStageSeparatorAfter)}) must be ${stringify(resourceNameStageSeparatorExpected)}`);

  t.equal(getStageHandlingSetting(context, 'injectInCase'), injectInCaseExpected, `injectInCase (${stringify(injectInCaseAfter)}) must be ${stringify(injectInCaseExpected)}`);
  t.equal(getStageHandlingSetting(context, 'extractInCase'), extractInCaseExpected, `extractInCase (${stringify(extractInCaseAfter)}) must be ${stringify(extractInCaseExpected)}`);

  t.equal(getStageHandlingSetting(context, 'defaultStage'), defaultStageExpected, `defaultStage (${stringify(defaultStageAfter)}) must be ${stringify(defaultStageExpected)}`);

  // Check whether stage handling works with this configuration
  const expected = mustChange ? toCase(trimOrEmpty(defaultStageExpected), extractInCaseExpected) : toCase(trimOrEmpty(defaultStageBefore), extractInCaseBefore);
  checkResolveStage(t, '', '', '', '', context, expected);
}

// =====================================================================================================================
// Tests for configureStageHandlingWithSettings and isStageHandlingConfigured
// =====================================================================================================================

test('configureStageHandlingWithSettings with all undefined', t => {
  const context = {};
  t.notOk(isStageHandlingConfigured(context), `stage handling settings must not be configured yet`);

  // Configure it
  checkConfigureStageHandlingWithSettings(t, context, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, false);

  // Must NOT be able to reconfigure it with force false
  checkConfigureStageHandlingWithSettings(t, context, 'envStage', 'customToStage', 'convertAliasToStage', 'injectStageIntoStreamName', 'extractStageFromStreamName', 'streamNameStageSeparator', 'injectStageIntoResourceName', 'extractStageFromResourceName', 'resourceNameStageSeparator', 'injectInCase', 'extractInCase', 'defaultStage', false);

  // Must be able to reconfigure it with force true
  checkConfigureStageHandlingWithSettings(t, context, 'envStage', 'customToStage', 'convertAliasToStage', 'injectStageIntoStreamName', 'extractStageFromStreamName', 'streamNameStageSeparator', 'injectStageIntoResourceName, extractStageFromResourceName, resourceNameStageSeparator, injectInCase', 'extractInCase', 'defaultStage', true);

  t.end();
});

// =====================================================================================================================
// Tests for configureDefaultStageHandling and isStageHandlingConfigured
// =====================================================================================================================

test('configureDefaultStageHandling with all undefined', t => {
  const context = {};
  t.notOk(isStageHandlingConfigured(context), `stage handling settings must not be configured yet`);

  // Configure it
  checkConfigureDefaultStageHandling(t, context, false);

  // Overwrite it with arbitrary values to be able to check if defaults are NOT re-instated in next step
  checkConfigureStageHandlingWithSettings(t, context, 'envStage', 'customToStage', 'convertAliasToStage', 'injectStageIntoStreamName', 'extractStageFromStreamName', 'streamNameStageSeparator', 'injectStageIntoResourceName, extractStageFromResourceName, resourceNameStageSeparator, injectInCase', 'extractInCase', 'defaultStage', true);

  // Must NOT be able to reconfigure it with force false
  checkConfigureDefaultStageHandling(t, context, false);

  // Must be able to reconfigure it with force true
  checkConfigureDefaultStageHandling(t, context, true);

  t.end();
});

// =====================================================================================================================
// Tests for configureStageHandling with settings
// =====================================================================================================================

test('configureStageHandling with settings', t => {
  const context = {};
  t.notOk(isStageHandlingConfigured(context), `stage handling settings must not be configured yet`);

  // Configure settings
  const settings = {
    envStageName: 'envStageName',

    customToStage: 'customToStage',
    convertAliasToStage: 'convertAliasToStage',

    injectStageIntoStreamName: 'injectStageIntoStreamName',
    extractStageFromStreamName: 'extractStageFromStreamName',
    streamNameStageSeparator: 'streamNameStageSeparator',

    injectStageIntoResourceName: 'injectStageIntoResourceName',
    extractStageFromResourceName: 'extractStageFromResourceName',
    resourceNameStageSeparator: 'resourceNameStageSeparator',

    injectInCase: 'injectInCase',
    extractInCase: 'extractInCase',

    defaultStage: 'defaultStage',

    // A simulated custom property
    myCustomProperty: 'myCustomProperty'
  };

  // Configure it
  checkConfigureStageHandlingAndDependencies(t, context, undefined, undefined, undefined, undefined, false);

  // Must NOT be able to reconfigure it with force false
  checkConfigureStageHandlingAndDependencies(t, context, settings, undefined, undefined, undefined, false);

  // Must be able to reconfigure it with force true
  checkConfigureStageHandlingAndDependencies(t, context, settings, undefined, undefined, undefined, true);

  t.end();
});

// =====================================================================================================================
// Tests for configureStageHandling with options
// =====================================================================================================================

test('configureStageHandling with settings', t => {
  const context = {};
  t.notOk(isStageHandlingConfigured(context), `stage handling settings must not be configured yet`);

  // Configure options
  const options = {
    envStageName: 'envStageName',

    streamNameStageSeparator: 'streamNameStageSeparator',
    resourceNameStageSeparator: 'resourceNameStageSeparator',

    injectInCase: 'injectInCase',
    extractInCase: 'extractInCase',

    defaultStage: 'defaultStage',
  };

  // Configure it
  checkConfigureStageHandlingAndDependencies(t, context, undefined, undefined, undefined, undefined, false);

  // Must NOT be able to reconfigure it with force false
  checkConfigureStageHandlingAndDependencies(t, context, undefined, options, undefined, undefined, false);

  // Must be able to reconfigure it with force true
  checkConfigureStageHandlingAndDependencies(t, context, undefined, options, undefined, undefined, true);

  t.end();
});

// =====================================================================================================================
// Tests for configureStageHandling with settings AND options
// =====================================================================================================================

test('configureStageHandling with settings AND options', t => {
  const context = {};
  t.notOk(isStageHandlingConfigured(context), `stage handling settings must not be configured yet`);

  // Configure settings
  const settings = {
    envStageName: 'envStageName',

    customToStage: 'customToStage',
    convertAliasToStage: 'convertAliasToStage',

    injectStageIntoStreamName: 'injectStageIntoStreamName',
    extractStageFromStreamName: 'extractStageFromStreamName',
    streamNameStageSeparator: 'streamNameStageSeparator',

    injectStageIntoResourceName: 'injectStageIntoResourceName',
    extractStageFromResourceName: 'extractStageFromResourceName',
    resourceNameStageSeparator: 'resourceNameStageSeparator',

    injectInCase: 'injectInCase',
    extractInCase: 'extractInCase',

    defaultStage: 'defaultStage',
  };

  // Configure options
  const options = {
    envStageName: 'envStageName2',

    streamNameStageSeparator: 'streamNameStageSeparator2',
    resourceNameStageSeparator: 'resourceNameStageSeparator2',

    injectInCase: 'injectInCase2',
    extractInCase: 'extractInCase2',

    defaultStage: 'defaultStage2',
  };
  // Configure it
  checkConfigureStageHandlingAndDependencies(t, context, undefined, undefined, undefined, undefined, false);

  // Must NOT be able to reconfigure it with force false
  checkConfigureStageHandlingAndDependencies(t, context, settings, options, undefined, undefined, false);

  // Must be able to reconfigure it with force true
  checkConfigureStageHandlingAndDependencies(t, context, settings, options, undefined, undefined, true);

  t.end();
});

// =====================================================================================================================
// Tests for convertAliasToStage
// =====================================================================================================================

test('convertAliasToStage', t => {
  checkConvertAliasToStage(t, undefined, '');
  checkConvertAliasToStage(t, null, '');
  checkConvertAliasToStage(t, '', '');
  checkConvertAliasToStage(t, 'DEV', 'DEV');
  checkConvertAliasToStage(t, 'prod', 'prod');
  checkConvertAliasToStage(t, 'Prod', 'Prod');
  checkConvertAliasToStage(t, '  QA  ', 'QA');
  checkConvertAliasToStage(t, ' PROD 2016-10-19 ', 'PROD 2016-10-19');
  t.end();
});

// =====================================================================================================================
// Tests for convertStreamNameSuffixToStage
// =====================================================================================================================

test('convertStreamNameSuffixToStage with default settings, should use default "_" as separator and lowercase', t => {
  const context = configureDefaultStageHandling({});
  const extractInCase = context.stageHandling.extractInCase;
  t.ok(extractInCase === 'lower' || extractInCase === 'lowercase', `extractInCase (${extractInCase}) defaults to lowercase`);
  checkExtractStageFromSuffixedStreamName(t, undefined, context, '');
  checkExtractStageFromSuffixedStreamName(t, null, context, '');
  checkExtractStageFromSuffixedStreamName(t, '', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream1', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream2_', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream3_Dev', context, 'dev');
  checkExtractStageFromSuffixedStreamName(t, 'Stream4_QA', context, 'qa');
  checkExtractStageFromSuffixedStreamName(t, 'Stream_5_qa', context, 'qa');
  checkExtractStageFromSuffixedStreamName(t, 'Test_Stream_6_Prod', context, 'prod');
  checkExtractStageFromSuffixedStreamName(t, ' Test_Stream_7_Prod-01 ', context, 'prod-01');

  checkExtractStageFromSuffixedStreamName(t, 'Stream_Ss', context, 'ss');
  t.end();
});

test('convertStreamNameSuffixToStage with default settings and extractInCase "as_is", should keep stream suffixes as is', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.extractInCase = 'as_is';
  checkExtractStageFromSuffixedStreamName(t, undefined, context, '');
  checkExtractStageFromSuffixedStreamName(t, null, context, '');
  checkExtractStageFromSuffixedStreamName(t, '', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream1', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream2_', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream3_Dev', context, 'Dev');
  checkExtractStageFromSuffixedStreamName(t, 'Stream4_QA', context, 'QA');
  checkExtractStageFromSuffixedStreamName(t, 'Stream_5_qa', context, 'qa');
  checkExtractStageFromSuffixedStreamName(t, 'Test_Stream_6_Prod', context, 'Prod');
  checkExtractStageFromSuffixedStreamName(t, ' Test_Stream_7_Prod-01 ', context, 'Prod-01');

  checkExtractStageFromSuffixedStreamName(t, 'Stream_Ss', context, 'Ss');
  t.end();
});

test('convertStreamNameSuffixToStage with default settings and extractInCase "uppercase", should give uppercase stream suffixes', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.extractInCase = 'uppercase';
  checkExtractStageFromSuffixedStreamName(t, undefined, context, '');
  checkExtractStageFromSuffixedStreamName(t, null, context, '');
  checkExtractStageFromSuffixedStreamName(t, '', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream1', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream2_', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream3_Dev', context, 'DEV');
  checkExtractStageFromSuffixedStreamName(t, 'Stream4_QA', context, 'QA');
  checkExtractStageFromSuffixedStreamName(t, 'Stream_5_qa', context, 'QA');
  checkExtractStageFromSuffixedStreamName(t, 'Test_Stream_6_Prod', context, 'PROD');
  checkExtractStageFromSuffixedStreamName(t, ' Test_Stream_7_Prod-01 ', context, 'PROD-01');

  checkExtractStageFromSuffixedStreamName(t, 'Stream_Ss', context, 'SS');
  t.end();
});

test('convertStreamNameSuffixToStage with streamNameStageSeparator set to undefined, should disable stream names as a source', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.streamNameStageSeparator = undefined;
  context.stageHandling.extractInCase = 'as_is';
  checkExtractStageFromSuffixedStreamName(t, undefined, context, '');
  checkExtractStageFromSuffixedStreamName(t, null, context, '');
  checkExtractStageFromSuffixedStreamName(t, '', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream1', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream2_', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream3_Dev', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream4_QA', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream_5_qa', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Test_Stream_6_Prod', context, '');
  checkExtractStageFromSuffixedStreamName(t, ' Test_Stream_7_Prod-01 ', context, '');

  checkExtractStageFromSuffixedStreamName(t, 'Stream_Ss', context, '');
  t.end();
});

test('convertStreamNameSuffixToStage with streamNameStageSeparator set to "", should also disable stream names as a source', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.streamNameStageSeparator = '';
  context.stageHandling.extractInCase = 'upper';

  checkExtractStageFromSuffixedStreamName(t, undefined, context, '');
  checkExtractStageFromSuffixedStreamName(t, null, context, '');
  checkExtractStageFromSuffixedStreamName(t, '', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream1', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream2_', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream3_Dev', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream4_QA', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream_5_qa', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Test_Stream_6_Prod', context, '');
  checkExtractStageFromSuffixedStreamName(t, ' Test_Stream_7_Prod-01 ', context, '');

  t.end();
});

test('convertStreamNameSuffixToStage with context.streamNameStageSeparator set to "-", should NOT use default "_" as separator', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.streamNameStageSeparator = '-';
  context.stageHandling.extractInCase = 'as_is';

  checkExtractStageFromSuffixedStreamName(t, undefined, context, '');
  checkExtractStageFromSuffixedStreamName(t, null, context, '');
  checkExtractStageFromSuffixedStreamName(t, '', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream1', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream2_', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream3_Dev', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream3_QA', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream_3_qa', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Test_Stream3_Prod', context, '');
  checkExtractStageFromSuffixedStreamName(t, ' Test_Stream3_Prod_01 ', context, '');

  checkExtractStageFromSuffixedStreamName(t, 'Stream_2-', context, '');
  checkExtractStageFromSuffixedStreamName(t, 'Stream_3-Dev', context, 'Dev');
  checkExtractStageFromSuffixedStreamName(t, 'Stream_3-QA', context, 'QA');
  checkExtractStageFromSuffixedStreamName(t, 'Stream_3-qa', context, 'qa');
  checkExtractStageFromSuffixedStreamName(t, 'Test_Stream3-Prod', context, 'Prod');
  checkExtractStageFromSuffixedStreamName(t, ' Test_Stream3-Prod_01 ', context, 'Prod_01');

  t.end();
});

// =====================================================================================================================
// Tests for resolveStage
// =====================================================================================================================

test('resolveStage with undefined/null/empty alias, stream name & context must return empty', t => {
  const context = {};

  checkResolveStage(t, undefined, undefined, undefined, undefined, context, '');
  checkResolveStage(t, null, null, null, null, context, '');
  checkResolveStage(t, '', '', '', '', context, '');

  t.end();
});

test('resolveStage with no defaultStage', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.extractInCase = 'as_is';

  // No default stage and nothing else
  checkResolveStage(t, '', '', '', '', context, '');
  // No default stage and stream without suffix must be empty
  checkResolveStage(t, '', '', '', 'Stream', context, '');
  // No default stage and stream with suffix must use suffix
  checkResolveStage(t, '', '', '', 'Stream_Ss', context, 'Ss');
  // No default stage and Lambda without alias must be empty
  checkResolveStage(t, '', '1.0.1', '1.0.1', '', context, '');
  // No default stage and Lambda with alias must use alias stage
  checkResolveStage(t, '', '1.0.1', 'As', '', context, 'As');
  // No default stage and event with stage must use event stage
  checkResolveStage(t, 'Es', '', '', '', context, 'Es');

  t.end();
});


test('resolveStage with defaultStage', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.extractInCase = 'as_is';
  context.stageHandling.defaultStage = 'Ds';

  // Default stage and nothing else must be default stage
  checkResolveStage(t, '', '', '', '', context, 'Ds');
  // Default stage must override stream without suffix
  checkResolveStage(t, '', '', '', 'Stream', context, 'Ds');
  // Default stage must not override stream with suffix
  checkResolveStage(t, '', '', '', 'Stream_Ss', context, 'Ss');
  // Default stage must override Lambda without alias
  checkResolveStage(t, '', '1.0.1', '1.0.1', '', context, 'Ds');
  // Default stage must not override Lambda with alias
  checkResolveStage(t, '', '1.0.1', 'As', '', context, 'As');
  // Default stage must not override event stage
  checkResolveStage(t, 'Es', '', '', '', context, 'Es');

  t.end();
});

test('resolveStage with stream without suffix', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.defaultStage = 'Ds';
  context.stageHandling.extractInCase = 'as_is';

  // Stream without suffix must not override default stage
  checkResolveStage(t, '', '', '', 'Stream', context, 'Ds');
  // Stream without suffix must not override default stage when Lambda without alias
  checkResolveStage(t, '', '1.0.1', '1.0.1', 'Stream', context, 'Ds');
  // Stream without suffix must not override Lambda with alias
  checkResolveStage(t, '', '1.0.1', 'As', 'Stream', context, 'As');
  // Stream without suffix must not override event stage
  checkResolveStage(t, 'Es', '', '', 'Stream', context, 'Es');

  t.end();
});

test('resolveStage with stream with suffix', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.defaultStage = 'Ds';
  context.stageHandling.extractInCase = 'as_is';

  // Stream with suffix must override default stage
  checkResolveStage(t, '', '', '', 'Stream_Ss', context, 'Ss');
  // Stream with suffix must override default stage when Lambda without alias
  checkResolveStage(t, '', '1.0.1', '1.0.1', 'Stream_Ss', context, 'Ss');
  // Stream with suffix must not override Lambda with alias
  checkResolveStage(t, '', '1.0.1', 'As', 'Stream_Ss', context, 'As');
  // Stream with suffix must not override event stage
  checkResolveStage(t, 'Es', '', '', 'Stream_Ss', context, 'Es');

  t.end();
});


test('resolveStage with Lambda without alias', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.defaultStage = 'Ds';
  context.stageHandling.extractInCase = 'as_is';

  // Lambda without alias must not override default stage
  checkResolveStage(t, '', '1.0.1', '1.0.1', '', context, 'Ds');
  // Lambda without alias must not override default stage when stream without suffix
  checkResolveStage(t, '', '1.0.1', '1.0.1', 'Stream', context, 'Ds');
  // Lambda without alias must not override stream with suffix
  checkResolveStage(t, '', '1.0.1', '1.0.1', 'Stream_Ss', context, 'Ss');
  // Lambda without alias must not override event stage
  checkResolveStage(t, 'Es', '1.0.1', '1.0.1', 'Stream_Ss', context, 'Es');

  t.end();
});

test('resolveStage with Lambda with alias', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.defaultStage = 'Ds';
  context.stageHandling.extractInCase = 'as_is';

  // Lambda with alias must override default stage
  checkResolveStage(t, '', '1.0.1', 'As', '', context, 'As');
  // Lambda with alias must override default stage when stream without suffix
  checkResolveStage(t, '', '1.0.1', 'As', 'Stream', context, 'As');
  // Lambda with alias must override stream with suffix
  checkResolveStage(t, '', '1.0.1', 'As', 'Stream_Ss', context, 'As');
  // Lambda with alias must not override event stage
  checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream_Ss', context, 'Es');

  t.end();
});

test('resolveStage with event stage', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.defaultStage = 'Ds';
  context.stageHandling.extractInCase = 'as_is';

  // Event stage must override default stage
  checkResolveStage(t, 'Es', '', '', '', context, 'Es');
  // Event stage must override stream without suffix and default
  checkResolveStage(t, 'Es', '', '', 'Stream', context, 'Es');
  // Event stage must override stream with suffix and default
  checkResolveStage(t, 'Es', '', '', 'Stream_Ss', context, 'Es');

  // Event stage must override Lambda without alias and default
  checkResolveStage(t, 'Es', '1.0.1', '1.01', '', context, 'Es');
  // Event stage must override Lambda without alias and stream without suffix and default
  checkResolveStage(t, 'Es', '1.0.1', '1.01', 'Stream', context, 'Es');
  // Event stage must override Lambda without alias and stream with suffix and default
  checkResolveStage(t, 'Es', '1.0.1', '1.01', 'Stream_Ss', context, 'Es');

  // Event stage must override Lambda with alias and default
  checkResolveStage(t, 'Es', '1.0.1', 'As', '', context, 'Es');
  // Event stage must override Lambda with alias and stream without suffix and default
  checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream', context, 'Es');
  // Event stage must override Lambda with alias and stream with suffix and default
  checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream_Ss', context, 'Es');

  t.end();
});


test('resolveStage with context stage and without event stage', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.defaultStage = 'Ds';
  context.stageHandling.extractInCase = 'as_is';

  context.stage = 'Cs';

  // Context stage must override default stage
  checkResolveStage(t, '', '', '', '', context, 'Cs');

  // Context stage must override stream without suffix and default
  checkResolveStage(t, '', '', '', 'Stream', context, 'Cs');
  // Context stage must override stream with suffix and default
  checkResolveStage(t, '', '', '', 'Stream_Ss', context, 'Cs');

  // Context stage must override Lambda without alias and default
  checkResolveStage(t, '', '1.0.1', '1.01', '', context, 'Cs');
  // Context stage must override Lambda without alias and stream without suffix and default
  checkResolveStage(t, '', '1.0.1', '1.01', 'Stream', context, 'Cs');
  // Context stage must override Lambda without alias and stream with suffix and default
  checkResolveStage(t, '', '1.0.1', '1.01', 'Stream_Ss', context, 'Cs');

  // Context stage must override Lambda with alias and default
  checkResolveStage(t, '', '1.0.1', 'As', '', context, 'Cs');
  // Context stage must override Lambda with alias and stream without suffix and default
  checkResolveStage(t, '', '1.0.1', 'As', 'Stream', context, 'Cs');
  // Context stage must override Lambda with alias and stream with suffix and default
  checkResolveStage(t, '', '1.0.1', 'As', 'Stream_Ss', context, 'Cs');

  t.end();
});

test('resolveStage with context stage and with event stage', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.defaultStage = 'Ds';
  context.stageHandling.extractInCase = 'as_is';

  context.stage = 'Cs';

  // Context stage must override default stage
  checkResolveStage(t, 'Es', '', '', '', context, 'Cs');
  // Context stage must override stream without suffix and default
  checkResolveStage(t, 'Es', '', '', 'Stream', context, 'Cs');
  // Context stage must override stream with suffix and default
  checkResolveStage(t, 'Es', '', '', 'Stream_Ss', context, 'Cs');

  // Context stage must override event stage and Lambda without alias and default
  checkResolveStage(t, 'Es', '1.0.1', '1.01', '', context, 'Cs');
  // Context stage must override event stage and Lambda without alias and stream without suffix and default
  checkResolveStage(t, 'Es', '1.0.1', '1.01', 'Stream', context, 'Cs');
  // Context stage must override event stage and Lambda without alias and stream with suffix and default
  checkResolveStage(t, 'Es', '1.0.1', '1.01', 'Stream_Ss', context, 'Cs');

  // Context stage must override event stage and Lambda with alias and default
  checkResolveStage(t, 'Es', '1.0.1', 'As', '', context, 'Cs');
  // Context stage must override event stage and Lambda with alias and stream without suffix and default
  checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream', context, 'Cs');
  // Context stage must override event stage and Lambda with alias and stream with suffix and default
  checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream_Ss', context, 'Cs');

  t.end();
});

test('resolveStage with custom-to-stage, event stage, but no context stage', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.defaultStage = 'Ds';
  context.stageHandling.extractInCase = 'as_is';
  context.stageHandling.customToStage = () => {
    return 'CustomStage';
  };

  // Context stage must override default stage
  checkResolveStage(t, 'Es', '', '', '', context, 'CustomStage');
  // Context stage must override stream without suffix and default
  checkResolveStage(t, 'Es', '', '', 'Stream', context, 'CustomStage');
  // Context stage must override stream with suffix and default
  checkResolveStage(t, 'Es', '', '', 'Stream_Ss', context, 'CustomStage');

  // Context stage must override event stage and Lambda without alias and default
  checkResolveStage(t, 'Es', '1.0.1', '1.01', '', context, 'CustomStage');
  // Context stage must override event stage and Lambda without alias and stream without suffix and default
  checkResolveStage(t, 'Es', '1.0.1', '1.01', 'Stream', context, 'CustomStage');
  // Context stage must override event stage and Lambda without alias and stream with suffix and default
  checkResolveStage(t, 'Es', '1.0.1', '1.01', 'Stream_Ss', context, 'CustomStage');

  // Context stage must override event stage and Lambda with alias and default
  checkResolveStage(t, 'Es', '1.0.1', 'As', '', context, 'CustomStage');
  // Context stage must override event stage and Lambda with alias and stream without suffix and default
  checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream', context, 'CustomStage');
  // Context stage must override event stage and Lambda with alias and stream with suffix and default
  checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream_Ss', context, 'CustomStage');

  t.end();
});

test('resolveStage with custom-to-stage and context stage and event stage', t => {
  const context = configureDefaultStageHandling({});
  context.stageHandling.defaultStage = 'Ds';
  context.stageHandling.extractInCase = 'as_is';
  context.stageHandling.customToStage = () => {
    return 'CustomStage';
  };

  context.stage = 'Cs';

  // Context stage must override default stage
  checkResolveStage(t, 'Es', '', '', '', context, 'Cs');
  // Context stage must override stream without suffix and default
  checkResolveStage(t, 'Es', '', '', 'Stream', context, 'Cs');
  // Context stage must override stream with suffix and default
  checkResolveStage(t, 'Es', '', '', 'Stream_Ss', context, 'Cs');

  // Context stage must override event stage and Lambda without alias and default
  checkResolveStage(t, 'Es', '1.0.1', '1.01', '', context, 'Cs');
  // Context stage must override event stage and Lambda without alias and stream without suffix and default
  checkResolveStage(t, 'Es', '1.0.1', '1.01', 'Stream', context, 'Cs');
  // Context stage must override event stage and Lambda without alias and stream with suffix and default
  checkResolveStage(t, 'Es', '1.0.1', '1.01', 'Stream_Ss', context, 'Cs');

  // Context stage must override event stage and Lambda with alias and default
  checkResolveStage(t, 'Es', '1.0.1', 'As', '', context, 'Cs');
  // Context stage must override event stage and Lambda with alias and stream without suffix and default
  checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream', context, 'Cs');
  // Context stage must override event stage and Lambda with alias and stream with suffix and default
  checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream_Ss', context, 'Cs');

  t.end();
});


test('resolveStage with env stage, custom-to-stage, event stage, but no context stage', t => {
  try {
    process.env.STAGE = 'EnvStage';

    const context = configureDefaultStageHandling({});
    context.stageHandling.defaultStage = 'Ds';
    context.stageHandling.extractInCase = 'as_is';
    context.stageHandling.customToStage = () => {
      return 'CustomStage';
    };

    // Context stage must override default stage
    checkResolveStage(t, 'Es', '', '', '', context, 'EnvStage');
    // Context stage must override stream without suffix and default
    checkResolveStage(t, 'Es', '', '', 'Stream', context, 'EnvStage');
    // Context stage must override stream with suffix and default
    checkResolveStage(t, 'Es', '', '', 'Stream_Ss', context, 'EnvStage');

    // Context stage must override event stage and Lambda without alias and default
    checkResolveStage(t, 'Es', '1.0.1', '1.01', '', context, 'EnvStage');
    // Context stage must override event stage and Lambda without alias and stream without suffix and default
    checkResolveStage(t, 'Es', '1.0.1', '1.01', 'Stream', context, 'EnvStage');
    // Context stage must override event stage and Lambda without alias and stream with suffix and default
    checkResolveStage(t, 'Es', '1.0.1', '1.01', 'Stream_Ss', context, 'EnvStage');

    // Context stage must override event stage and Lambda with alias and default
    checkResolveStage(t, 'Es', '1.0.1', 'As', '', context, 'EnvStage');
    // Context stage must override event stage and Lambda with alias and stream without suffix and default
    checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream', context, 'EnvStage');
    // Context stage must override event stage and Lambda with alias and stream with suffix and default
    checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream_Ss', context, 'EnvStage');

    t.end();
  } finally {
    process.env.STAGE = undefined;
  }
});

test('resolveStage with env stage, custom-to-stage and context stage and event stage', t => {
  try {
    process.env.STAGE = 'EnvStage';

    const context = configureDefaultStageHandling({});
    context.stageHandling.defaultStage = 'Ds';
    context.stageHandling.extractInCase = 'as_is';
    context.stageHandling.customToStage = () => {
      return 'CustomStage';
    };

    context.stage = 'Cs';

    // Context stage must override default stage
    checkResolveStage(t, 'Es', '', '', '', context, 'Cs');
    // Context stage must override stream without suffix and default
    checkResolveStage(t, 'Es', '', '', 'Stream', context, 'Cs');
    // Context stage must override stream with suffix and default
    checkResolveStage(t, 'Es', '', '', 'Stream_Ss', context, 'Cs');

    // Context stage must override event stage and Lambda without alias and default
    checkResolveStage(t, 'Es', '1.0.1', '1.01', '', context, 'Cs');
    // Context stage must override event stage and Lambda without alias and stream without suffix and default
    checkResolveStage(t, 'Es', '1.0.1', '1.01', 'Stream', context, 'Cs');
    // Context stage must override event stage and Lambda without alias and stream with suffix and default
    checkResolveStage(t, 'Es', '1.0.1', '1.01', 'Stream_Ss', context, 'Cs');

    // Context stage must override env stage, custom stage, event stage and Lambda with alias and default
    checkResolveStage(t, 'Es', '1.0.1', 'As', '', context, 'Cs');
    // Context stage must override env stage, custom stage, event stage and Lambda with alias and stream without suffix and default
    checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream', context, 'Cs');
    // Context stage must override env stage, custom stage, event stage and Lambda with alias and stream with suffix and default
    checkResolveStage(t, 'Es', '1.0.1', 'As', 'Stream_Ss', context, 'Cs');

    t.end();
  } finally {
    process.env.STAGE = undefined;
  }
});
