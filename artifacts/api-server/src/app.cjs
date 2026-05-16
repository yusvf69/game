const express = require("express");
const app = express();
app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
