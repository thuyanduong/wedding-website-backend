// /api/responses/

import { MongoClient, ObjectId } from "mongodb";
import 'dotenv/config';
import nodemailer from "nodemailer";

let cachedClient = null;

function generateConfirmationEmail(data) {
  const { email, phone, comments, guests } = data;

  let guestHtml = guests.map(guest => {
    return `
      <div style="margin-bottom: 12px; padding: 8px; border-bottom: 1px solid #ccc;">
        <p><strong>Name:</strong> ${guest.name}</p>
        <p><strong>Attending Welcome Party:</strong> ${guest.attend_welcome_party ? "Yes" : "No"}</p>
        <p><strong>Attending Wedding:</strong> ${guest.attend_wedding ? "Yes" : "No"}</p>
        ${guest.wedding_entree ? `<p><strong>Wedding Entree:</strong> ${guest.wedding_entree}</p>` : ""}
        ${guest.dietary_restrictions ? `<p><strong>Dietary Restrictions:</strong> ${guest.dietary_restrictions}</p>` : ""}
      </div>
    `;
  }).join("");

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2>Thank you for your RSVP!</h2>
      <p>Your group has RSVPed with the following information below.</p>
      <p>You can update your RSVP response any time before March 15th, 2026 through our wedding website.</p>
      <p><strong>Phone Number:</strong> ${phone}</p>
      ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ""}
      <h3>Guests:</h3>
      ${guestHtml}
    </div>
  `;
}

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
      if (newResponse.comments.trim() === "") {
        mutation.comments = null
      } else {
        mutation.comments = newResponse.comments
      }
      mutation.guests = []

      for (const guest of newResponse.guests) {
        guest.dietary_restrictions = guest.dietary_restrictions.trim()
        if (guest.attend_wedding === false) {
          guest.wedding_entree = null
        }
        mutation.guests.push(guest)
      }
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] || // Handles proxies/load balancers
        req.socket.remoteAddress;

      mutation.ip_address = ip;

      console.log(mutation)
      const result = await collection.updateOne(filter, { $set: mutation });
      if (result.modifiedCount === 1) {

        //Send email confirmation 
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_USER, // your gmail address
            pass: process.env.GMAIL_APP_PASSWORD, // app password
          },
        });

        const emailData = mutation

        const mailOptions = {
          from: '"Thuyan & Jerry" <annjerrygetmarried@gmail.com>',
          to: newResponse.email,
          subject: "Thank You for Your RSVP!",
          html: generateConfirmationEmail(emailData)
        };

        await transporter.sendMail(mailOptions);

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
