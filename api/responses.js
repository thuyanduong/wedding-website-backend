import { MongoClient } from "mongodb";
import 'dotenv/config'; 

let cachedClient = null;

export default async function handler(req, res) {
  try {
    // Reuse client if already connected
    if (!cachedClient) {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      cachedClient = client;
    }

    const db = cachedClient.db("rsvp");
    const collection = db.collection("responses"); // your collection name

    // Simple find query
    const users = await collection.find({}).toArray();

    res.status(200).json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
}
