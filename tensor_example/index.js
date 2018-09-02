const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');
const uniq = require('lodash/uniq');
const omit = require('lodash/omit');
const flatten = require('lodash/flatten');
const chalk = require('chalk');
require('@tensorflow/tfjs-node');
const { normalizeValue } = require('./utilities');

const teams = require('../data/teams.json');

const uniqTeams = uniq(teams);
const teamsFeatures = {};
uniqTeams.forEach((team) => (teamsFeatures[`home_${ team }`] = 0));
uniqTeams.forEach((team) => (teamsFeatures[`away_${ team }`] = 0));

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

const testFile = path.resolve(__dirname, '../data/results/2018/09-02-2018.json');
const data = fs.readFileSync(testFile);
let matches = JSON.parse(data.toString());

matches = matches.filter(match => {
  return teams.includes(match.home_team) && teams.includes(match.away_team);
});
console.log(matches.length);
const initMatches = JSON.parse(data.toString());
let ranks = matches.map(({ draw_rank, home_rank, away_rank }) => [ draw_rank, home_rank, away_rank ]);
ranks = flatten(ranks);

matches = matches.map((match) => buildFeatures(match, ranks));
const testData = tf.tensor2d(matches.map((item) => Object.values(omit(item, 'result'))));

tf.loadModel(`file:///${ __dirname }/model/model.json`).then((model) => {
  const val = model.predict(testData).dataSync();

  const correct = 0;
  const wrong = 0;

  for (let i = 0; i < val.length; i += 3) {
    const max = Math.max(val[i], val[i + 1], val[i + 2]);
    const threshold = 0.3;
    let predictedResult = '2';
    const match = initMatches[i / 3];

    if (max === val[i]) {
      predictedResult = '1';
    } else if (max === val[i + 1]) {
      predictedResult = 'X';
    }

    if (predictedResult === 'X' || max > threshold) {
      console.log(chalk.green(`${ match.home_team } - ${ match.away_team }: `, predictedResult));
    }
    // console.log(val[i], val[i + 1], val[i + 2]);

    // if (predictedResult === result) {
    //   correct++;
    //   console.log(chalk.green('Correctly Predicted: ', result));
    //   console.log(val[i], val[i + 1], val[i + 2]);
    // } else {
    //   wrong++;
    //   console.log(chalk.red(`Wrong prediction, result: ${ result }, predicted: ${ predictedResult }`));
    //   console.log(val[i], val[i + 1], val[i + 2]);
    // }
  }
  console.log(`Wrong ${ wrong }, Correct ${ correct }`);
});
