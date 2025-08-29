import express from "express";
import responses from "./api/responses.js";
import responseById from "./api/responses/[id].js";
import hello from "./api/hello.js";
import test from "./api/test.js";
import guests from "./api/guests.js"

const app = express();
const PORT = process.env.PORT || 5555;

// Middleware to parse JSON
app.use(express.json());

// Register endpoints explicitly
app.all("/api/responses", responses);
app.all("/api/guests", guests);
app.all("/api/responses/:id", responseById); // pass req directly, handler uses req.params.id
app.all("/api/hello", hello);
app.all("/api/test", test);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
