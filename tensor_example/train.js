const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-node");
const fs = require('fs');
const path = require('path');
const {normalizeValue} = require('./utilities');
const uniq = require('lodash/uniq');
const flatten = require('lodash/flatten');
const omit = require('lodash/omit');
const union = require('lodash/union');
const chalk = require('chalk');

const NUMBER_OF_TRAINING_FILES_TO_READ = 30;

let matches = [];
let called = 0;

function walkSync(dir, cb = console.log) {
  if (called > NUMBER_OF_TRAINING_FILES_TO_READ)
    return;
  called++;

  return fs
    .lstatSync(dir)
    .isDirectory()
    ? fs
      .readdirSync(dir)
      .map(f => walkSync(path.join(dir, f), cb))
    : cb(dir);
}

function getTrainData(filePath) {
  const data = fs.readFileSync(filePath);
  matches = union(matches, JSON.parse(data.toString()));
}

walkSync(path.resolve(__dirname, '../data/results/2018/'), getTrainData)

console.log(matches.length)

const testFile = path.resolve(__dirname, '../data/results/2018/09-01-2018.json');
let testData = fs.readFileSync(testFile);
const initTestData = JSON.parse(testData.toString());
testData = JSON.parse(testData.toString());

const extractTeams = matches => {
  const teams = [];
  matches.forEach(match => {
    teams.push(match.home_team, match.away_team)
  })

  return teams;
}

const teams = uniq(extractTeams(matches));
const testDataTeams = uniq(extractTeams(testData));
const teamsFeatures = {};
teams.forEach(team => teamsFeatures[`home_${team}`] = 0)
teams.forEach(team => teamsFeatures[`away_${team}`] = 0)
testDataTeams.forEach(team => teamsFeatures[`home_${team}`] = 0)
testDataTeams.forEach(team => teamsFeatures[`away_${team}`] = 0)

console.log('Teams', teams.length)

const normalize = function (match, ranks, goals) {
  const {draw_rank, home_rank, away_rank, home_team_goals, away_team_goals} = match;

  return {
    ...teamsFeatures,
    draw_rank: normalizeValue(draw_rank, ranks),
    home_rank: normalizeValue(home_rank, ranks),
    away_rank: normalizeValue(away_rank, ranks),
    result: match.result,
    [`home_${match.home_team}`]: 1,
    [`away${match.away_team}`]: 1
  }
}

let ranks = matches.map(({draw_rank, home_rank, away_rank}) => [draw_rank, home_rank, away_rank]);
ranks = flatten(ranks);

let goals = matches.map(({home_team_goals, away_team_goals}) => [home_team_goals, away_team_goals]);
goals = flatten(goals);

matches = matches.map(match => normalize(match, ranks, goals))
testData = testData.map(match => normalize(match, ranks, goals))

const tensorData = matches.map(item => Object.values(omit(item, 'result')));
const len = matches.length;
const inputLen = tensorData[0].length;
const trainingData = tf.tensor2d(tensorData);

testData = tf.tensor2d(testData.map(item => Object.values(omit(item, 'result'))));

const outputData = tf.tensor2d(matches.map(item => [
  item.result === "1",
  item.result === "X",
  item.result === "2"
]))

// // build neural network
const model = tf.sequential()

model.add(tf.layers.dense({inputShape: [inputLen], activation: "sigmoid", units: 16}))

model.add(tf.layers.dense({inputShape: [16], activation: "sigmoid", units: 8}))

model.add(tf.layers.dense({inputShape: [8], activation: "sigmoid", units: 3}))

model.compile({
  loss: "meanSquaredError",
  optimizer: tf
    .train
    .adam(.06)
})

console.log('Number of teams: ', teams.length);
console.log('Number of matches: ', matches.length);
console.log('Number of model features: ', Object.keys(matches[0]).length);

model
  .fit(trainingData, outputData, {epochs: 100})
  .then((history) => {
    const val = model
      .predict(testData)
      .dataSync();

    let correct = 0;
    let wrong = 0;

    for (let i = 0; i < val.length; i += 3) {
      const max = Math.max(val[i], val[i + 1], val[i + 2]);
      let predictedResult = '2'
      const result = initTestData[i / 3].result;

      if (max == val[i])
        predictedResult = '1';
      else if (max == val[i + 1])
        predictedResult = 'X';

      console.log(`${initTestData[i / 3].home_team} -  ${initTestData[i / 3].away_team}: ${predictedResult}` )

      // if (predictedResult === result) {
      //   correct++;
      //   console.log(chalk.green("Correctly Predicted: ", result));
      // } else {
      //   wrong++;
      //   console.log(chalk.red(`Wrong prediction, result: ${result}, predicted: ${predictedResult}`, val[i], val[i + 1], val[i + 2]));
      //   console.log(initTestData[i / 3])
      // }
    }

    model.save(`file:///${__dirname}/my-model-1`)
    .then(() => {
      console.log("MODEL SAVED");
      tf.loadModel(`file:///${__dirname}/my-model-1/model.json`)
      .then(model => {
        console.log('MODEL LOADED')

        model.compile({
          loss: "meanSquaredError",
          optimizer: tf
            .train
            .adam(.06)
        })
        model.fit(trainingData, outputData, {epochs: 1}).then(() => console.log("Done"))
      })
    })

    // console.log(chalk.yellow(`Correct: ${correct}, Wrong: ${wrong}`));
    // model.save()
  });