// /api/responses/[id].js

import { MongoClient, ObjectId } from "mongodb";
import 'dotenv/config';

let cachedClient = null;

export default async function handler(req, res) {
    // ✅ CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*"); // change "*" in prod
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Use req.params.id for Express, fallback to req.query.id for Vercel
    const id = req.params?.id || req.query?.id;

    if (!id) {
        return res.status(400).json({ error: "Missing id parameter" });
    }

    try {
        // Reuse MongoClient if already connected
        if (!cachedClient) {
            const client = new MongoClient(process.env.MONGODB_URI);
            await client.connect();
            cachedClient = client;
        }

        const db = cachedClient.db("rsvp");
        const collection = db.collection("changes");

        // Find the change history for a single response by _id
        const history = await collection
            .find({ id: new ObjectId(id) })
            .sort({ created_at: -1 })  // descending order
            .toArray();

        if (!history) {
            return res.status(404).json({ error: "Data not found" });
        }

        res.status(200).json({ history });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
}
