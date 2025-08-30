// /api/responses/

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
    const collection = db.collection("responses");

    if (req.method === "GET") {
      const responses = await collection.find({}).toArray();
      return res.status(200).json({ responses });
    }

    if (req.method === "POST") {
      const newResponse = req.body;
      console.log(newResponse)
      const filter = { _id: new ObjectId(newResponse.id) }
      const mutation = {}
      mutation.updated_at = new Date()
      mutation.email = newResponse.email
      mutation.phone = newResponse.phone
      mutation.comments = newResponse.comments
      mutation.guests = []

      for(const guest of newResponse.guests){
        if (guest.attend_wedding === false) {
          guest.wedding_entree = null
        }
        mutation.guests.push(guest)
      }
      console.log(mutation)
      const result = await collection.updateOne(filter, { $set: mutation });
      if (result.modifiedCount === 1) {
        return res.status(201).json({ message: "Response recorded", result });

      } else {
        return res.status(400).json({ message: "Error: Response failed to save", result });

      }
    }

    // Method not allowed
    res.setHeader("Allow", "GET,POST,OPTIONS");
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
}
