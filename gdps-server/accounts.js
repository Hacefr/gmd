const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Use Permanent Render Disk if available
const DB_DIR = process.env.RENDER ? "/data" : __dirname;
const DB_FILE = path.join(DB_DIR, "users.json");

function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], sessions: {}, saves: {}, userProgress: {} }, null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function getSessionToken(req) {
  const match = (req.headers.cookie || "").match(/gd_session=([^;]+)/);
  return match ? match[1] : null;
}

module.exports = function(app) {
  app.post("/api/auth/register", (req, res) => {
    const { username, password, email, pin } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    if (username.length < 3 || username.length > 15) return res.status(400).json({ error: "Username must be 3-15 characters" });

    const db = loadDB();
    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hash = hashPassword(password, salt);
    const userId = db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 100;
    const newUser = { id: userId, username, email: email || null, salt, hash, pin: pin || null, createdAt: new Date() };

    db.users.push(newUser);

    const token = crypto.randomBytes(32).toString("hex");
    db.sessions[token] = userId;
    saveDB(db);

    res.setHeader("Set-Cookie", `gd_session=${token}; Path=/; HttpOnly; SameSite=Lax`);
    res.json({ user: { id: userId, username, email: newUser.email } });
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    const db = loadDB();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(400).json({ error: "Invalid username or password" });

    const hash = hashPassword(password, user.salt);
    if (hash !== user.hash) return res.status(400).json({ error: "Invalid username or password" });

    const token = crypto.randomBytes(32).toString("hex");
    db.sessions[token] = user.id;
    saveDB(db);

    res.setHeader("Set-Cookie", `gd_session=${token}; Path=/; HttpOnly; SameSite=Lax`);
    res.json({ user: { id: user.id, username: user.username, email: user.email } });
  });

  app.get("/api/auth/me", (req, res) => {
    const token = getSessionToken(req);
    if (!token) return res.status(401).json({ user: null });

    const db = loadDB();
    const userId = db.sessions[token];
    const user = db.users.find(u => u.id === userId);
    if (!user) return res.status(401).json({ user: null });

    res.json({ user: { id: user.id, username: user.username, email: user.email } });
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = getSessionToken(req);
    if (token) {
      const db = loadDB();
      delete db.sessions[token];
      saveDB(db);
    }
    res.setHeader("Set-Cookie", "gd_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    res.json({ ok: true });
  });

  app.get("/api/saves", (req, res) => {
    const token = getSessionToken(req);
    if (!token) return res.status(401).json({ error: "Not logged in" });
    const db = loadDB();
    const userId = db.sessions[token];
    res.json({ save: db.saves[userId] || {} });
  });

  app.post("/api/saves", (req, res) => {
    const token = getSessionToken(req);
    if (!token) return res.status(401).json({ error: "Not logged in" });
    const db = loadDB();
    const userId = db.sessions[token];
    db.saves[userId] = req.body.save || {};
    saveDB(db);
    res.json({ ok: true });
  });

  // Secure Server-Side Level Completion & Star Award
  app.post("/api/complete", (req, res) => {
    try {
      const token = getSessionToken(req);
      if (!token) return res.status(401).json({ error: "Not logged in" });

      let { levelIds } = req.body;
      if (req.body.levelId) levelIds = [req.body.levelId];
      if (!levelIds || !Array.isArray(levelIds)) return res.status(400).json({ error: "Missing levelIds array" });

      const db = loadDB();
      const userId = db.sessions[token];
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      db.userProgress = db.userProgress || {};
      db.userProgress[userId] = db.userProgress[userId] || { completed: [], stars: 0 };
      const userProg = db.userProgress[userId];

      levelIds.forEach(id => {
        const sid = String(id);
        if (!userProg.completed.includes(sid)) {
          userProg.completed.push(sid);
        }
      });

      let totalStars = 0;
      const levelsFile = path.join(__dirname, "levels.json");
      if (fs.existsSync(levelsFile)) {
        const levels = JSON.parse(fs.readFileSync(levelsFile, "utf8"));
        userProg.completed.forEach(compId => {
          const lvl = levels.find(l => String(l.id) === compId);
          if (lvl && lvl.stars > 0) {
            totalStars += parseInt(lvl.stars);
          }
        });
      }
      
      userProg.stars = totalStars;
      saveDB(db);

      console.log(">>> [COMPETITIVE] User #" + userId + " synced levels. New total stars: " + totalStars);
      res.json({ ok: true, stars: userProg.stars });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};
