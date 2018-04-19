'use strict';

const test = require('tape');

const awsRegion = 'us-west-1';

// Test subject
const contexts = require('../contexts');

const logging = require('logging-utils');
const LogLevel = logging.LogLevel;

const strings = require('core-functions/strings');
const stringify = strings.stringify;

const regions = require("../regions");
const kinesisCache = require("../kinesis-cache");
const dynamoDBDocClientCache = require("../dynamodb-doc-client-cache");

const samples = require('./samples');

function funcFactory(t, src) {
  function func(x) {
    t.equal(src, x, `called func ${src} must be ${x}`);
    t.pass(`${src} func(${x}) called`)
  }

  return func;
}

const standardOptions = require('./contexts-standard-options-legacy.json');

const standardSettings = {
  loggingSettings: {
    logLevel: "error",
    useLevelPrefixes: false,
    useConsoleTrace: true
  },
  stageHandlingSettings: {
    streamNameStageSeparator: "-",
    resourceNameStageSeparator: "-",
    extractInCase: "upper",
    injectInCase: "lower"
  },
  customSettings: {
    myCustomSetting1: "myCustomSetting1",
    myCustomSetting3: "myCustomSetting3"
  },
  kinesisOptions: {
    maxRetries: 1
  },
  dynamoDBDocClientOptions: {
    maxRetries: 2
  }
};

function sampleAwsEvent(streamName, partitionKey, data, omitEventSourceARN) {
  const region = process.env.AWS_REGION;
  const eventSourceArn = omitEventSourceARN ? undefined : samples.sampleKinesisEventSourceArn(region, streamName);
  return samples.sampleKinesisEventWithSampleRecord(undefined, undefined, partitionKey, data, eventSourceArn, region);
}

function sampleAwsContext(functionVersion, functionAlias) {
  const region = process.env.AWS_REGION;
  const functionName = 'sample-function-name';
  const invokedFunctionArn = samples.sampleInvokedFunctionArn(region, functionName, functionAlias);
  return samples.sampleAwsContext(functionName, functionVersion, invokedFunctionArn);
}

function setRegionStageAndDeleteCachedInstances(region, stage) {
  // Set up region
  if (region)
    process.env.AWS_REGION = region;
  else
    delete process.env.AWS_REGION;

  // Set up stage
  if (stage)
    process.env.STAGE = stage;
  else
    delete process.env.STAGE;

  // Remove any cached entries before configuring
  deleteCachedInstances();
  return region;
}

function deleteCachedInstances() {
  const region = regions.getRegion();
  kinesisCache.deleteKinesis(region);
  dynamoDBDocClientCache.deleteDynamoDBDocClient(region);
}

// -------------------------------------------------------------------------------------------------------------------
// configureCustomSettings without settings or options
// -------------------------------------------------------------------------------------------------------------------
test('configureCustomSettings without settings or options', t => {
  let context = {};

  contexts.configureCustomSettings(context, undefined, undefined);

  t.ok(context.custom, 'context.custom must be defined');
  t.deepEqual(context.custom, {}, 'context.custom must be empty object');

  t.end();
});

// -------------------------------------------------------------------------------------------------------------------
// configureCustomSettings with only options
// -------------------------------------------------------------------------------------------------------------------
test('configureCustomSettings with only options', t => {

  const context = {};
  const options = {
    setting1: "option setting1",
    setting2: {a: 1, b: '2', c: "C"},
    optionOnly: 'option only'
  };

  contexts.configureCustomSettings(context, undefined, options);

  t.ok(context.custom, 'context.custom must be defined');
  t.deepEqual(context.custom, options, 'context.custom must be deep equal to only options');

  t.end();
});

// -------------------------------------------------------------------------------------------------------------------
// configureCustomSettings with only settings
// -------------------------------------------------------------------------------------------------------------------
test('configureCustomSettings with only settings', t => {

  const context = {}; // reset the context
  const func1a = funcFactory(t, 'setting func1a');
  const func2Only = funcFactory(t, 'setting func2Only');
  const settings = {
    setting1: "setting setting1",
    setting2: {a: 3, b: '4', d: "D"},
    func1: func1a,
    func2Only: func2Only,
    settingOnly: 'setting only',
  };

  contexts.configureCustomSettings(context, settings, undefined);

  t.ok(context.custom, 'context.custom must be defined');
  t.deepEqual(context.custom, settings, 'context.custom must be deep equal to only settings');

  context.custom.func1('setting func1a');
  context.custom.func2Only('setting func2Only');

  t.end();
});


// -------------------------------------------------------------------------------------------------------------------
// configureCustomSettings with both settings and options
// -------------------------------------------------------------------------------------------------------------------
test('configureCustomSettings with both settings and options', t => {
  const context = {};
  const func1a = funcFactory(t, 'setting func1a');
  const func2Only = funcFactory(t, 'setting func2Only');
  const settings = {
    setting1: "setting setting1",
    setting2: {a: 3, b: '4', d: "D"},
    func1: func1a,
    func2Only: func2Only,
    settingOnly: 'setting only',
  };
  const options = {
    setting1: "option setting1",
    setting2: {a: 1, b: '2', c: "C"},
    optionOnly: 'option only'
  };

  const x = {
    setting1: "setting setting1",
    setting2: {a: 3, b: '4', d: "D"},
    func1: func1a,
    func2Only: func2Only,
    settingOnly: 'setting only',
    optionOnly: 'option only'
  };

  contexts.configureCustomSettings(context, settings, options);

  t.ok(context.custom, 'context.custom must be defined');
  t.deepEqual(context.custom, x, `context.custom must be deep equal to ${stringify(x)}`);

  context.custom.func1('setting func1a');
  context.custom.func2Only('setting func2Only');

  t.end();
});

// -------------------------------------------------------------------------------------------------------------------
// configureCustomSettings when existing context.custom settings
// -------------------------------------------------------------------------------------------------------------------
test('configureCustomSettings when existing context.custom settings', t => {
  // Pre-configure the context
  const func1a = funcFactory(t, 'setting func1a');
  const func2Only = funcFactory(t, 'setting func2Only');
  const settings = {
    setting1: "setting setting1",
    setting2: {a: 3, b: '4', d: "D"},
    func1: func1a,
    func2Only: func2Only,
    settingOnly: 'setting only',
  };
  const options = {
    setting1: "option setting1",
    setting2: {a: 1, b: '2', c: "C"},
    optionOnly: 'option only'
  };
  const func1b = funcFactory(t, 'context.custom func1b');
  const func3Only = funcFactory(t, 'context.custom func3Only');
  const context = {
    custom: {
      setting1: "context.custom setting1",
      setting2: {a: 5, b: '6', e: "E"},
      func1: func1b,
      func3Only: func3Only,
      contextCustomOnly: 'context.custom only'
    }
  };

  const x = {
    setting1: "context.custom setting1",
    setting2: {a: 5, b: '6', e: "E"},
    func1: func1b,
    func2Only: func2Only,
    func3Only: func3Only,
    contextCustomOnly: 'context.custom only',
    settingOnly: 'setting only',
    optionOnly: 'option only'
  };

  contexts.configureCustomSettings(context, settings, options);

  t.ok(context.custom, 'context.custom must be defined');
  t.deepEqual(context.custom, x, `context.custom ${stringify(context.custom)} must be deep equal to ${stringify(x)}`);

  context.custom.func1('context.custom func1b');
  context.custom.func2Only('setting func2Only');
  context.custom.func3Only('context.custom func3Only');

  t.end();
});


// -------------------------------------------------------------------------------------------------------------------
// configureStandardContext without settings, options, event or awsContext
// -------------------------------------------------------------------------------------------------------------------
test('configureStandardContext without settings, options, event or awsContext', t => {
  let context = {};

  regions.setRegion(awsRegion);
  contexts.configureStandardContext(context, undefined, undefined, undefined, undefined, false);

  t.ok(context.stageHandling, 'context.stageHandling must be defined');
  t.equal(context.logLevel, LogLevel.INFO, `context.logLevel must be "${LogLevel.INFO}"`);
  t.ok(typeof context.error === 'function', 'context.error must be defined');
  t.ok(typeof context.warn === 'function', 'context.warn must be defined');
  t.ok(typeof context.info === 'function', 'context.info must be defined');
  t.ok(typeof context.debug === 'function', 'context.debug must be defined');
  t.ok(typeof context.trace === 'function', 'context.trace must be defined');
  t.ok(context.custom, 'context.custom must be defined');
  t.deepEqual(context.custom, {}, 'context.custom must be empty object');
  t.notOk(context.kinesis, 'context.kinesis must not be defined');
  t.notOk(context.dynamoDBDocClient, 'context.dynamoDBDocClient must not be defined');
  t.equal(context.region, awsRegion, `context.region must be ${awsRegion}`);
  t.notOk(context.stage, 'context.stage must not be defined');
  t.notOk(context.event, 'context.event must not be defined');
  t.notOk(context.awsContext, 'context.awsContext must not be defined');
  t.notOk(context.invokedLambda, 'context.invokedLambda must not be defined');

  t.end();
});

// -------------------------------------------------------------------------------------------------------------------
// configureStandardContext with options only
// -------------------------------------------------------------------------------------------------------------------
test('configureStandardContext with options only', t => {
  let context = {};

  regions.setRegion(awsRegion);
  contexts.configureStandardContext(context, undefined, standardOptions, undefined, undefined, false);

  t.ok(context.stageHandling, 'context.stageHandling must be defined');
  t.equal(context.logLevel, LogLevel.TRACE, `context.logLevel must be "${LogLevel.TRACE}"`);
  t.ok(typeof context.error === 'function', 'context.error must be defined');
  t.ok(typeof context.warn === 'function', 'context.warn must be defined');
  t.ok(typeof context.info === 'function', 'context.info must be defined');
  t.ok(typeof context.debug === 'function', 'context.debug must be defined');
  t.ok(typeof context.trace === 'function', 'context.trace must be defined');
  t.ok(context.custom, 'context.custom must be defined');
  t.ok(context.custom.myCustomSetting1, 'context.custom.myCustomSetting1 must be defined');
  t.equal(context.custom.myCustomSetting1, 'myCustomOption1', 'context.custom.myCustomSetting1 must be myCustomOption1');
  t.ok(context.custom.myCustomSetting2, 'context.custom.myCustomSetting2 must be defined');
  t.equal(context.custom.myCustomSetting2, 'myCustomOption2', 'context.custom.myCustomSetting2 must be myCustomOption2');
  t.ok(context.kinesis, 'context.kinesis must be defined');
  t.ok(context.dynamoDBDocClient, 'context.dynamoDBDocClient must be defined');
  t.equal(context.region, awsRegion, `context.region must not be ${awsRegion}`);
  t.notOk(context.stage, 'context.stage must not be defined');
  t.notOk(context.event, 'context.event must not be defined');
  t.notOk(context.awsContext, 'context.awsContext must not be defined');
  t.notOk(context.invokedLambda, 'context.invokedLambda must not be defined');

  t.end();
});

// -------------------------------------------------------------------------------------------------------------------
// configureStandardContext with settings only
// -------------------------------------------------------------------------------------------------------------------
test('configureStandardContext with settings only', t => {
  let context = {};

  regions.setRegion(awsRegion);
  contexts.configureStandardContext(context, standardSettings, undefined, undefined, undefined, false);

  t.ok(context.stageHandling, 'context.stageHandling must be defined');
  t.equal(context.stageHandling.streamNameStageSeparator, '-', 'context.stageHandling must be "-"');
  t.equal(context.logLevel, LogLevel.ERROR, `context.logLevel must be "${LogLevel.ERROR}"`);
  t.ok(typeof context.error === 'function', 'context.error must be defined');
  t.ok(typeof context.warn === 'function', 'context.warn must be defined');
  t.ok(typeof context.info === 'function', 'context.info must be defined');
  t.ok(typeof context.debug === 'function', 'context.debug must be defined');
  t.ok(typeof context.trace === 'function', 'context.trace must be defined');
  t.ok(context.custom, 'context.custom must be defined');
  t.ok(context.custom.myCustomSetting1, 'context.custom.myCustomSetting1 must be defined');
  t.equal(context.custom.myCustomSetting1, 'myCustomSetting1', 'context.custom.myCustomSetting1 must be myCustomOption1');
  t.notOk(context.custom.myCustomSetting2, 'context.custom.myCustomSetting2 must not be defined');
  //t.equal(context.custom.myCustomSetting2, 'myCustomOption2', 'context.custom.myCustomSetting2 must be myCustomOption2');
  t.ok(context.custom.myCustomSetting3, 'context.custom.myCustomSetting3 must be defined');
  t.equal(context.custom.myCustomSetting3, 'myCustomSetting3', 'context.custom.myCustomSetting3 must be myCustomSetting3');
  t.ok(context.kinesis, 'context.kinesis must be defined');
  t.ok(context.dynamoDBDocClient, 'context.dynamoDBDocClient must be defined');
  t.equal(context.region, awsRegion, `context.region must not be ${awsRegion}`);
  t.notOk(context.stage, 'context.stage must not be defined');
  t.notOk(context.event, 'context.event must not be defined');
  t.notOk(context.awsContext, 'context.awsContext must not be defined');
  t.notOk(context.invokedLambda, 'context.invokedLambda must not be defined');

  t.end();
});

// -------------------------------------------------------------------------------------------------------------------
// configureStandardContext with settings and options only
// -------------------------------------------------------------------------------------------------------------------
test('configureStandardContext with settings and options only', t => {
  let context = {};

  regions.setRegion(awsRegion);
  contexts.configureStandardContext(context, standardSettings, standardOptions, undefined, undefined, false);

  t.ok(context.stageHandling, 'context.stageHandling must be defined');
  t.equal(context.stageHandling.streamNameStageSeparator, '-', 'context.stageHandling must be "-"');
  t.equal(context.logLevel, LogLevel.ERROR, `context.logLevel must be "${LogLevel.ERROR}"`);
  t.ok(typeof context.error === 'function', 'context.error must be defined');
  t.ok(typeof context.warn === 'function', 'context.warn must be defined');
  t.ok(typeof context.info === 'function', 'context.info must be defined');
  t.ok(typeof context.debug === 'function', 'context.debug must be defined');
  t.ok(typeof context.trace === 'function', 'context.trace must be defined');
  t.ok(context.custom, 'context.custom must be defined');
  t.ok(context.custom.myCustomSetting1, 'context.custom.myCustomSetting1 must be defined');
  t.equal(context.custom.myCustomSetting1, 'myCustomSetting1', 'context.custom.myCustomSetting1 must be myCustomOption1');
  t.ok(context.custom.myCustomSetting2, 'context.custom.myCustomSetting2 must be defined');
  t.equal(context.custom.myCustomSetting2, 'myCustomOption2', 'context.custom.myCustomSetting2 must be myCustomOption2');
  t.ok(context.custom.myCustomSetting3, 'context.custom.myCustomSetting3 must be defined');
  t.equal(context.custom.myCustomSetting3, 'myCustomSetting3', 'context.custom.myCustomSetting3 must be myCustomSetting3');
  t.ok(context.kinesis, 'context.kinesis must be defined');
  t.ok(context.dynamoDBDocClient, 'context.dynamoDBDocClient must be defined');
  t.equal(context.region, awsRegion, `context.region must not be ${awsRegion}`);
  t.notOk(context.stage, 'context.stage must not be defined');
  t.notOk(context.event, 'context.event must not be defined');
  t.notOk(context.awsContext, 'context.awsContext must not be defined');
  t.notOk(context.invokedLambda, 'context.invokedLambda must not be defined');

  t.end();
});

// -------------------------------------------------------------------------------------------------------------------
// configureStandardContext with settings, options, event & awsContext
// -------------------------------------------------------------------------------------------------------------------
test('configureStandardContext with settings, options, event & awsContext', t => {
  try {
    setRegionStageAndDeleteCachedInstances('us-west-1', "dev99");
    const expectedStage = 'DEV99';

    let context = {};

    // Generate a sample AWS event
    const event = sampleAwsEvent('TestStream_DEV2', 'partitionKey', '', false);

    // Generate a sample AWS context
    const awsContext = sampleAwsContext('1.0.1', 'dev1');

    const functionName = 'sample-function-name';
    const invoked = `${functionName}:dev1`;
    const invokedLambda = {functionName: functionName, version: '1.0.1', alias: 'dev1', invoked: invoked};

    contexts.configureStandardContext(context, standardSettings, standardOptions, event, awsContext, false);

    t.ok(context.stageHandling, 'context.stageHandling must be defined');
    t.equal(context.stageHandling.streamNameStageSeparator, '-', 'context.stageHandling must be "-"');
    t.equal(context.logLevel, LogLevel.ERROR, `context.logLevel must be "${LogLevel.ERROR}"`);
    t.ok(typeof context.error === 'function', 'context.error must be defined');
    t.ok(typeof context.warn === 'function', 'context.warn must be defined');
    t.ok(typeof context.info === 'function', 'context.info must be defined');
    t.ok(typeof context.debug === 'function', 'context.debug must be defined');
    t.ok(typeof context.trace === 'function', 'context.trace must be defined');
    t.ok(context.custom, 'context.custom must be defined');
    t.ok(context.custom.myCustomSetting1, 'context.custom.myCustomSetting1 must be defined');
    t.equal(context.custom.myCustomSetting1, 'myCustomSetting1', 'context.custom.myCustomSetting1 must be myCustomSetting1');
    t.ok(context.custom.myCustomSetting2, 'context.custom.myCustomSetting2 must be defined');
    t.equal(context.custom.myCustomSetting2, 'myCustomOption2', 'context.custom.myCustomSetting2 must be myCustomOption2');
    t.ok(context.custom.myCustomSetting3, 'context.custom.myCustomSetting3 must be defined');
    t.equal(context.custom.myCustomSetting3, 'myCustomSetting3', 'context.custom.myCustomSetting3 must be myCustomSetting3');
    t.ok(context.kinesis, 'context.kinesis must be defined');
    t.ok(context.dynamoDBDocClient, 'context.dynamoDBDocClient must be defined');

    t.ok(context.region, 'context.region must be defined');
    t.equal(context.region, 'us-west-1', 'context.region must be us-west-1');

    t.ok(context.event, 'context.event must be defined');
    t.equal(context.event, event, 'context.event must be event');
    t.ok(context.awsContext, 'context.awsContext must be defined');
    t.equal(context.awsContext, awsContext, 'context.awsContext must be awsContext');

    t.ok(context.invokedLambda, 'context.invokedLambda must be defined');
    t.deepEqual(context.invokedLambda, invokedLambda, `context.invokedLambda must be ${JSON.stringify(invokedLambda)}`);
    t.ok(context.invokedLambda.invoked, 'context.invokedLambda.invoked must be defined');
    t.equal(context.invokedLambda.invoked, invoked, `context.invokedLambda.invoked must be ${JSON.stringify(invoked)}`);

    t.ok(context.stage, 'context.stage must be defined');
    t.equal(context.stage, expectedStage, `context.stage must be ${expectedStage}`);

  } finally {
    process.env.AWS_REGION = undefined;
    process.env.STAGE = undefined;
  }

  t.end();
});

// =====================================================================================================================
// configureEventAwsContextAndStage
// =====================================================================================================================
test('configureEventAwsContextAndStage', t => {
  try {
    setRegionStageAndDeleteCachedInstances('us-west-1', "dev99");
    const expectedStage = 'DEV99';

    let context = {};

    // Generate a sample AWS event
    const event = sampleAwsEvent('TestStream_DEV2', 'partitionKey', '', false);

    // Generate a sample AWS context
    const functionAlias = 'dev1';
    const awsContext = sampleAwsContext('1.0.1', functionAlias);

    const functionName = 'my-test-function';
    process.env.AWS_LAMBDA_FUNCTION_NAME = functionName;

    const functionVersion = '1.0.23';
    process.env.AWS_LAMBDA_FUNCTION_VERSION = functionVersion;

    const invoked = 'sample-function-name:dev1';
    const invokedLambda = {functionName: functionName, version: functionVersion, alias: 'dev1', invoked: invoked};

    // Initial configuration WITHOUT event & AWS context
    contexts.configureStandardContext(context, standardSettings, standardOptions, undefined, undefined, false);

    t.notOk(context.event, 'context.event must not be defined');
    t.notOk(context.awsContext, 'context.awsContext must not be defined');
    t.notOk(context.invokedLambda, 'context.invokedLambda must not be defined');
    t.notOk(context.stage, 'context.stage must not be defined');

    // Complete configuration (later)
    contexts.configureEventAwsContextAndStage(context, event, awsContext);

    t.ok(context.event, 'context.event must be defined');
    t.equal(context.event, event, 'context.event must be event');
    t.ok(context.awsContext, 'context.awsContext must be defined');
    t.equal(context.awsContext, awsContext, 'context.awsContext must be awsContext');

    t.ok(context.invokedLambda, 'context.invokedLambda must be defined');
    t.deepEqual(context.invokedLambda, invokedLambda, `context.invokedLambda must be ${JSON.stringify(invokedLambda)}`);
    t.ok(context.invokedLambda.invoked, 'context.invokedLambda.invoked must be defined');
    t.equal(context.invokedLambda.invoked, invoked, `context.invokedLambda.invoked must be ${JSON.stringify(invoked)}`);

    t.equal(context.stage, expectedStage, `context.stage must be ${expectedStage}`);

  } finally {
    process.env.AWS_REGION = undefined;
    process.env.STAGE = undefined;
  }

  t.end();
});