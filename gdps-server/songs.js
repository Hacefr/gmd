module.exports = function(app) {
  app.post("/getGJSongInfo.php", async (req, res) => {
    const songID = req.body.songID;
    console.log(">>> [GDPS] Resolving song ID: " + songID);
    const streamUrl = "https://fetchsongid.lasokar.workers.dev/?id=" + encodeURIComponent(songID);
    const response = "1~|~" + songID + "~|~2~|~Newgrounds Song #" + songID + "~|~3~|~1~|~4~|~Newgrounds~|~5~|~5.00~|~6~|~~|~10~|~" + encodeURIComponent(streamUrl) + "~|~7~|~~|~8~|~1";
    res.send(response);
  });

  app.get("/audio-proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Missing url");
    try {
      const audioRes = await fetch(targetUrl);
      if (!audioRes.ok) return res.status(audioRes.status).send("Fetch failed");
      res.set({
        "Content-Type": "audio/mpeg",
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
