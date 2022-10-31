const mongoose = require("mongoose");

const connectToDb = async () => {
  let dbUrl = process.env.DB_URL;
  try {
    await mongoose.connect(dbUrl);
    console.log(
      "Connected to",
      mongoose.connection.db.databaseName,
      "database"
    );
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

module.exports = connectToDb;
