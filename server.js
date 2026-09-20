require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let db;
async function connectDB() {
  try {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    db = client.db();
    console.log("✅ MongoDB Connected: " + db.databaseName);
  } catch (e) {
    console.log("❌ MongoDB Error: " + e.message);
  }
}
connectDB();

// HOME
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// CREATE ORDER
app.post("/api/create-order", async (req, res) => {
  try {
    const data = req.body;
    data.status = "pending";
    data.createdAt = new Date();
    data.trackingCode = "LV-" + Date.now();
    const result = await db.collection("orders").insertOne(data);
    res.json({ success: true, id: result.insertedId, tracking: data.trackingCode });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// VALIDATE ORDER
app.post("/api/validate/:id", async (req, res) => {
  try {
    await db.collection("orders").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: "validated" } }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET ORDERS FOR RIDER / ADMIN / MERCHANT
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await db.collection("orders").find({}).sort({ createdAt: -1 }).toArray();
    res.json(orders);
  } catch (e) {
    res.json([]);
  }
});

// NOTCHPAY PAYMENT INIT (SAFE VERSION)
app.post("/api/pay", async (req, res) => {
  try {
    const { amount, email, orderId } = req.body;
    const response = await axios.post("https://api.notchpay.co/payments/initialize", {
      amount: amount,
      currency: "XAF",
      email: email,
      reference: orderId || "LV-" + Date.now(),
      description: "Livrappel Payment"
    }, {
      headers: { "Authorization": process.env.PRIVATE_KEY }
    });
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.response ? e.response.data : e.message });
  }
});

app.listen(PORT, () => {
  console.log("=====================================");
  console.log("✅ V7.6.5 ULTIMATE RUNNING");
  console.log(" PORT: " + PORT);
  console.log(" ADMIN: " + process.env.ADMIN_USER);
  console.log(" BASE_URL: " + process.env.BASE_URL);
  console.log("=====================================");
});