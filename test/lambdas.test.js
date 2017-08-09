'use strict';

/**
 * Unit tests for aws-core-utils/lambdas.js
 * @author Byron du Preez
 */

const test = require("tape");

// The test subject
const lambdas = require('../lambdas');
const getFunctionName = lambdas.getFunctionName;
const getFunctionVersion = lambdas.getFunctionVersion;
const getFunctionNameVersionAndAlias = lambdas.getFunctionNameVersionAndAlias;
const getAlias = lambdas.getAlias;
//const getInvokedFunctionArn = lambdas.getInvokedFunctionArn;
const getInvokedFunctionArnFunctionName = lambdas.getInvokedFunctionArnFunctionName;

const samples = require('./samples');
//const sampleInvokedFunctionArn = samples.sampleInvokedFunctionArn;
const sampleAwsContext = samples.sampleAwsContext;

function shorten(s) {
  const prefix = 'arn:aws:lambda:aws-region:acct-id:function:';
  return s && s.startsWith(prefix) ? "..." + s.substring(prefix.length) : s;
}

function checkGetFunctionName(functionName, functionVersion, invokedFunctionArn, expected, t) {
  const awsContext = sampleAwsContext(functionName, functionVersion, invokedFunctionArn);
  //console.log(`Generated AWS context = ${JSON.stringify(awsContext)}`);
  t.equal(getFunctionName(awsContext), expected, `${awsContext.functionName} must be ${expected}`);
}

function checkGetFunctionVersion(functionName, functionVersion, invokedFunctionArn, expected, t) {
  const awsContext = sampleAwsContext(functionName, functionVersion, invokedFunctionArn);
  //console.log(`Generated AWS context = ${JSON.stringify(awsContext)}`);
  t.equal(getFunctionVersion(awsContext), expected, `${awsContext.functionVersion} must be ${expected}`);
}

function checkGetInvokedFunctionArnFunctionName(functionName, functionVersion, invokedFunctionArn, expected, t) {
  const awsContext = sampleAwsContext(functionName, functionVersion, invokedFunctionArn);
  //console.log(`Generated AWS context = ${JSON.stringify(awsContext)}`);
  t.equal(getInvokedFunctionArnFunctionName(awsContext), expected, `${shorten(awsContext.invokedFunctionArn)} must give ${expected}`);
}

function checkGetFunctionNameVersionAndAlias(functionName, functionVersion, invokedFunctionArn, expected, t) {
  const awsContext = sampleAwsContext(functionName, functionVersion, invokedFunctionArn);
  //console.log(`Generated AWS context = ${JSON.stringify(awsContext)}`);
  t.deepEqual(getFunctionNameVersionAndAlias(awsContext), expected, `${shorten(invokedFunctionArn)} must give ${JSON.stringify(expected)}`);
}

function checkGetAlias(functionName, functionVersion, invokedFunctionArn, expected, t) {
  const awsContext = sampleAwsContext(functionName, functionVersion, invokedFunctionArn);
  //console.log(`Generated AWS context = ${JSON.stringify(awsContext)}`);
  t.equal(getAlias(awsContext), expected, `${shorten(invokedFunctionArn)} must give ${expected}`);
}

const arn0 = "arn:aws:lambda:aws-region:acct-id:function:helloworld";
const arn1 = "arn:aws:lambda:aws-region:acct-id:function:helloworld:$LATEST";
const arn2 = "arn:aws:lambda:aws-region:acct-id:function:helloworld:1";
const arn3 = "arn:aws:lambda:aws-region:acct-id:function:helloworld:1.0.1";
const arn4 = "arn:aws:lambda:aws-region:acct-id:function:helloworld:DEV";
const arn5 = "arn:aws:lambda:aws-region:acct-id:function:helloworld:qa";
const arn6 = "arn:aws:lambda:aws-region:acct-id:function:helloworld:prod";
const arn7 = "arn:aws:lambda:aws-region:acct-id:function:helloworld:BETA";

// =====================================================================================================================
// Tests for getFunctionName
// =====================================================================================================================

test('getFunctionName WITHOUT process.env.AWS_LAMBDA_FUNCTION_NAME', t => {
  delete process.env.AWS_LAMBDA_FUNCTION_NAME;

  t.equal(getFunctionName(undefined), '', `undefined context must give ''`);
  t.equal(getFunctionName(null), '', `null context must give ''`);
  t.equal(getFunctionName({}), '', `{} context must give ''`);

  checkGetFunctionName('test0', '$LATEST', arn0, 'test0', t);
  checkGetFunctionName('test1', '$LATEST', arn1, 'test1', t);
  checkGetFunctionName('test2', '1', arn2, 'test2', t);
  checkGetFunctionName('test3', '1.0.1', arn3, 'test3', t);
  checkGetFunctionName('test4', '4.0', arn4, 'test4', t);
  checkGetFunctionName('test5', '5.0', arn5, 'test5', t);
  checkGetFunctionName('test6', '6.0', arn6, 'test6', t);
  checkGetFunctionName('test7', '7.0', arn7, 'test7', t);
  t.end();
});

test('getFunctionName WITH process.env.AWS_LAMBDA_FUNCTION_NAME', t => {
  try {
    const expected = 'test999';
    process.env.AWS_LAMBDA_FUNCTION_NAME = expected;

    t.equal(getFunctionName(undefined), expected, `undefined context must give '${expected}'`);
    t.equal(getFunctionName(null), expected, `null context must give '${expected}'`);
    t.equal(getFunctionName({}), expected, `{} context must give '${expected}'`);

    checkGetFunctionName('test0', '$LATEST', arn0, expected, t);
    checkGetFunctionName('test1', '$LATEST', arn1, expected, t);
    checkGetFunctionName('test2', '1', arn2, expected, t);
    checkGetFunctionName('test3', '1.0.1', arn3, expected, t);
    checkGetFunctionName('test4', '4.0', arn4, expected, t);
    checkGetFunctionName('test5', '5.0', arn5, expected, t);
    checkGetFunctionName('test6', '6.0', arn6, expected, t);
    checkGetFunctionName('test7', '7.0', arn7, expected, t);
    t.end();

  } finally {
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  }
});

// =====================================================================================================================
// Tests for getFunctionName
// =====================================================================================================================

test('getFunctionVersion WITHOUT process.env.AWS_LAMBDA_FUNCTION_VERSION', t => {
  delete process.env.AWS_LAMBDA_FUNCTION_VERSION;

  t.equal(getFunctionVersion(undefined), '', `undefined context must give ''`);
  t.equal(getFunctionVersion(null), '', `null context must give ''`);
  t.equal(getFunctionVersion({}), '', `{} context must give ''`);

  checkGetFunctionVersion('test0', '$LATEST', arn0, '$LATEST', t);
  checkGetFunctionVersion('test1', '$LATEST', arn1, '$LATEST', t);
  checkGetFunctionVersion('test2', '1', arn2, '1', t);
  checkGetFunctionVersion('test3', '1.0.1', arn3, '1.0.1', t);
  checkGetFunctionVersion('test4', '4.0', arn4, '4.0', t);
  checkGetFunctionVersion('test5', '5.0', arn5, '5.0', t);
  checkGetFunctionVersion('test6', '6.0', arn6, '6.0', t);
  checkGetFunctionVersion('test7', '7.0', arn7, '7.0', t);
  t.end();
});

test('getFunctionVersion WITH process.env.AWS_LAMBDA_FUNCTION_VERSION', t => {
  try {
    const expected = '999.0.123';
    process.env.AWS_LAMBDA_FUNCTION_VERSION = expected;

    t.equal(getFunctionVersion(undefined), expected, `undefined context must give '${expected}'`);
    t.equal(getFunctionVersion(null), expected, `null context must give '${expected}'`);
    t.equal(getFunctionVersion({}), expected, `{} context must give '${expected}'`);

    checkGetFunctionVersion('test0', '$LATEST', arn0, expected, t);
    checkGetFunctionVersion('test1', '$LATEST', arn1, expected, t);
    checkGetFunctionVersion('test2', '1', arn2, expected, t);
    checkGetFunctionVersion('test3', '1.0.1', arn3, expected, t);
    checkGetFunctionVersion('test4', '4.0', arn4, expected, t);
    checkGetFunctionVersion('test5', '5.0', arn5, expected, t);
    checkGetFunctionVersion('test6', '6.0', arn6, expected, t);
    checkGetFunctionVersion('test7', '7.0', arn7, expected, t);
    t.end();

  } finally {
    delete process.env.AWS_LAMBDA_FUNCTION_VERSION;
  }
});

// =====================================================================================================================
// Tests for getInvokedFunctionArnFunctionName
// =====================================================================================================================

test('getInvokedFunctionArnFunctionName', t => {
  t.equal(getInvokedFunctionArnFunctionName(undefined), '', `undefined context must give ''`);
  t.equal(getInvokedFunctionArnFunctionName(null), '', `null context must give ''`);
  t.equal(getInvokedFunctionArnFunctionName({}), '', `{} context must give ''`);

  checkGetInvokedFunctionArnFunctionName('test0', '$LATEST', arn0, 'helloworld', t);
  checkGetInvokedFunctionArnFunctionName('test1', '$LATEST', arn1, 'helloworld', t);
  checkGetInvokedFunctionArnFunctionName('test2', '1', arn2, 'helloworld', t);
  checkGetInvokedFunctionArnFunctionName('test3', '1.0.1', arn3, 'helloworld', t);
  checkGetInvokedFunctionArnFunctionName('test4', '4.0', arn4, 'helloworld', t);
  checkGetInvokedFunctionArnFunctionName('test5', '5.0', arn5, 'helloworld', t);
  checkGetInvokedFunctionArnFunctionName('test6', '6.0', arn6, 'helloworld', t);
  checkGetInvokedFunctionArnFunctionName('test7', '7.0', arn7, 'helloworld', t);
  t.end();
});

// =====================================================================================================================
// Tests for getFunctionNameVersionAndAlias
// =====================================================================================================================

test('getFunctionNameVersionAndAlias WITHOUT process.env.AWS_LAMBDA_FUNCTION_NAME/_VERSION', t => {
  delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  delete process.env.AWS_LAMBDA_FUNCTION_VERSION;

  const expected = {functionName: '', version: '', alias: ''};
  t.deepEqual(getFunctionNameVersionAndAlias(undefined), expected, `undefined context must give ${JSON.stringify(expected)}`);
  t.deepEqual(getFunctionNameVersionAndAlias(null), expected, `null context must give ${JSON.stringify(expected)}`);
  t.deepEqual(getFunctionNameVersionAndAlias({}), expected, `{} context must give ${JSON.stringify(expected)}`);

  const expected0 = {functionName: 'test0', version: '$LATEST', alias: ''};
  const expected1 = {functionName: 'test1', version: '$LATEST', alias: ''};
  const expected2 = {functionName: 'test2', version: '1', alias: ''};
  const expected3 = {functionName: 'test3', version: '1.0.1', alias: ''};
  const expected4 = {functionName: 'test4', version: '4.0', alias: 'DEV'};
  const expected5 = {functionName: 'test5', version: '5.0', alias: 'qa'};
  const expected6 = {functionName: 'test6', version: '6.0', alias: 'prod'};
  const expected7 = {functionName: 'test7', version: '7.0', alias: 'BETA'};

  checkGetFunctionNameVersionAndAlias('test0', '$LATEST', arn0, expected0, t);
  checkGetFunctionNameVersionAndAlias('test1', '$LATEST', arn1, expected1, t);
  checkGetFunctionNameVersionAndAlias('test2', '1', arn2, expected2, t);
  checkGetFunctionNameVersionAndAlias('test3', '1.0.1', arn3, expected3, t);
  checkGetFunctionNameVersionAndAlias('test4', '4.0', arn4, expected4, t);
  checkGetFunctionNameVersionAndAlias('test5', '5.0', arn5, expected5, t);
  checkGetFunctionNameVersionAndAlias('test6', '6.0', arn6, expected6, t);
  checkGetFunctionNameVersionAndAlias('test7', '7.0', arn7, expected7, t);
  t.end();
});

test('getFunctionNameVersionAndAlias WITH process.env.AWS_LAMBDA_FUNCTION_NAME/_VERSION', t => {
  try {
    const name = 'test9999';
    const version = '123.456.789';
    process.env.AWS_LAMBDA_FUNCTION_NAME = name;
    process.env.AWS_LAMBDA_FUNCTION_VERSION = version;

    const expected = {functionName: name, version: version, alias: ''};
    t.deepEqual(getFunctionNameVersionAndAlias(undefined), expected, `undefined context must give ${JSON.stringify(expected)}`);
    t.deepEqual(getFunctionNameVersionAndAlias(null), expected, `null context must give ${JSON.stringify(expected)}`);
    t.deepEqual(getFunctionNameVersionAndAlias({}), expected, `{} context must give ${JSON.stringify(expected)}`);

    const expected0 = {functionName: name, version: version, alias: ''};
    const expected1 = {functionName: name, version: version, alias: ''};
    const expected2 = {functionName: name, version: version, alias: ''};
    const expected3 = {functionName: name, version: version, alias: ''};
    const expected4 = {functionName: name, version: version, alias: 'DEV'};
    const expected5 = {functionName: name, version: version, alias: 'qa'};
    const expected6 = {functionName: name, version: version, alias: 'prod'};
    const expected7 = {functionName: name, version: version, alias: 'BETA'};

    checkGetFunctionNameVersionAndAlias('test0', '$LATEST', arn0, expected0, t);
    checkGetFunctionNameVersionAndAlias('test1', '$LATEST', arn1, expected1, t);
    checkGetFunctionNameVersionAndAlias('test2', '1', arn2, expected2, t);
    checkGetFunctionNameVersionAndAlias('test3', '1.0.1', arn3, expected3, t);
    checkGetFunctionNameVersionAndAlias('test4', '4.0', arn4, expected4, t);
    checkGetFunctionNameVersionAndAlias('test5', '5.0', arn5, expected5, t);
    checkGetFunctionNameVersionAndAlias('test6', '6.0', arn6, expected6, t);
    checkGetFunctionNameVersionAndAlias('test7', '7.0', arn7, expected7, t);
    t.end();

  } finally {
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    delete process.env.AWS_LAMBDA_FUNCTION_VERSION;
  }
});

// =====================================================================================================================
// Tests for getAlias
// =====================================================================================================================

test('getAlias', t => {
  t.equal(getAlias(undefined), '', `undefined context must give ''`);
  t.equal(getAlias(null), '', `null context must give ''`);
  t.equal(getAlias({}), '', `{} context must give ''`);

  checkGetAlias('test0', '$LATEST', arn0, '', t);
  checkGetAlias('test1', '$LATEST', arn1, '', t);
  checkGetAlias('test2', '1', arn2, '', t);
  checkGetAlias('test3', '1.0.1', arn3, '', t);
  checkGetAlias('test4', '4.0', arn4, 'DEV', t);
  checkGetAlias('test5', '5.0', arn5, 'qa', t);
  checkGetAlias('test6', '6.0', arn6, 'prod', t);
  checkGetAlias('test7', '7.0', arn7, 'BETA', t);
  t.end();
});
