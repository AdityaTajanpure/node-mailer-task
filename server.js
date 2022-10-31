const express = require("express");
const app = express();
const connectToDb = require("./config/db");
require("dotenv").config();

app.use(express.json({ extended: false }));
connectToDb();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`);
});

app.get("/", (req, res) => res.send("Hello world!"));

//Defining Routes
app.use("/", require("./routes/api/main"));
