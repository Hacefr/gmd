module.exports = function(app) {
  // 1. Song Info Resolver
  app.post("/getGJSongInfo.php", async (req, res) => {
    const songID = req.body.songID;
    console.log(`>>> [GDPS] Fetching Newgrounds song ID: ${songID}`);
    try {
      const ngPage = await fetch(`https://www.newgrounds.com/audio/listen/${songID}`);
      if (!ngPage.ok) return res.send("-1");
      const html = await ngPage.text();
      const match = html.match(/https:\/\/audio\.ngfiles\.com\/[^"']+\.mp3/i);
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (!match) return res.send("-1");

      const songUrl = match[0].replace(/\\/g, "");
      let title = "Newgrounds Song", artist = "Newgrounds Artist";
      if (titleMatch) {
        const parts = titleMatch[1].split(" - ");
        if (parts.length >= 2) {
          title = parts[0].trim();
          artist = parts[1].replace(/\|.*$/, "").trim();
        }
      }
      res.send(`1~|~${songID}~|~2~|~${title}~|~3~|~1~|~4~|~${artist}~|~5~|~5.00~|~6~|~~|~10~|~${encodeURIComponent(songUrl)}~|~7~|~~|~8~|~1`);
    } catch {
      res.send("-1");
    }
  });

  // 2. Audio Streaming Proxy
  app.get("/audio-proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Missing url query");
    try {
      const audioRes = await fetch(targetUrl, { headers: { "User-Agent": "GeometryDash/2.1" } });
      if (!audioRes.ok) return res.status(audioRes.status).send("Failed to fetch audio");
      res.set({
        "Content-Type": audioRes.headers.get("content-type") || "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
        "Accept-Ranges": "bytes"
      });
      const buffer = await audioRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch {
      res.status(500).send("Proxy error");
    }
  });
};
