
const fs = require("fs");
const path = require("path");
const LEVELS_FILE = path.join(__dirname, "levels.json");

function loadLevels() {
  if (!fs.existsSync(LEVELS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(LEVELS_FILE, "utf8")); } catch (e) { return []; }
}
function saveLevels(levels) {
  fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2));
}

module.exports = function(app) {
  // Leaderboard / Scores Endpoint
  app.all("/getGJScores20.php", (req, res) => {
    try {
      const usersFile = path.join(__dirname, "users.json");
      const savesFile = path.join(__dirname, "saves.json"); // or users saves
      let users = [];
      let saves = {};
      if (fs.existsSync(usersFile)) {
        const uData = JSON.parse(fs.readFileSync(usersFile, "utf8"));
        users = uData.users || [];
        saves = uData.saves || {};
      }

      // Calculate stars for each user based on their cloud save or default
      const scoredUsers = users.map(u => {
        const uSave = saves[u.id] || {};
        const stars = parseInt(uSave["gd_totalStars"] || "0") || 0;
        return { id: u.id, username: u.username, stars: stars };
      });

      scoredUsers.sort((a, b) => b.stars - a.stars);

      // Format in RobTop score format: 1:Username:2:UserID:3:Stars:6:Rank...
      const scoreStrs = scoredUsers.map((u, idx) => {
        return "1:" + u.username + ":2:" + u.id + ":3:" + u.stars + ":6:" + (idx + 1);
      }).join("|");

      res.send(scoreStrs);
    } catch (err) {
      res.send("-1");
    }
  });


  app.post("/uploadGJLevel21.php", (req, res) => {
    try {
      const data = { ...req.body, ...req.query };
      const { levelName, levelDesc, levelString, songID, accountID, userName } = data;
      if (!levelName || !levelString) return res.send("-1");

      const levels = loadLevels();
      const newId = levels.length ? Math.max(...levels.map(l => l.id)) + 1 : 100;
      let base64Data = levelString;
      if (!levelString.startsWith("eJ") && !levelString.startsWith("kS")) {
        base64Data = Buffer.from(levelString).toString("base64");
      }

      const newLevel = {
        id: newId,
        name: String(levelName).slice(0, 20),
        desc: levelDesc || "",
        author: userName || "Player",
        accountId: parseInt(accountID) || 1,
        songId: parseInt(songID) || 0,
        downloads: 0,
        likes: 0,
        stars: 0,
        diff: 10,
        isAuto: 0,
        isDemon: 0,
        featured: 0,
        epic: 0,
        length: 1,
        data: levelString
      };

      levels.unshift(newLevel);
      saveLevels(levels);
      console.log(">>> [GDPS] Level published: " + newLevel.name + " by " + newLevel.author + " (ID: " + newId + ")");
      res.send(String(newId));
    } catch (err) {
      res.send("-1");
    }
  });

  app.all("/getGJLevels21.php", (req, res) => {
    try {
      const data = { ...req.body, ...req.query };
      const searchStr = (data.str || data.query || "").trim();
      let levels = loadLevels();
      if (!levels.length) return res.send("-1");

      if (searchStr && searchStr !== "0" && searchStr !== "-1") {
        if (!isNaN(searchStr)) {
          levels = levels.filter(l => l.id == searchStr);
        } else {
          levels = levels.filter(l => (l.name && l.name.toLowerCase().includes(searchStr.toLowerCase())) || (l.author && l.author.toLowerCase().includes(searchStr.toLowerCase())));
        }
      }
      if (!levels.length) return res.send("-1");

      const levelStrs = levels.map(l => {
        const songNum = l.songId <= 0 ? Math.abs(l.songId) : 0;
        const customSong = l.songId > 0 ? l.songId : 0;
        return "1:" + l.id + ":2:" + l.name + ":3:" + (l.desc || "") + ":5:1:6:" + l.accountId + ":8:10:9:" + (l.diff || 10) + ":10:" + (l.downloads || 0) + ":12:" + songNum + ":13:21:14:" + (l.likes || 0) + ":15:1:17:" + (l.isDemon || 0) + ":18:" + (l.stars || 0) + ":19:0:25:" + (l.isAuto || 0) + ":30:0:31:0:35:" + customSong + ":37:0:38:0:39:0:42:" + (l.featured || 0) + ":43:" + (l.demonDiff || 0) + ":45:0:46:1:47:2";
      }).join("|");

      const playerStrs = levels.map(l => l.accountId + ":" + l.author + ":" + l.accountId).join("|");
      const pageInfo = levels.length + ":0:10";
      res.send(levelStrs + "#" + playerStrs + "##" + pageInfo + "#hash");
    } catch (err) {
      res.send("-1");
    }
  });

  app.all("/downloadGJLevel22.php", (req, res) => {
    try {
      const data = { ...req.body, ...req.query };
      const levelID = parseInt(data.levelID) || 1;
      const levels = loadLevels();
      const lvl = levels.find(l => l.id == levelID) || levels[0];
      if (!lvl) return res.send("-1");

      lvl.downloads = (lvl.downloads || 0) + 1;
      saveLevels(levels);

      const songNum = lvl.songId <= 0 ? Math.abs(lvl.songId) : 0;
      const customSong = lvl.songId > 0 ? lvl.songId : 0;
      const response = "1:" + lvl.id + ":2:" + lvl.name + ":3:" + (lvl.desc || "") + ":4:" + lvl.data + ":5:1:6:" + (lvl.accountId || 1) + ":8:10:9:" + (lvl.diff || 10) + ":10:" + lvl.downloads + ":12:" + songNum + ":13:21:14:" + (lvl.likes || 0) + ":17:" + (lvl.isDemon || 0) + ":18:" + (lvl.stars || 0) + ":19:0:25:" + (lvl.isAuto || 0) + ":42:" + (lvl.featured || 0) + ":43:" + (lvl.demonDiff || 0) + ":45:0:15:" + (lvl.length || 1) + ":30:0:31:0:37:0:38:0:39:0:46:1:47:2:40:0:35:" + customSong + "#hash";
      res.send(response);
    } catch (err) {
      res.status(500).send("Error");
    }
  });

  app.post("/api/admin/rate", (req, res) => {
    try {
      const { levelId, stars, diff, isAuto, isDemon, featured, epic, userName } = req.body;
      if (!userName || userName.toLowerCase() !== "hacefr") return res.status(403).json({ error: "Unauthorized" });

      let levels = loadLevels();
      const lvl = levels.find(l => l.id == levelId);
      if (!lvl) return res.status(404).json({ error: "Not found" });

      if (stars !== undefined) lvl.stars = parseInt(stars) || 0;
      if (diff !== undefined) lvl.diff = parseInt(diff) || 0;
      if (isAuto !== undefined) lvl.isAuto = isAuto ? 1 : 0;
      if (isDemon !== undefined) lvl.isDemon = isDemon ? 1 : 0;
      if (featured !== undefined) lvl.featured = featured ? 1 : 0;
      if (epic !== undefined) lvl.epic = parseInt(epic) || 0;

      saveLevels(levels);
      res.json({ ok: true, level: lvl });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/delete", (req, res) => {
    try {
      const { levelId, userName } = req.body;
      if (!userName || userName.toLowerCase() !== "hacefr") return res.status(403).json({ error: "Unauthorized" });
      let levels = loadLevels();
      levels = levels.filter(l => l.id != levelId);
      saveLevels(levels);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
