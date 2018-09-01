const fs = require('fs');
const path = require('path');
const uniq = require('lodash/uniq');
const flatten = require('lodash/flatten');

let teams = [];

const extractTeams = function(data){
    const home_teams = data.map(m => m.home_team);
    const away_teams = data.map(m => m.away_team);
    teams.push(home_teams, away_teams);
}

const readFile = function readFile(file){
  let data = fs.readFileSync(file);
  data = JSON.parse(data.toString());
  extractTeams(data);
}

function walkSync(dir, cb) {
  return fs.lstatSync(dir).isDirectory()
      ? fs.readdirSync(dir).map(f => walkSync(path.join(dir, f), cb))
      : cb(dir);
}

walkSync('./data/results', readFile);

teams = uniq(flatten(teams)).filter(Boolean).map(v => v.trim()).sort();

fs.writeFileSync('./data/teams.json', JSON.stringify(teams));