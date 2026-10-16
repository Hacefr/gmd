const fs = require("fs");
const path = require("path");

const LEVELS_FILE = path.join(__dirname, "levels.json");

function loadLevels() {
  if (!fs.existsSync(LEVELS_FILE)) {
    const initial = [{
      id: 1,
      name: "Server Level 1",
      desc: "VGVzdCBsZXZlbA==",
      author: "Admin",
      accountId: 1,
      songId: 0,
      downloads: 0,
      stars: 0,
      rated: 0,
      likes: 0,
      length: 1,
      data: Buffer.from("kS38,1,1,2,10,3,15;1,8,2,240,3,105;").toString("base64")
    }];
    fs.writeFileSync(LEVELS_FILE, JSON.stringify(initial, null, 2));
  }
  return JSON.parse(fs.readFileSync(LEVELS_FILE, "utf8"));
}

function saveLevels(levels) {
  fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2));
}

module.exports = function(app) {
  // Admin Delete Level Endpoint
  app.post("/api/admin/delete", (req, res) => {
    const { levelId, userName } = req.body;
    if (!userName || userName.toLowerCase() !== "hacefr") {
      return res.status(403).json({ error: "Unauthorized: Owner only!" });
    }

    let levels = loadLevels();
    const initialLen = levels.length;
    levels = levels.filter(l => l.id != levelId);

    if (levels.length === initialLen) {
      return res.status(404).json({ error: "Level not found" });
    }

    saveLevels(levels);
    console.log(">>> [ADMIN] Level #" + levelId + " deleted by " + userName);
    res.json({ ok: true });
  });


  // Admin Rate Level Endpoint
  app.post("/api/admin/rate", (req, res) => {
    const { levelId, stars, featured, userName } = req.body;
    if (!userName || userName.toLowerCase() !== "hacefr") {
      return res.status(403).json({ error: "Unauthorized: Owner only!" });
    }

    const levels = loadLevels();
    const lvl = levels.find(l => l.id == levelId);
    if (!lvl) return res.status(404).json({ error: "Level not found" });

    if (stars !== undefined) {
      lvl.stars = parseInt(stars) || 0;
      lvl.rated = lvl.stars > 0 ? 1 : 0;
    }
    if (featured !== undefined) {
      lvl.featured = !!featured;
    }

    saveLevels(levels);
    console.log(">>> [ADMIN] Level #" + levelId + " rated: " + lvl.stars + " stars, featured: " + lvl.featured);
    res.json({ ok: true, level: lvl });
  });

  app.post("/getGJLevels21.php", (req, res) => {
    console.log(">>> [GDPS] Level search requested");
    const levels = loadLevels();

    if (!levels.length) return res.send("-1");

    const levelStrs = levels.map(l => {
      return `1:${l.id}:2:${l.name}:3:${l.desc}:5:1:6:${l.accountId}:8:10:9:10:10:${l.downloads}:12:${l.songId <= 0 ? Math.abs(l.songId) : 0}:13:21:14:${l.likes}:17:0:43:0:25:0:18:0:19:0:42:0:45:0:15:${l.length}:30:0:31:0:37:0:38:0:39:0:46:1:47:2:40:0:35:${l.songId > 0 ? l.songId : 0}`;
    }).join("|");

    const playerStrs = levels.map(l => `${l.accountId}:${l.author}:${l.accountId}`).join("|");
    const pageInfo = `${levels.length}:0:10`;

    res.send(`${levelStrs}#${playerStrs}##${pageInfo}#hash`);
  });

  // 3. Download Level
  app.post("/downloadGJLevel22.php", (req, res) => {
    const levelID = parseInt(req.body.levelID) || 1;
    console.log(`>>> [GDPS] Downloading level ID: ${levelID}`);
    const levels = loadLevels();
    const lvl = levels.find(l => l.id === levelID) || levels[0];

    lvl.downloads = (lvl.downloads || 0) + 1;
    saveLevels(levels);

    const response = `1:${lvl.id}:2:${lvl.name}:3:${lvl.desc}:4:${lvl.data}:5:1:6:${lvl.accountId}:8:10:9:10:10:${lvl.downloads}:12:${lvl.songId <= 0 ? Math.abs(lvl.songId) : 0}:13:21:14:${lvl.likes}:17:0:43:0:25:0:18:0:19:0:42:0:45:0:15:${lvl.length}:30:0:31:0:37:0:38:0:39:0:46:1:47:2:40:0:35:${lvl.songId > 0 ? l.songId : 0}#hash`;
    res.send(response);
  });
};
