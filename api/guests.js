import { MongoClient } from "mongodb";
import 'dotenv/config';

let cachedClient = null;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (!cachedClient) {
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      cachedClient = client;
    }

    const db = cachedClient.db("rsvp");
    const collection = db.collection("guests");

    if (req.method === "GET") {
      const { attend_wedding, attend_welcome_party } = req.query;

      const match = {};

      // AFTER replaceRoot, fields are top-level
      if (attend_wedding === "true") {
        match.attend_wedding = true;
      } else if (attend_wedding === "false") {
        match.attend_wedding = false;
      }

      if (attend_welcome_party === "true") {
        match.attend_welcome_party = true;
      } else if (attend_welcome_party === "false") {
        match.attend_welcome_party = false;
      }

      const pipeline = [
        // ✅ FIRST: flatten guest object
        {
          $replaceRoot: {
            newRoot: "$guests",
          },
        },

        // ✅ THEN: apply filters if needed
        ...(Object.keys(match).length > 0
          ? [
              {
                $match: match,
              },
            ]
          : []),

        // optional sort
        {
          $sort: { name: 1 },
        },
      ];

      const guests = await collection.aggregate(pipeline).toArray();

      return res.status(200).json({ guests });
    }

    res.setHeader("Allow", "GET,OPTIONS");
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
}