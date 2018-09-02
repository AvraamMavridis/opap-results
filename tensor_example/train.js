const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');
const uniq = require('lodash/uniq');
const flatten = require('lodash/flatten');
const omit = require('lodash/omit');
const chalk = require('chalk');
const teams = require('../data/teams.json');
const { normalizeValue, walkSync } = require('./utilities');
const { createModelLayers } = require('./createModelLayers');

const uniqTeams = uniq(teams);
const teamsFeatures = {};
uniqTeams.forEach((team) => (teamsFeatures[`home_${ team }`] = 0));
uniqTeams.forEach((team) => (teamsFeatures[`away_${ team }`] = 0));

const numberOfFeatures = Object.keys(teamsFeatures).length + 4;
const model = createModelLayers(numberOfFeatures);
model.save(`file:///${ __dirname }/model2`);

/**
 * Build the features of the model
 *
 * @param {Object} match
 * @param {Array} ranks
 * @returns {Object}
 */
function buildFeatures(match, ranks) {
  const { draw_rank, home_rank, away_rank } = match;

  return {
    ...teamsFeatures,
    draw_rank: normalizeValue(draw_rank, ranks),
    home_rank: normalizeValue(home_rank, ranks),
    away_rank: normalizeValue(away_rank, ranks),
    result: match.result,
    [`home_${ match.home_team }`]: 1,
    [`away${ match.away_team }`]: 1
  };
}

const filePaths = [];

function getFilePaths(filePath) {
  filePaths.push(filePath);
}

walkSync(path.resolve(__dirname, '../data/results/2018/'), getFilePaths);


async function getTrainData (filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) reject(err);

      let matches = JSON.parse(data.toString());
      let ranks = matches.map(({ draw_rank, home_rank, away_rank }) => [ draw_rank, home_rank, away_rank ]);
      ranks = flatten(ranks);

      matches = matches.map(match => buildFeatures(match, ranks));
      console.log(chalk.blue('Number of matches: ', matches.length));

      let inputData = matches.map((item) => Object.values(omit(item, 'result')));

      try {
        inputData = tf.tensor2d(inputData);
      } catch (e) {
        console.log(chalk.red(`Unable to train with: ${ filePath } \n`));
        return reject(e);
      }

      const outputData = tf.tensor2d(
        matches.map((item) => [ item.result === '1', item.result === 'X', item.result === '2' ])
      );
      return resolve({ inputData, outputData });
    });
  });
}

async function readFiles(files) {
  for (const file of files) {
    try {
      console.time(file);
      console.profile(file);
      console.log(chalk.yellow('Loading model...'));

      const savedModel = await tf.loadModel(`file:///${ __dirname }/model/model.json`);

      console.log(chalk.green('Model loaded.'));
      console.log(chalk.yellow('Compiling model...'));

      savedModel.compile({
        loss: 'meanSquaredError',
        optimizer: tf
          .train
          .adam(0.06)
      });

      console.log(chalk.green('Model compiled.'));
      console.log(chalk.yellow('Training with file...', file));

      const { inputData, outputData } = await getTrainData(file);
      await savedModel.fit(inputData, outputData, { epochs: 100 });

      const memory = tf.memory();
      console.log(chalk.blue(`Tensors: ${ memory.numTensors }`));
      console.log(chalk.blue(`Memory: ${ memory.numBytes * 0.000001 } MB`));


      console.log(chalk.green(`Trained: ${ file }`));
      console.log(chalk.yellow('Saving model...'));

      await savedModel.save(`file:///${ __dirname }/model2`);

      console.log(chalk.green('Model saved.'));
      console.timeEnd(file);
      console.log(chalk.green('\n'));
    } catch (e) {
      console.log(chalk.red(`Unable to train with: ${ file }`));
      console.log(chalk.red(`Error: ${ e.message } \n`));
    }
  }
}

readFiles(filePaths);


// model.save(`file:///${ __dirname }/model`);


// const testFile = path.resolve(__dirname, '../data/results/2018/09-01-2018.json');
// let testData = fs.readFileSync(testFile);
// const initTestData = JSON.parse(testData.toString());
// testData = JSON.parse(testData.toString());

// matches = matches.map(match => buildFeatures(match, ranks));
// // testData = testData.map(match => buildFeatures(match, ranks));

// const tensorData = matches.map(item => Object.values(omit(item, 'result')));
// const inputLen = tensorData[0].length;
// const model = createModelLayers(inputLen);
// const trainingData = tf.tensor2d(tensorData);

// // testData = tf.tensor2d(testData.map(item => Object.values(omit(item, 'result'))));

// const outputData = tf.tensor2d(matches.map(item => [
//   item.result === '1',
//   item.result === 'X',
//   item.result === '2'
// ]));

// // // build neural network

// console.log('Number of teams: ', teams.length);
// console.log('Number of matches: ', matches.length);
// console.log('Number of model features: ', Object.keys(matches[0]).length);

// model
//   .fit(trainingData, outputData, { epochs: 100 })
//   .then((history) => {
//     const val = model
//       .predict(testData)
//       .dataSync();

//     const correct = 0;
//     const wrong = 0;

//     for (let i = 0; i < val.length; i += 3) {
//       const max = Math.max(val[i], val[i + 1], val[i + 2]);
//       let predictedResult = '2';
//       const result = initTestData[i / 3].result;

//       if (max == val[i]) { predictedResult = '1'; } else if (max == val[i + 1]) { predictedResult = 'X'; }

//       console.log(`${ initTestData[i / 3].home_team } -  ${ initTestData[i / 3].away_team }: ${ predictedResult }`);

//       // if (predictedResult === result) {
//       //   correct++;
//       //   console.log(chalk.green("Correctly Predicted: ", result));
//       // } else {
//       //   wrong++;
//       //   console.log(chalk.red(`Wrong prediction, result: ${result}, predicted: ${predictedResult}`, val[i], val[i + 1], val[i + 2]));
//       //   console.log(initTestData[i / 3])
//       // }
//     }

//     model.save(`file:///${ __dirname }/my-model-1`)
//       .then(() => {
//         console.log('MODEL SAVED');
//         tf.loadModel(`file:///${ __dirname }/my-model-1/model.json`)
//           .then(model => {
//             console.log('MODEL LOADED');

//             model.compile({
//               loss: 'meanSquaredError',
//               optimizer: tf
//                 .train
//                 .adam(0.06)
//             });
//             model.fit(trainingData, outputData, { epochs: 1 }).then(() => console.log('Done'));
//           });
//       });

//     // console.log(chalk.yellow(`Correct: ${correct}, Wrong: ${wrong}`));
//     // model.save()
//   });
