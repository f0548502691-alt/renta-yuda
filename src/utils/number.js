function parseNumber(raw) {
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

module.exports = {
  parseNumber,
};
