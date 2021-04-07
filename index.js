const Worker = require('./lib/worker');
const config = require('./config');

const worker = Worker(config);

if (config.interval) {
  const iterate = () => {
    return worker()
      .catch(err => {
        console.error(err.stack);
      })
      .then(() => new Promise((resolve, reject) => {
        console.log(`Waiting ${Math.round(config.interval / 1000)} seconds.`);
        setTimeout(resolve, config.interval);
      }))
      .then(() => iterate());
  };
  iterate();
} else {
  worker()
    .catch(err => {
      console.error(err.stack);
      process.exit(1);
    })
    .then(db => db.destroy());
}
