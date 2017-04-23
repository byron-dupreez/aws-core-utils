'use strict';

/**
 * Generates samples of various AWS artifacts for testing.
 * @author Byron du Preez
 */

const uuid = require('uuid');
const base64 = require('core-functions/base64');

const copying = require('core-functions/copying');
const copy = copying.copy;

const dynamoDBUtils = require('../dynamodb-utils');
const arns = require('../arns');

const sampleAwsAccountId = "XXXXXXXXXXXX";
const sampleIdentityArn = 'identityarn';

const sampleFunctionName = "testFunc";
const latestFunctionVersion = "$LATEST";


let nextSequenceNumber = 1;

const sampleMessage = {
  key1: 'value1',
  key2: 'value2',
  key3: 'value3'
};

module.exports = {
  sampleAwsAccountId: sampleAwsAccountId,
  sampleIdentityArn: sampleIdentityArn,
  sampleFunctionName: sampleFunctionName,
  sampleMessage: sampleMessage,
  latestFunctionVersion: latestFunctionVersion,

  // General
  sampleNumberString: sampleNumberString,

  // For AWS contexts
  sampleInvokedFunctionArn: sampleInvokedFunctionArn,
  sampleAwsContext: sampleAwsContext,

  // For Kinesis events
  sampleStreamName: sampleStreamName,
  sampleKinesisEventSourceArn: sampleKinesisEventSourceArn,
  sampleKinesisEventSourceArnFromPrefixSuffix: sampleKinesisEventSourceArnFromPrefixSuffix,
  sampleBase64Data: sampleBase64Data,
  sampleKinesisPutRecordRequest: sampleKinesisPutRecordRequest,
  sampleKinesisRecord: sampleKinesisRecord,
  sampleKinesisEventWithSampleRecord: sampleKinesisEventWithSampleRecord,
  sampleKinesisEventWithRecord: sampleKinesisEventWithRecord,
  sampleKinesisEventWithRecords: sampleKinesisEventWithRecords,

  sampleKinesisMessage: sampleKinesisMessage,

  awsKinesisStreamsSampleEvent: awsKinesisStreamsSampleEvent,

  // For DynamoDB stream events
  sampleTableName: sampleTableName,
  sampleDynamoDBEventSourceArn: sampleDynamoDBEventSourceArn,
  sampleDynamoDBEventSourceArnFromPrefixSuffix: sampleDynamoDBEventSourceArnFromPrefixSuffix,

  sampleDynamoDBMessage: sampleDynamoDBMessage,
  sampleDynamoDBEventWithRecords: sampleDynamoDBEventWithRecords,

  awsDynamoDBUpdateSampleEvent: awsDynamoDBUpdateSampleEvent
};

const Strings = require('core-functions/strings');
//const isBlank = Strings.isBlank;
const isNotBlank = Strings.isNotBlank;
//const trim = Strings.trim;

function sampleNumberString(digits) {
  let number = "";
  for (let i = 0; i < digits; ++i) {
    number += Math.floor((Math.random() * 10)); // 0 to 9
  }
  return number;
}

function sampleStreamName(streamNamePrefix, streamNameSuffix) {
  const prefix = isNotBlank(streamNamePrefix) ? streamNamePrefix : 'TestKinesisStream';
  const suffix = isNotBlank(streamNameSuffix) ? streamNameSuffix : '';
  return `${prefix}${suffix}`;
}

function sampleTableName(tableNamePrefix, tableNameSuffix) {
  const prefix = isNotBlank(tableNamePrefix) ? tableNamePrefix : 'TestDynamoDBTable';
  const suffix = isNotBlank(tableNameSuffix) ? tableNameSuffix : '';
  return `${prefix}${suffix}`;
}

function sampleInvokedFunctionArn(invokedFunctionArnRegion, functionName, functionAlias) {
  const region = isNotBlank(invokedFunctionArnRegion) ? invokedFunctionArnRegion : 'IF_ARN_REGION';
  const funcName = isNotBlank(functionName) ? functionName : sampleFunctionName;
  const aliasSuffix = isNotBlank(functionAlias) ? `:${functionAlias}` : '';
  return `arn:aws:lambda:${region}:${sampleAwsAccountId}:function:${funcName}${aliasSuffix}`
}

function sampleKinesisEventSourceArn(eventSourceArnRegion, streamName) {
  const region = isNotBlank(eventSourceArnRegion) ? eventSourceArnRegion : 'EF_ARN_REGION';
  const streamName1 = isNotBlank(streamName) ? streamName : sampleStreamName();
  return `arn:aws:kinesis:${region}:${sampleAwsAccountId}:stream/${streamName1}`;
}

function sampleDynamoDBEventSourceArn(eventSourceArnRegion, tableName, timestamp) {
  const region = isNotBlank(eventSourceArnRegion) ? eventSourceArnRegion : 'EF_ARN_REGION';
  const tableName1 = isNotBlank(tableName) ? tableName : sampleTableName();
  const timestamp0 = isNotBlank(timestamp) ? timestamp : new Date().toISOString();
  const timestamp1 = timestamp0.endsWith('Z') ? timestamp0.substring(0, timestamp0.length - 1) : timestamp0;
  //arn:aws:dynamodb:us-east-1:111111111111:table/test/stream/2020-10-10T08:18:22.385
  return `arn:aws:dynamodb:${region}:${sampleAwsAccountId}:table/${tableName1}/stream/${timestamp1}`;
}

function sampleKinesisEventSourceArnFromPrefixSuffix(eventSourceArnRegion, streamNamePrefix, streamNameSuffix) {
  const streamName = sampleStreamName(streamNamePrefix, streamNameSuffix);
  return sampleKinesisEventSourceArn(eventSourceArnRegion, streamName);
}

function sampleDynamoDBEventSourceArnFromPrefixSuffix(eventSourceArnRegion, tableNamePrefix, tableNameSuffix, timestamp) {
  const tableName = sampleTableName(tableNamePrefix, tableNameSuffix);
  return sampleDynamoDBEventSourceArn(eventSourceArnRegion, tableName, timestamp);
}

function sampleAwsContext(functionName, functionVersion, invokedFunctionArn, maxTimeInMillis) {
  const uuid1 = uuid.v4();
  const startTime = Date.now();
  const maximumTimeInMillis = maxTimeInMillis ? maxTimeInMillis : 1000;

  const dashRegex = /-/g;
  dashRegex.lastIndex = 0; //NB: MUST RESET lastIndex for global regular expressions (i.e. /.../g )
  //noinspection JSUnusedLocalSymbols
  const logStreamName = `2016/10/14/[$LATEST]${uuid1.replace(dashRegex, "")}`;
  dashRegex.lastIndex = 0; //NB: MUST RESET lastIndex for global regular expressions (i.e. /.../g )

  return {
    callbackWaitsForEmptyEventLoop: true,
    logGroupName: `/aws/lambda/${functionName}`,
    logStreamName: logStreamName,
    functionName: functionName,
    memoryLimitInMB: 128,
    functionVersion: functionVersion,
    invokeid: uuid1,
    awsRequestId: uuid1,
    invokedFunctionArn: invokedFunctionArn,
    getRemainingTimeInMillis() {
      return maximumTimeInMillis - (Date.now() - startTime);
    }
  };
}

function sampleBase64Data(obj) {
  return new Buffer(JSON.stringify(obj), 'base64');
}

function sampleKinesisPutRecordRequest(streamName, partitionKey, data, explicitHashKey, sequenceNumberForOrdering) {
  // Data "SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IDEyMy4=" is a harmless message ('Hello, this is a test 123.')
  // var c = new Buffer('SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IDEyMy4=', 'base64').toString('utf-8');
  // var d = new Buffer('Hello, this is a test 123.', 'utf-8').toString('base64');
  const kinesisPartitionKey = isNotBlank(partitionKey) ? partitionKey : uuid.v4();
  const kinesisData = data !== undefined ?
    typeof data === 'object' ? JSON.stringify(data) : data : "SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IDEyMy4=";
  const putRecordRequest = {
    StreamName: streamName,
    PartitionKey: kinesisPartitionKey,
    Data: kinesisData
  };
  if (explicitHashKey) {
    putRecordRequest.ExplicitHashKey = explicitHashKey;
  }
  if (sequenceNumberForOrdering) {
    putRecordRequest.SequenceNumberForOrdering = sequenceNumberForOrdering;
  }
  return putRecordRequest;
}

function sampleKinesisRecord(shardId, sequenceNumber, partitionKey, data, eventSourceArn, eventAwsRegion) {
  // Data "SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IDEyMy4=" is a harmless message ('Hello, this is a test 123.')
  // var c = new Buffer('SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IDEyMy4=', 'base64').toString('utf-8');
  // var d = new Buffer('Hello, this is a test 123.', 'utf-8').toString('base64');
  // const seqNo = sampleNumberString(56);
  const kinesisPartitionKey = isNotBlank(partitionKey) ? partitionKey : uuid.v4();
  const kinesisData = data !== undefined ?
    typeof data === 'object' ? base64.toBase64(data) : data : "SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IDEyMy4=";
  sequenceNumber = sequenceNumber ? sequenceNumber : nextSequenceNumber++; //sampleNumberString(56);
  const eventSourceRegion = eventSourceArn ? arns.getArnRegion(eventSourceArn) : '';
  const awsRegion = eventAwsRegion ? eventAwsRegion : eventSourceRegion ? eventSourceRegion : 'us-west-2';
  shardId = shardId ? shardId : 'shardId-000000000000';
  const event = {
    eventID: `${shardId}:${sequenceNumber}`,
    eventVersion: "1.0",
    kinesis: {
      partitionKey: kinesisPartitionKey,
      data: kinesisData,
      kinesisSchemaVersion: "1.0",
      sequenceNumber: `${sequenceNumber}`
    },
    invokeIdentityArn: sampleIdentityArn,
    eventName: "aws:kinesis:record",
    //eventSourceARN: eventSourceArn,
    eventSource: "aws:kinesis",
    awsRegion: awsRegion
  };
  if (eventSourceArn !== undefined) {
    event.eventSourceARN = eventSourceArn;
  }
  return event;
}

function sampleKinesisEventWithSampleRecord(shardId, sequenceNumber, partitionKey, data, eventSourceArn, eventAwsRegion) {
  return sampleKinesisEventWithRecord(sampleKinesisRecord(shardId, sequenceNumber, partitionKey, data, eventSourceArn, eventAwsRegion))
}

function sampleKinesisEventWithRecord(kinesisRecord) {
  return {
    Records: [
      kinesisRecord
    ]
  };
}

function sampleKinesisEventWithRecords(kinesisRecords) {
  return {
    Records: kinesisRecords
  };
}

function sampleKinesisMessage(shardId, eventSeqNo, eventSourceARN, id1, id2, k1, k2, n1, n2, n3, n4, n5) {
  const msg = {};
  if (id1) msg.id1 = id1;
  if (id2) msg.id2 = id2;

  if (k1) msg.k1 = k1;
  if (k2) msg.k2 = k2;

  if (n1) msg.n1 = n1;
  if (n2) msg.n2 = n2;
  if (n3) msg.n3 = n3;
  if (n4) msg.n4 = n4;
  if (n5) msg.n5 = n5;

  const record = sampleKinesisRecord(shardId, eventSeqNo, undefined, msg, eventSourceARN, undefined);

  msg.consumerState = {};
  Object.defineProperty(msg.consumerState, 'record', {value: record, writable: true, configurable: true, enumerable: false});

  return msg;
}

function awsKinesisStreamsSampleEvent(identityArn, eventSourceArn) {
  return {
    "Records": [
      {
        "eventID": "shardId-000000000000:49545115243490985018280067714973144582180062593244200961",
        "eventVersion": "1.0",
        "kinesis": {
          "partitionKey": "partitionKey-3",
          "data": "SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IDEyMy4=",
          "kinesisSchemaVersion": "1.0",
          "sequenceNumber": "49545115243490985018280067714973144582180062593244200961"
        },
        "invokeIdentityArn": identityArn,
        "eventName": "aws:kinesis:record",
        "eventSourceARN": eventSourceArn,
        "eventSource": "aws:kinesis",
        "awsRegion": "us-east-1"
      }
    ]
  };
}

function sampleDynamoDBMessage(eventID, eventSeqNo, eventSourceARN, id1, id2, k1, k2, n1, n2, n3, n4, n5, skipSimplify) {
  const record = {
    "eventID": eventID,
    "eventVersion": "1.0",
    "dynamodb": {
      "StreamViewType": "NEW_AND_OLD_IMAGES",
      "SequenceNumber": eventSeqNo,
      "SizeBytes": 26
    },
    "awsRegion": "us-west-2",
    "eventName": "INSERT",
    "eventSourceARN": eventSourceARN,
    "eventSource": "aws:dynamodb"
  };
  const dynamodb = record.dynamodb;
  if (k1 || k2) {
    dynamodb.Keys = {};
  }
  if (k1 || k2 || id1 || id2 || n1 || n2 || n3 || n4 || n5) {
    dynamodb.NewImage = {};
    dynamodb.OldImage = {};
  }
  const keys = dynamodb.Keys;
  const newImage = dynamodb.NewImage;
  const oldImage = dynamodb.OldImage;
  if (k1) {
    keys.k1 = {"S": `${k1}`};
    newImage.k1 = {"S": `${k1}`};
    oldImage.k1 = {"S": `${k1}`};
  }
  if (k2) {
    keys.k2 = {"N": `${k2}`};
    newImage.k2 = {"N": `${k2}`};
    oldImage.k2 = {"N": `${k2}`};
  }
  if (id1) {
    newImage.id1 = {"S": `${id1}`};
    oldImage.id1 = {"S": `${id1}`};
  }
  if (id2) {
    newImage.id2 = {"S": `${id2}`};
    oldImage.id2 = {"S": `${id2}`};
  }
  if (n1) {
    newImage.n1 = {"N": `${n1}`};
    oldImage.n1 = {"N": `${n1}`};
  }
  if (n2) {
    newImage.n2 = {"N": `${n2}`};
    oldImage.n2 = {"N": `${n2}`};
  }
  if (n3) {
    newImage.n3 = {"N": `${n3}`};
    oldImage.n3 = {"N": `${Number(n3) - 1}`};
  }
  if (n4) {
    newImage.n4 = {"S": `${n4}`};
    oldImage.n4 = {"S": `${n4}`};
  }
  if (n5) {
    newImage.n5 = {"S": `${n5}`};
    oldImage.n5 = {"S": `${n5}`};
  }
  const msg = copy(record, {deep: true});
  msg.consumerState = {};
  Object.defineProperty(msg.consumerState, 'record', {value: record, writable: true, configurable: true, enumerable: false});
  if (!skipSimplify) {
    dynamoDBUtils.simplifyKeysNewImageAndOldImage(msg.dynamodb);
  }
  return msg;
}

function sampleDynamoDBEventWithRecords(dynamoDBRecords) {
  return {
    Records: dynamoDBRecords
  };
}

function awsDynamoDBUpdateSampleEvent(eventSourceArn) {
  return {
    "Records": [
      {
        "eventID": "1",
        "eventVersion": "1.0",
        "dynamodb": {
          "Keys": {
            "Id": {
              "N": "101"
            }
          },
          "NewImage": {
            "Message": {
              "S": "New item!"
            },
            "Id": {
              "N": "101"
            }
          },
          "StreamViewType": "NEW_AND_OLD_IMAGES",
          "SequenceNumber": "111",
          "SizeBytes": 26
        },
        "awsRegion": "us-west-2",
        "eventName": "INSERT",
        "eventSourceARN": eventSourceArn,
        "eventSource": "aws:dynamodb"
      },
      {
        "eventID": "2",
        "eventVersion": "1.0",
        "dynamodb": {
          "OldImage": {
            "Message": {
              "S": "New item!"
            },
            "Id": {
              "N": "101"
            }
          },
          "SequenceNumber": "222",
          "Keys": {
            "Id": {
              "N": "101"
            }
          },
          "SizeBytes": 59,
          "NewImage": {
            "Message": {
              "S": "This item has changed"
            },
            "Id": {
              "N": "101"
            }
          },
          "StreamViewType": "NEW_AND_OLD_IMAGES"
        },
        "awsRegion": "us-west-2",
        "eventName": "MODIFY",
        "eventSourceARN": eventSourceArn,
        "eventSource": "aws:dynamodb"
      },
      {
        "eventID": "3",
        "eventVersion": "1.0",
        "dynamodb": {
          "Keys": {
            "Id": {
              "N": "101"
            }
          },
          "SizeBytes": 38,
          "SequenceNumber": "333",
          "OldImage": {
            "Message": {
              "S": "This item has changed"
            },
            "Id": {
              "N": "101"
            }
          },
          "StreamViewType": "NEW_AND_OLD_IMAGES"
        },
        "awsRegion": "us-west-2",
        "eventName": "REMOVE",
        "eventSourceARN": eventSourceArn,
        "eventSource": "aws:dynamodb"
      }
    ]
  };
}

