const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Load modular endpoints
require("./songs")(app);
require("./accounts")(app);
require("./levels")(app);

// Serve static game files
app.use(express.static(path.join(__dirname, "..")));

app.listen(PORT, "0.0.0.0", () => {
  console.log("=========================================");
  console.log("  Full-Stack GDPS active on port " + PORT);
  console.log("=========================================");
});
