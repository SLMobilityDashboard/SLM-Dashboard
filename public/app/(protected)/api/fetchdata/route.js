// app/api/data/route.js

import clientPromise from "@/lib/mongodb"; // Adjust the import path as necessary

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(); // uses the default database as per your URI
    const collection = db.collection("apispec"); // replace with your collection name

    // Fetch all documents from the collection
    const data = await collection.find({}).toArray();

    // If there are records, get the last one
    const lastRecord = data.length > 0 ? data[data.length - 1] : null;
    // console.log("Last record:", lastRecord);

    return new Response(JSON.stringify(lastRecord), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Failed to connect to MongoDB", { status: 500 });
  }
}
