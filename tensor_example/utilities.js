const fs = require('fs');
const path = require('path');


function normalizeValue(value, array) {
  const max = Math.max(...array);
  const min = Math.min(...array);

  return (value - min) / (max - min);
}

function walkSync(dir, cb = console.log) {
  return fs
    .lstatSync(dir)
    .isDirectory()
    ? fs
      .readdirSync(dir)
      .map(f => walkSync(path.join(dir, f), cb))
    : cb(dir);
}

module.exports = {
  normalizeValue,
  walkSync
};
