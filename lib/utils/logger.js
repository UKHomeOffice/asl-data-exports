const winston = require('winston');

module.exports = settings => {

  const transports = [
    new winston.transports.Console({
      level: settings.logLevel,
      handleExceptions: true,
      format: winston.format.cli()
    })
  ];

  return winston.createLogger({
    transports,
    format: winston.format.json()
  });

};
