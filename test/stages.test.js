'use strict';

/**
 * Unit tests for aws-core-utils/stages.js
 * @author Byron du Preez
 */

const test = require("tape");

// The test subject
const stages = require('../stages');
const isResolveStageConfigured = stages.isResolveStageConfigured;
const configureResolveStage = stages.configureResolveStage;
const configureResolveStageWithDefaults = stages.configureResolveStageWithDefaults;
const resolveStage = stages.resolveStage;
const getResolveStageSetting = stages.getResolveStageSetting;
const convertAliasToStage = stages.convertAliasToStage;
const convertStreamNameSuffixToStage = stages.convertStreamNameSuffixToStage;
//const appendStage = stages.appendStage;
const toCase = stages.FOR_TESTING_ONLY.toCase;

const Strings = require('core-functions/strings');
const trim = Strings.trim;
const trimOrEmpty = Strings.trimOrEmpty;
//const isBlank = Strings.isBlank;
const isNotBlank = Strings.isNotBlank;
const stringify = Strings.stringify;

const samples = require('./samples');
// Constants
const latestFunctionVersion = samples.latestFunctionVersion;

// General
const sampleNumberString = samples.sampleNumberString;

// For AWS contexts
const sampleInvokedFunctionArn = samples.sampleInvokedFunctionArn;
const sampleAwsContext = samples.sampleAwsContext;

// For Kinesis events
const sampleStreamName = samples.sampleStreamName;
const sampleEventSourceArn = samples.sampleEventSourceArn;
const sampleEventSourceArnFromPrefixSuffix = samples.sampleEventSourceArnFromPrefixSuffix;
const sampleBase64Data = samples.sampleBase64Data;
const sampleKinesisEventWithSampleRecord = samples.sampleKinesisEventWithSampleRecord;
const sampleKinesisEventWithRecord = samples.sampleKinesisEventWithRecord;
const sampleKinesisEventWithRecords = samples.sampleKinesisEventWithRecords;


function checkConvertAliasToStage(alias, expected, t) {
  t.equal(convertAliasToStage(alias, undefined, undefined, undefined), expected, `'${alias}' must be '${expected}'`);
}

function checkConvertStreamNameSuffixToStage(streamName, context, expected, t) {
  t.equal(convertStreamNameSuffixToStage(streamName, undefined, undefined, context), expected
    , `'${streamName}' must be '${expected}'`);
}

function checkResolveStage(eventStage, functionVersion, functionAlias, streamName, context, expected, t) {
  // Create an AWS context
  const invokedFunctionArn = sampleInvokedFunctionArn('invokedFunctionArnRegion', 'functionName', functionAlias);
  const awsContext = sampleAwsContext('functionName', functionVersion, invokedFunctionArn);

  // Create a Kinesis event
  const eventSourceArn = sampleEventSourceArn('eventSourceArnRegion', streamName);
  const event = sampleKinesisEventWithSampleRecord(undefined, undefined, eventSourceArn, 'eventAwsRegion');
  if (isNotBlank(eventStage)) {
    event.stage = eventStage;
  }

  // Resolve the stage
  const actual = resolveStage(event, awsContext, context);

  t.equal(actual, expected, `resolve: alias(${functionAlias}) stream(${streamName}) context(${context.stage}, ${context.defaultStage}) -> '${actual}' must be '${expected}'`);
}

function checkConfigureResolveStage(context, convertAliasToStage, convertStreamNameToStage, streamNameStageSeparator,
                                    defaultStage, inCase, forceConfiguration, t) {
  const before = context.resolveStageConfig;

  const convertAliasToStageBefore = before ? before.convertAliasToStage : undefined;
  const convertStreamNameToStageBefore = before ? before.convertStreamNameToStage : undefined;
  const streamNameStageSeparatorBefore = before ? before.streamNameStageSeparator : undefined;
  const defaultStageBefore = before ? before.defaultStage : undefined;
  const inCaseBefore = before ? before.inCase : undefined;

  const mustChange = forceConfiguration || !before;

  // Configure it
  configureResolveStage(context, convertAliasToStage, convertStreamNameToStage, streamNameStageSeparator, defaultStage,
    inCase, forceConfiguration, t);

  const after = context.resolveStageConfig;
  const convertAliasToStageAfter = after ? after.convertAliasToStage : undefined;
  const convertStreamNameToStageAfter = after ? after.convertStreamNameToStage : undefined;
  const streamNameStageSeparatorAfter = after ? after.streamNameStageSeparator : undefined;
  const defaultStageAfter = after ? after.defaultStage : undefined;
  const inCaseAfter = after ? after.inCase : undefined;

  t.ok(isResolveStageConfigured(context), `resolve stage settings must be configured now`);

  // Set up the right expectations
  const convertAliasToStageExpected = mustChange ? convertAliasToStage : convertAliasToStageBefore;
  const convertStreamNameToStageExpected = mustChange ? convertStreamNameToStage : convertStreamNameToStageBefore;
  const streamNameStageSeparatorExpected = mustChange ? streamNameStageSeparator : streamNameStageSeparatorBefore;
  const defaultStageExpected = mustChange ? defaultStage : defaultStageBefore;
  const inCaseExpected = mustChange ? inCase : inCaseBefore;

  t.deepEqual(getResolveStageSetting(context, 'convertAliasToStage'), convertAliasToStageExpected, `convertAliasToStage (${stringify(convertAliasToStageAfter)}) must be ${stringify(convertAliasToStageExpected)}`);
  t.deepEqual(getResolveStageSetting(context, 'convertStreamNameToStage'), convertStreamNameToStageExpected, `convertStreamNameToStage (${stringify(convertStreamNameToStageAfter)}) must be ${stringify(convertStreamNameToStageExpected)}`);
  t.equal(getResolveStageSetting(context, 'streamNameStageSeparator'), streamNameStageSeparatorExpected, `streamNameStageSeparator (${stringify(streamNameStageSeparatorAfter)}) must be ${stringify(streamNameStageSeparatorExpected)}`);
  t.equal(getResolveStageSetting(context, 'defaultStage'), defaultStageExpected, `defaultStage (${stringify(defaultStageAfter)}) must be ${stringify(defaultStageExpected)}`);
  t.equal(getResolveStageSetting(context, 'inCase'), inCaseExpected, `inCase (${stringify(inCaseAfter)}) must be ${stringify(inCaseExpected)}`);

  // Check whether resolve stage works with this configuration
  const expected = mustChange ? toCase(trimOrEmpty(defaultStageExpected), inCaseExpected) : toCase(trimOrEmpty(defaultStageBefore), inCaseBefore);
  checkResolveStage('', '', '', '', context, expected, t);
}


function checkConfigureResolveStageWithDefaults(context, forceConfiguration, t) {
  const before = context.resolveStageConfig;

  const convertAliasToStageBefore = before ? before.convertAliasToStage : undefined;
  const convertStreamNameToStageBefore = before ? before.convertStreamNameToStage : undefined;
  const streamNameStageSeparatorBefore = before ? before.streamNameStageSeparator : undefined;
  const defaultStageBefore = before ? before.defaultStage : undefined;
  const inCaseBefore = before ? before.inCase : undefined;

  const mustChange = forceConfiguration || !before;

  // Configure it
  configureResolveStageWithDefaults(context, forceConfiguration, t);

  const after = context.resolveStageConfig;
  const convertAliasToStageAfter = after ? after.convertAliasToStage : undefined;
  const convertStreamNameToStageAfter = after ? after.convertStreamNameToStage : undefined;
  const streamNameStageSeparatorAfter = after ? after.streamNameStageSeparator : undefined;
  const defaultStageAfter = after ? after.defaultStage : undefined;
  const inCaseAfter = after ? after.inCase : undefined;

  t.ok(isResolveStageConfigured(context), `resolve stage settings must be configured now`);

  // Expect the defaults to be in place
  const convertAliasToStageExpected = mustChange ? convertAliasToStage : convertAliasToStageBefore;
  const convertStreamNameToStageExpected = mustChange ? convertStreamNameSuffixToStage : convertStreamNameToStageBefore;
  const streamNameStageSeparatorExpected = mustChange ? '_' : streamNameStageSeparatorBefore;
  const defaultStageExpected = mustChange ? undefined : defaultStageBefore;
  const inCaseExpected = mustChange ? 'lowercase' : inCaseBefore;

  t.deepEqual(getResolveStageSetting(context, 'convertAliasToStage'), convertAliasToStageExpected, `convertAliasToStage (${stringify(convertAliasToStageAfter)}) must be ${stringify(convertAliasToStageExpected)}`);
  t.deepEqual(getResolveStageSetting(context, 'convertStreamNameToStage'), convertStreamNameToStageExpected, `convertStreamNameToStage (${stringify(convertStreamNameToStageAfter)}) must be ${stringify(convertStreamNameToStageExpected)}`);
  t.equal(getResolveStageSetting(context, 'streamNameStageSeparator'), streamNameStageSeparatorExpected, `streamNameStageSeparator (${stringify(streamNameStageSeparatorAfter)}) must be ${stringify(streamNameStageSeparatorExpected)}`);
  t.equal(getResolveStageSetting(context, 'defaultStage'), defaultStageExpected, `defaultStage (${stringify(defaultStageAfter)}) must be ${stringify(defaultStageExpected)}`);
  t.equal(getResolveStageSetting(context, 'inCase'), inCaseExpected, `inCase (${stringify(inCaseAfter)}) must be ${stringify(inCaseExpected)}`);

  // Check whether resolve stage works with this configuration
  const expected = toCase(trimOrEmpty(defaultStageExpected), inCaseExpected);
  checkResolveStage('', '', '', '', context, expected, t);
}

// =====================================================================================================================
// Tests for configureResolveStage and isResolveStageConfigured
// =====================================================================================================================

test('configureResolveStage with all undefined', t => {
  const context = {};
  t.notOk(isResolveStageConfigured(context), `resolve stage settings must not be configured yet`);

  // Configure it
  checkConfigureResolveStage(context, undefined, undefined, undefined, undefined, undefined, false, t);

  // Must NOT be able to reconfigure it with force false
  checkConfigureResolveStage(context, 'convertAliasToStage', 'convertStreamNameToStage', 'streamNameStageSeparator', 'defaultStage',
    'inCase', false, t);

  // Must be able to reconfigure it with force true
  checkConfigureResolveStage(context, 'convertAliasToStage', 'convertStreamNameToStage', 'streamNameStageSeparator', 'defaultStage',
    'inCase', true, t);

  t.end();
});


// =====================================================================================================================
// Tests for configureResolveStageWithDefaults and isResolveStageConfigured
// =====================================================================================================================

test('configureResolveStageWithDefaults with all undefined', t => {
  const context = {};
  t.notOk(isResolveStageConfigured(context), `resolve stage settings must not be configured yet`);

  // Configure it
  checkConfigureResolveStageWithDefaults(context, false, t);

  // Overwrite it with arbitrary values to be able to check if defaults are NOT re-instated in next step
  configureResolveStage(context, 'convertAliasToStage', 'convertStreamNameToStage', 'streamNameStageSeparator',
    'defaultStage', 'inCase', true);

  // Must NOT be able to reconfigure it with force false
  checkConfigureResolveStageWithDefaults(context, false, t);

  // Must be able to reconfigure it with force true
  checkConfigureResolveStageWithDefaults(context, true, t);

  t.end();
});


// =====================================================================================================================
// Tests for convertAliasToStage
// =====================================================================================================================

test('convertAliasToStage', t => {
  checkConvertAliasToStage(undefined, '', t);
  checkConvertAliasToStage(null, '', t);
  checkConvertAliasToStage('', '', t);
  checkConvertAliasToStage('DEV', 'DEV', t);
  checkConvertAliasToStage('prod', 'prod', t);
  checkConvertAliasToStage('Prod', 'Prod', t);
  checkConvertAliasToStage('  QA  ', 'QA', t);
  checkConvertAliasToStage(' PROD 2016-10-19 ', 'PROD 2016-10-19', t);
  t.end();
});

// =====================================================================================================================
// Tests for convertStreamNameSuffixToStage
// =====================================================================================================================

test('convertStreamNameSuffixToStage with default settings, should use default "_" as separator', t => {
  const context = configureResolveStageWithDefaults({});
  checkConvertStreamNameSuffixToStage(undefined, context, '', t);
  checkConvertStreamNameSuffixToStage(null, context, '', t);
  checkConvertStreamNameSuffixToStage('', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream1', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream2_', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream3_Dev', context, 'Dev', t);
  checkConvertStreamNameSuffixToStage('Stream4_QA', context, 'QA', t);
  checkConvertStreamNameSuffixToStage('Stream_5_qa', context, 'qa', t);
  checkConvertStreamNameSuffixToStage('Test_Stream_6_Prod', context, 'Prod', t);
  checkConvertStreamNameSuffixToStage(' Test_Stream_7_Prod-01 ', context, 'Prod-01', t);

  checkConvertStreamNameSuffixToStage('Stream_SS', context, 'SS', t);
  t.end();
});

test('convertStreamNameSuffixToStage with streamNameStageSeparator set to undefined, should use default "_" as separator', t => {
  const context = configureResolveStageWithDefaults({});
  context.resolveStageConfig.streamNameStageSeparator = undefined;
  checkConvertStreamNameSuffixToStage(undefined, context, '', t);
  checkConvertStreamNameSuffixToStage(null, context, '', t);
  checkConvertStreamNameSuffixToStage('', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream1', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream2_', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream3_Dev', context, 'Dev', t);
  checkConvertStreamNameSuffixToStage('Stream4_QA', context, 'QA', t);
  checkConvertStreamNameSuffixToStage('Stream_5_qa', context, 'qa', t);
  checkConvertStreamNameSuffixToStage('Test_Stream_6_Prod', context, 'Prod', t);
  checkConvertStreamNameSuffixToStage(' Test_Stream_7_Prod-01 ', context, 'Prod-01', t);

  checkConvertStreamNameSuffixToStage('Stream_SS', context, 'SS', t);
  t.end();
});

test('convertStreamNameSuffixToStage with streamNameStageSeparator set to "", should still use default "_" as separator', t => {
  const context = configureResolveStageWithDefaults({});
  context.resolveStageConfig.streamNameStageSeparator = '';

  checkConvertStreamNameSuffixToStage(undefined, context, '', t);
  checkConvertStreamNameSuffixToStage(null, context, '', t);
  checkConvertStreamNameSuffixToStage('', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream1', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream2_', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream3_Dev', context, 'Dev', t);
  checkConvertStreamNameSuffixToStage('Stream4_QA', context, 'QA', t);
  checkConvertStreamNameSuffixToStage('Stream_5_qa', context, 'qa', t);
  checkConvertStreamNameSuffixToStage('Test_Stream_6_Prod', context, 'Prod', t);
  checkConvertStreamNameSuffixToStage(' Test_Stream_7_Prod-01 ', context, 'Prod-01', t);

  t.end();
});

test('convertStreamNameSuffixToStage with context.streamNameStageSeparator set to "-", should NOT use default "_" as separator', t => {
  const context = configureResolveStageWithDefaults({});
  context.resolveStageConfig.streamNameStageSeparator = '-';

  checkConvertStreamNameSuffixToStage(undefined, context, '', t);
  checkConvertStreamNameSuffixToStage(null, context, '', t);
  checkConvertStreamNameSuffixToStage('', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream1', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream2_', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream3_Dev', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream3_QA', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream_3_qa', context, '', t);
  checkConvertStreamNameSuffixToStage('Test_Stream3_Prod', context, '', t);
  checkConvertStreamNameSuffixToStage(' Test_Stream3_Prod_01 ', context, '', t);

  checkConvertStreamNameSuffixToStage('Stream_2-', context, '', t);
  checkConvertStreamNameSuffixToStage('Stream_3-Dev', context, 'Dev', t);
  checkConvertStreamNameSuffixToStage('Stream_3-QA', context, 'QA', t);
  checkConvertStreamNameSuffixToStage('Stream_3-qa', context, 'qa', t);
  checkConvertStreamNameSuffixToStage('Test_Stream3-Prod', context, 'Prod', t);
  checkConvertStreamNameSuffixToStage(' Test_Stream3-Prod_01 ', context, 'Prod_01', t);

  t.end();
});

// =====================================================================================================================
// Tests for resolveStage
// =====================================================================================================================

test('resolveStage with undefined/null/empty alias, stream name & context must return empty', t => {
  const context = {};

  checkResolveStage(undefined, undefined, undefined, undefined, context, '', t);
  checkResolveStage(null, null, null, null, context, '', t);
  checkResolveStage('', '', '', '', context, '', t);

  t.end();
});

test('resolveStage with no defaultStage', t => {
  const context = configureResolveStageWithDefaults({});
  context.resolveStageConfig.inCase = '';

  // No default stage and nothing else
  checkResolveStage('', '', '', '', context, '', t);
  // No default stage and stream without suffix must be empty
  checkResolveStage('', '', '', 'Stream', context, '', t);
  // No default stage and stream with suffix must use suffix
  checkResolveStage('', '', '', 'Stream_SS', context, 'SS', t);
  // No default stage and Lambda without alias must be empty
  checkResolveStage('', '1.0.1', '1.0.1', '', context, '', t);
  // No default stage and Lambda with alias must use alias stage
  checkResolveStage('', '1.0.1', 'AS', '', context, 'AS', t);
  // No default stage and event with stage must use event stage
  checkResolveStage('ES', '', '', '', context, 'ES', t);

  t.end();
});


test('resolveStage with defaultStage', t => {
  const context = configureResolveStageWithDefaults({});
  context.resolveStageConfig.inCase = '';
  context.resolveStageConfig.defaultStage = 'DS';

  // Default stage and nothing else must be default stage
  checkResolveStage('', '', '', '', context, 'DS', t);
  // Default stage must override stream without suffix
  checkResolveStage('', '', '', 'Stream', context, 'DS', t);
  // Default stage must not override stream with suffix
  checkResolveStage('', '', '', 'Stream_SS', context, 'SS', t);
  // Default stage must override Lambda without alias
  checkResolveStage('', '1.0.1', '1.0.1', '', context, 'DS', t);
  // Default stage must not override Lambda with alias
  checkResolveStage('', '1.0.1', 'AS', '', context, 'AS', t);
  // Default stage must not override event stage
  checkResolveStage('ES', '', '', '', context, 'ES', t);

  t.end();
});

test('resolveStage with stream without suffix', t => {
  const context = configureResolveStageWithDefaults({});
  context.resolveStageConfig.defaultStage = 'DS';
  context.resolveStageConfig.inCase = '';

  // Stream without suffix must not override default stage
  checkResolveStage('', '', '', 'Stream', context, 'DS', t);
  // Stream without suffix must not override default stage when Lambda without alias
  checkResolveStage('', '1.0.1', '1.0.1', 'Stream', context, 'DS', t);
  // Stream without suffix must not override Lambda with alias
  checkResolveStage('', '1.0.1', 'AS', 'Stream', context, 'AS', t);
  // Stream without suffix must not override event stage
  checkResolveStage('ES', '', '', 'Stream', context, 'ES', t);

  t.end();
});

test('resolveStage with stream with suffix', t => {
  const context = configureResolveStageWithDefaults({});
  context.resolveStageConfig.defaultStage = 'DS';
  context.resolveStageConfig.inCase = '';

  // Stream with suffix must override default stage
  checkResolveStage('', '', '', 'Stream_SS', context, 'SS', t);
  // Stream with suffix must override default stage when Lambda without alias
  checkResolveStage('', '1.0.1', '1.0.1', 'Stream_SS', context, 'SS', t);
  // Stream with suffix must not override Lambda with alias
  checkResolveStage('', '1.0.1', 'AS', 'Stream_SS', context, 'AS', t);
  // Stream with suffix must not override event stage
  checkResolveStage('ES', '', '', 'Stream_SS', context, 'ES', t);

  t.end();
});


test('resolveStage with Lambda without alias', t => {
  const context = configureResolveStageWithDefaults({});
  context.resolveStageConfig.defaultStage = 'DS';
  context.resolveStageConfig.inCase = '';

  // Lambda without alias must not override default stage
  checkResolveStage('', '1.0.1', '1.0.1', '', context, 'DS', t);
  // Lambda without alias must not override default stage when stream without suffix
  checkResolveStage('', '1.0.1', '1.0.1', 'Stream', context, 'DS', t);
  // Lambda without alias must not override stream with suffix
  checkResolveStage('', '1.0.1', '1.0.1', 'Stream_SS', context, 'SS', t);
  // Lambda without alias must not override event stage
  checkResolveStage('ES', '1.0.1', '1.0.1', 'Stream_SS', context, 'ES', t);

  t.end();
});

test('resolveStage with Lambda with alias', t => {
  const context = configureResolveStageWithDefaults({});
  context.resolveStageConfig.defaultStage = 'DS';
  context.resolveStageConfig.inCase = '';

  // Lambda with alias must override default stage
  checkResolveStage('', '1.0.1', 'AS', '', context, 'AS', t);
  // Lambda with alias must override default stage when stream without suffix
  checkResolveStage('', '1.0.1', 'AS', 'Stream', context, 'AS', t);
  // Lambda with alias must override stream with suffix
  checkResolveStage('', '1.0.1', 'AS', 'Stream_SS', context, 'AS', t);
  // Lambda with alias must not override event stage
  checkResolveStage('ES', '1.0.1', 'AS', 'Stream_SS', context, 'ES', t);

  t.end();
});

test('resolveStage with event stage', t => {
  const context = configureResolveStageWithDefaults({});
  context.resolveStageConfig.defaultStage = 'DS';
  context.resolveStageConfig.inCase = '';

  // Event stage must override default stage
  checkResolveStage('ES', '', '', '', context, 'ES', t);
  // Event stage must override stream without suffix and default
  checkResolveStage('ES', '', '', 'Stream', context, 'ES', t);
  // Event stage must override stream with suffix and default
  checkResolveStage('ES', '', '', 'Stream_SS', context, 'ES', t);

  // Event stage must override Lambda without alias and default
  checkResolveStage('ES', '1.0.1', '1.01', '', context, 'ES', t);
  // Event stage must override Lambda without alias and stream without suffix and default
  checkResolveStage('ES', '1.0.1', '1.01', 'Stream', context, 'ES', t);
  // Event stage must override Lambda without alias and stream with suffix and default
  checkResolveStage('ES', '1.0.1', '1.01', 'Stream_SS', context, 'ES', t);

  // Event stage must override Lambda with alias and default
  checkResolveStage('ES', '1.0.1', 'AS', '', context, 'ES', t);
  // Event stage must override Lambda with alias and stream without suffix and default
  checkResolveStage('ES', '1.0.1', 'AS', 'Stream', context, 'ES', t);
  // Event stage must override Lambda with alias and stream with suffix and default
  checkResolveStage('ES', '1.0.1', 'AS', 'Stream_SS', context, 'ES', t);

  t.end();
});


test('resolveStage with context stage and without event stage', t => {
  const context = configureResolveStageWithDefaults({});
  context.resolveStageConfig.defaultStage = 'DS';
  context.resolveStageConfig.inCase = '';

  context.stage = 'CS';

  // Context stage must override default stage
  checkResolveStage('', '', '', '', context, 'CS', t);

  // Context stage must override stream without suffix and default
  checkResolveStage('', '', '', 'Stream', context, 'CS', t);
  // Context stage must override stream with suffix and default
  checkResolveStage('', '', '', 'Stream_SS', context, 'CS', t);

  // Context stage must override Lambda without alias and default
  checkResolveStage('', '1.0.1', '1.01', '', context, 'CS', t);
  // Context stage must override Lambda without alias and stream without suffix and default
  checkResolveStage('', '1.0.1', '1.01', 'Stream', context, 'CS', t);
  // Context stage must override Lambda without alias and stream with suffix and default
  checkResolveStage('', '1.0.1', '1.01', 'Stream_SS', context, 'CS', t);

  // Context stage must override Lambda with alias and default
  checkResolveStage('', '1.0.1', 'AS', '', context, 'CS', t);
  // Context stage must override Lambda with alias and stream without suffix and default
  checkResolveStage('', '1.0.1', 'AS', 'Stream', context, 'CS', t);
  // Context stage must override Lambda with alias and stream with suffix and default
  checkResolveStage('', '1.0.1', 'AS', 'Stream_SS', context, 'CS', t);

  t.end();
});

test('resolveStage with context stage and with event stage', t => {
  const context = configureResolveStageWithDefaults({});
  context.resolveStageConfig.defaultStage = 'DS';
  context.resolveStageConfig.inCase = '';

  context.stage = 'CS';

  // Context stage must override default stage
  checkResolveStage('ES', '', '', '', context, 'CS', t);
  // Context stage must override stream without suffix and default
  checkResolveStage('ES', '', '', 'Stream', context, 'CS', t);
  // Context stage must override stream with suffix and default
  checkResolveStage('ES', '', '', 'Stream_SS', context, 'CS', t);

  // Context stage must override event stage and Lambda without alias and default
  checkResolveStage('ES', '1.0.1', '1.01', '', context, 'CS', t);
  // Context stage must override event stage and Lambda without alias and stream without suffix and default
  checkResolveStage('ES', '1.0.1', '1.01', 'Stream', context, 'CS', t);
  // Context stage must override event stage and Lambda without alias and stream with suffix and default
  checkResolveStage('ES', '1.0.1', '1.01', 'Stream_SS', context, 'CS', t);

  // Context stage must override event stage and Lambda with alias and default
  checkResolveStage('ES', '1.0.1', 'AS', '', context, 'CS', t);
  // Context stage must override event stage and Lambda with alias and stream without suffix and default
  checkResolveStage('ES', '1.0.1', 'AS', 'Stream', context, 'CS', t);
  // Context stage must override event stage and Lambda with alias and stream with suffix and default
  checkResolveStage('ES', '1.0.1', 'AS', 'Stream_SS', context, 'CS', t);

  t.end();
});
