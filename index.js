const Worker = require('./lib/worker');
const config = require('./config');

async function runWorker() {
  const worker = await Worker(config); // Ensure worker is initialized properly

  if (config.interval) {
    const iterate = async () => {
      try {
        await worker();
        console.log(`Waiting ${Math.round(config.interval / 1000)} seconds.`);
        setTimeout(() => iterate(), config.interval); // Use setTimeout to retry after interval
      } catch (err) {
        console.error(err.stack);
      }
    };
    await iterate();
  } else {
    try {
      const db = await worker(); // Run the worker once
      await db.destroy(); // Destroy the database connection when done
    } catch (err) {
      console.error(err.stack);
      process.exit(1); // Exit the process if there's an error
    }
  }
}

// Call the function to start the worker
runWorker();
