// /api/changes/

import { MongoClient, ObjectId } from "mongodb";
import 'dotenv/config';

let cachedClient = null;

export default async function handler(req, res) {
    // ✅ CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*"); // change "*" to your frontend domain in prod
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // ✅ Handle preflight (OPTIONS) request
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        // Reuse client if already connected
        if (!cachedClient) {
            const client = new MongoClient(process.env.MONGODB_URI);
            await client.connect();
            cachedClient = client;
        }

        const db = cachedClient.db("rsvp");
        const collection = db.collection("changes");

        const changes = await collection.find({ reviewed: false }).toArray();
        return res.status(200).json({ changes });


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
}
