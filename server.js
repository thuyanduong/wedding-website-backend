import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 5555;

// Convert ES Modules path
const __dirname = path.resolve();

// Dynamically load all API routes
const apiDir = path.join(__dirname, "api");
fs.readdirSync(apiDir).forEach((file) => {
  const routePath = `/api/${file.replace(/\.(js|ts)$/, "")}`;
  import(`./api/${file}`).then((module) => {
    app.all(routePath, module.default);
    console.log(`Loaded route ${routePath}`);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
