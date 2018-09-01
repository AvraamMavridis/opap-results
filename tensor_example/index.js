const tf = require("@tensorflow/tfjs");
const {getNormalizedData} = require('./getNormalizedData');
const fs = require('fs');
const path = require('path');
const omit = require('lodash/omit');
require("@tensorflow/tfjs-node");

const testFile = path.resolve(__dirname, '../data/results/2018/01-01-2018.json');
let testData = fs.readFileSync(testFile);
testData = JSON.parse(testData.toString());
testData = getNormalizedData(testData);
testData = tf.tensor2d(testData.map(item => Object.values(omit(item, 'result'))));

const model = tf
  .loadModel('file:///tmp/my-model-1/model.json')
  .then(model => {

    const val = model
      .predict(testData)
      .dataSync();

    for (let i = 0; i < val.length; i += 3) {
      console.log(val[i], val[i + 1], val[i + 2]);
    }
  })
