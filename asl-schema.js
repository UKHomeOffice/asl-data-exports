let db = null;

async function aslSchema(dbConfig) {
  try {
    const schemaModule = await import('@asl/schema');
    db = schemaModule.default;
    return db(dbConfig);
  } catch (error) {
    console.error('Error initializing DB:', error);
    throw error;
  }
}

module.exports = aslSchema;
