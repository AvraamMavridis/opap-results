const normalizeValue = function (value, array) {
  const max = Math.max(...array);
  const min = Math.min(...array);

  return (value - min) / (max - min);
}

module.exports = {
  normalizeValue
}