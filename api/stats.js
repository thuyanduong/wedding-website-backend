// /api/guests/

import { MongoClient } from "mongodb";
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
        const collection = db.collection("guests"); // your collection name

        // Simple find query
        const stats = await collection.aggregate([
            {
                $group: {
                    _id: null,
                    totalInvitees: {
                        $sum: 1
                    },
                    notYetRSVPed: {
                        $sum: { $cond: [{ $eq: ["$guests.attend_wedding", null] }, 1, 0] }
                    },
                    attendingWedding: {
                        $sum: { $cond: [{ $eq: ["$guests.attend_wedding", true] }, 1, 0] }
                    },
                    notAttendingWedding: {
                        $sum: { $cond: [{ $eq: ["$guests.attend_wedding", false] }, 1, 0] }
                    },

                    // Adults / Children / Toddlers attending wedding
                    adultsAttendingWedding: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.attend_wedding", true] }, { $eq: ["$guests.age_group", "Adult"] }] },
                                1,
                                0
                            ]
                        }
                    },
                    childrenAttendingWedding: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.attend_wedding", true] }, { $eq: ["$guests.age_group", "Child"] }] },
                                1,
                                0
                            ]
                        }
                    },
                    toddlersAttendingWedding: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.attend_wedding", true] }, { $eq: ["$guests.age_group", "Toddler"] }] },
                                1,
                                0
                            ]
                        }
                    },

                    // Entrees (only for Adults)
                    adultBeefEntrees: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.wedding_entree", "Beef"] }, { $eq: ["$guests.age_group", "Adult"] }] },
                                1,
                                0
                            ]
                        }
                    },
                    adultFishEntrees: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.wedding_entree", "Fish"] }, { $eq: ["$guests.age_group", "Adult"] }] },
                                1,
                                0
                            ]
                        }
                    },
                    adultVegetarianEntrees: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.wedding_entree", "Vegetarian"] }, { $eq: ["$guests.age_group", "Adult"] }] },
                                1,
                                0
                            ]
                        }
                    },

                    // Entrees (only for Children)
                    childBeefEntrees: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.wedding_entree", "Beef"] }, { $eq: ["$guests.age_group", "Child"] }] },
                                1,
                                0
                            ]
                        }
                    },
                    childFishEntrees: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.wedding_entree", "Fish"] }, { $eq: ["$guests.age_group", "Child"] }] },
                                1,
                                0
                            ]
                        }
                    },
                    childVegetarianEntrees: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.wedding_entree", "Vegetarian"] }, { $eq: ["$guests.age_group", "Child"] }] },
                                1,
                                0
                            ]
                        }
                    },
                    childChildrenEntrees: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.wedding_entree", "Child"] }, { $eq: ["$guests.age_group", "Child"] }] },
                                1,
                                0
                            ]
                        }
                    },

                    // Welcome party
                    attendingWelcomeParty: {
                        $sum: { $cond: [{ $eq: ["$guests.attend_welcome_party", true] }, 1, 0] }
                    },
                    notAttendingWelcomeParty: {
                        $sum: { $cond: [{ $eq: ["$guests.attend_welcome_party", false] }, 1, 0] }
                    },

                    adultsAttendingWelcomeParty: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.attend_welcome_party", true] }, { $eq: ["$guests.age_group", "Adult"] }] },
                                1,
                                0
                            ]
                        }
                    },
                    childrenAttendingWelcomeParty: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.attend_welcome_party", true] }, { $eq: ["$guests.age_group", "Child"] }] },
                                1,
                                0
                            ]
                        }
                    },
                    toddlersAttendingWelcomeParty: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$guests.attend_welcome_party", true] }, { $eq: ["$guests.age_group", "Toddler"] }] },
                                1,
                                0
                            ]
                        }
                    },

                    // Error Checking
                    badEntreeData: {
                        $sum: {
                            $cond: [
                                {
                                    $not: {
                                        $in: ["$guests.wedding_entree", ["Beef", "Fish", "Vegetarian", "Children's Meal", null]]
                                    }
                                },
                                1,
                                0
                            ]
                        }
                    },
                    badAgeData: {
                        $sum: {
                            $cond: [
                                {
                                    $not: {
                                        $in: ["$guests.age_group", ["Adult", "Child", "Toddler", null]]
                                    }
                                },
                                1,
                                0
                            ]
                        }
                    }

                }
            }
        ]).toArray();

        res.status(200).json(stats[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
}
