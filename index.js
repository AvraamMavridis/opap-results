const request = require('request');
const cheerio = require('cheerio');
const md5 = require('md5');
const fs = require('fs');

const options = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}

function scrapAll(){
  const startDate = new Date('2015-06-01');
  const today = new Date().toLocaleDateString('gr-GR');
  const endDate = new Date('2015-12-01').toLocaleDateString('gr-GR');

  while(startDate.toLocaleDateString('gr-GR') !== endDate){
    const dateToScrap = startDate.toLocaleDateString('gr-GR', options);
    scrap(dateToScrap);
    startDate.setDate(startDate.getDate() + 1);
  }
}

function writeToFile(results, date) {
  const fileName = (new Date(date)).toLocaleDateString('en-GB', options).replace(/\//g, '-');
  const year = (new Date(date)).getFullYear();
  const directory = `${__dirname}/data/results/${year}/`
  const filePath = `${directory}${fileName}.json`;

  if (!fs.existsSync(directory)){
    fs.mkdirSync(directory);
}

  fs.writeFile(filePath, JSON.stringify(results), function (err) {
    if (err) {
      return console.log(err);
    }
    console.log(`Results were saved. File: /results/${year}/${fileName}.json`);
  });
}

function getGoals(final_score) {
  const temp = final_score
    .split('-')
    .map((v) => v.trim())
  const home_team_goals = parseInt(temp[0]);
  const away_team_goals = parseInt(temp[1]);
  const total_goals = home_team_goals + away_team_goals;
  return {home_team_goals, away_team_goals, total_goals}
}

function parseResults(html, date) {
  const $ = cheerio.load(html);
  const rows = $('.livescores').first().find('tr');
  const match_date = date;
  const results = [];

  rows.filter((index, row) => {
    const cells = $(row).find('td')
    return cells.length === 12 && $(cells[0])
      .find('img')
      .attr('title');
  }).each((index, row) => {
    const cells = $(row).find('td');
    const competition = $(cells[0])
      .find('img')
      .attr('title');
    const country = competition.split('-')[0].trim();
    const code_number = parseInt($(cells[2]).text())
    const home_rank = parseFloat($(cells[3]).text());
    const home_team = $(cells[4]).text();
    const draw_rank = parseFloat($(cells[5]).text());
    const away_team = $(cells[6]).text();
    const away_rank = parseFloat($(cells[7]).text());
    const first_half = $(cells[8]).text().trim();
    const result_score = $(cells[9]).text().trim();
    const result = $(cells[11]).text();
    const hash = md5(`${home_team}-${away_team}-${match_date}`)

    results.push({
      hash,
      country,
      competition,
      home_team,
      away_team,
      home_rank,
      draw_rank,
      away_rank,
      first_half,
      result_score,
      result,
      ...getGoals(result_score)
    })
  })

  writeToFile(results, date);
}

function scrap(date){
  const url = `https://agones.gr/?date=${date}`;

  request(url, function (error, response, html) {
    if (!error && response.statusCode == 200) {
      parseResults(html, date);
    }
  });
}

scrap('2018-09-01')
// scrapAll();