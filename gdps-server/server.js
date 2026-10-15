const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
require("./songs")(app);

// 1. GDPS Level Search Endpoint
app.post("/getGJLevels21.php", (req, res) => {
  console.log(">>> [GDPS] Level search requested by web client!");
  const levelInfo = "1:1:2:Server Level 1:3:VGVzdCBsZXZlbA==:5:1:6:1:8:10:9:10:10:0:12:0:13:21:14:0:17:0:43:0:25:0:18:0:19:0:42:0:45:0:15:0:30:0:31:0:37:0:38:0:39:0:46:1:47:2:40:0:35:0";
  const authorInfo = "1:Admin:1";
  const songInfo = "";
  const pageInfo = "1:0:10";
  res.send(`${levelInfo}#${authorInfo}#${songInfo}#${pageInfo}#hash`);
});

// 2. GDPS Level Download Endpoint
app.post("/downloadGJLevel22.php", (req, res) => {
  const levelID = req.body.levelID || 1;
  console.log(`>>> [GDPS] Downloading level ID: ${levelID}`);
  const rawLevelData = "kS38,1,1,2,10,3,15;1,8,2,240,3,105;";
  const base64Data = Buffer.from(rawLevelData).toString("base64");
  const response = `1:${levelID}:2:Server Level 1:3:VGVzdA==:4:${base64Data}:5:1:6:1:8:10:9:10:10:0:12:0:13:21:14:0:17:0:43:0:25:0:18:0:19:0:42:0:45:0:15:0:30:0:31:0:37:0:38:0:39:0:46:1:47:2:40:0:35:0#hash`;
  res.send(response);
});

// 3. Serve all game files (HTML, JS, textures, audio)
app.use(express.static(path.join(__dirname, "..")));

app.listen(PORT, () => {
  console.log("=========================================");
  console.log("  Full-Stack GDPS active on port " + PORT);
  console.log("=========================================");
});
