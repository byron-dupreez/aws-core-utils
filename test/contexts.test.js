'use strict';

const test = require('tape');

// Test subject
const contexts = require('../contexts');
const configureStandardContext = contexts.configureStandardContext;
const configureCustomSettings = contexts.configureCustomSettings;

const strings = require('core-functions/strings');
const stringify = strings.stringify;

function funcFactory(t, src) {
  function func(x) {
    t.equal(src, x, `called func ${src} must be ${x}`);
    t.pass(`${src} func(${x}) called`)
  }

  return func;
}

const standardOptions = require('./std-options.json');

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

// -------------------------------------------------------------------------------------------------------------------
// configureCustomSettings without settings or options
// -------------------------------------------------------------------------------------------------------------------
test('configureCustomSettings without settings or options', t => {
  let context = {};

  configureCustomSettings(context, undefined, undefined);

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

  configureCustomSettings(context, undefined, options);

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

  configureCustomSettings(context, settings, undefined);

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

  configureCustomSettings(context, settings, options);

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

  configureCustomSettings(context, settings, options);

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

  configureStandardContext(context, undefined, undefined, undefined, undefined, false);

  t.ok(context.stageHandling, 'context.stageHandling must be defined');
  t.equal(context.logLevel, 'info', 'context.logLevel must be "info"');
  t.ok(typeof context.error === 'function', 'context.error must be defined');
  t.ok(typeof context.warn === 'function', 'context.warn must be defined');
  t.ok(typeof context.info === 'function', 'context.info must be defined');
  t.ok(typeof context.debug === 'function', 'context.debug must be defined');
  t.ok(typeof context.trace === 'function', 'context.trace must be defined');
  t.ok(context.custom, 'context.custom must be defined');
  t.deepEqual(context.custom, {}, 'context.custom must be empty object');
  t.notOk(context.kinesis, 'context.kinesis must not be defined');
  t.notOk(context.dynamoDBDocClient, 'context.dynamoDBDocClient must not be defined');
  t.notOk(context.region, 'context.region must not be defined');
  t.notOk(context.stage, 'context.stage must not be defined');
  t.notOk(context.awsContext, 'context.awsContext must not be defined');

  t.end();
});

// -------------------------------------------------------------------------------------------------------------------
// configureStandardContext with options only
// -------------------------------------------------------------------------------------------------------------------
test('configureStandardContext with options only', t => {
  let context = {};

  configureStandardContext(context, undefined, standardOptions, undefined, undefined, false);

  t.ok(context.stageHandling, 'context.stageHandling must be defined');
  t.equal(context.logLevel, 'trace', 'context.logLevel must be "trace"');
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
  t.notOk(context.region, 'context.region must not be defined');
  t.notOk(context.stage, 'context.stage must not be defined');
  t.notOk(context.awsContext, 'context.awsContext must not be defined');

  t.end();
});

// -------------------------------------------------------------------------------------------------------------------
// configureStandardContext with settings only
// -------------------------------------------------------------------------------------------------------------------
test('configureStandardContext with settings only', t => {
  let context = {};

  configureStandardContext(context, standardSettings, undefined, undefined, undefined, false);

  t.ok(context.stageHandling, 'context.stageHandling must be defined');
  t.equal(context.stageHandling.streamNameStageSeparator, '-', 'context.stageHandling must be "-"');
  t.equal(context.logLevel, 'error', 'context.logLevel must be "error"');
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
  t.notOk(context.region, 'context.region must not be defined');
  t.notOk(context.stage, 'context.stage must not be defined');
  t.notOk(context.awsContext, 'context.awsContext must not be defined');

  t.end();
});

// -------------------------------------------------------------------------------------------------------------------
// configureStandardContext with settings and options only
// -------------------------------------------------------------------------------------------------------------------
test('configureStandardContext with settings and options only', t => {
  let context = {};

  configureStandardContext(context, standardSettings, standardOptions, undefined, undefined, false);

  t.ok(context.stageHandling, 'context.stageHandling must be defined');
  t.equal(context.stageHandling.streamNameStageSeparator, '-', 'context.stageHandling must be "-"');
  t.equal(context.logLevel, 'error', 'context.logLevel must be "error"');
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
  t.notOk(context.region, 'context.region must not be defined');
  t.notOk(context.stage, 'context.stage must not be defined');
  t.notOk(context.awsContext, 'context.awsContext must not be defined');

  t.end();
});

