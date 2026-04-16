import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true
    });

    console.log(`✅ MongoDB connected: ${connection.connection.host}`);

    // Drop stale indexes that conflict with the current schema
    try {
      await connection.connection.collection('invoices').dropIndex('invoice_number_1');
      console.log('🗑️  Dropped stale index: invoice_number_1');
    } catch (_) { /* index doesn't exist — that's fine */ }

  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
