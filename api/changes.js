// /api/changes/

import { MongoClient, ObjectId } from "mongodb";
import 'dotenv/config';

let cachedClient = null;

export default async function handler(req, res) {
    // ✅ CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*"); // in prod, replace * with your frontend domain
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // ✅ Handle preflight OPTIONS request
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

        if (req.method === "GET") {
            // Fetch all unreviewed changes
            const changes = await collection.find({ }).sort({_id: -1}).toArray();
            return res.status(200).json({ changes });
        }

        if (req.method === "POST") {
            const { id } = req.body;

            if (!id) {
                return res.status(400).json({ error: "Missing id in request body" });
            }

            const result = await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { reviewed: true } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: "Document not found" });
            }

            return res.status(200).json({ message: "RSVP acknowledged", modifiedCount: result.modifiedCount });
        }

        // If method is neither GET nor POST
        res.status(405).json({ error: "Method not allowed" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch or update data" });
    }
}
