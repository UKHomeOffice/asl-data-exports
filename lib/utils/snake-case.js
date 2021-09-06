module.exports = str => str.replace(/[A-Z]/g, s => `_${s.toLowerCase()}`);
