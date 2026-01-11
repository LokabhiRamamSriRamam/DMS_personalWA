import express from "express";
import dotenv from "dotenv";
import wasenderRoutes from "./routes/wasender.routes.js";
import webhookRoutes from "./routes/webhiook.routes.js";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/wasender", wasenderRoutes);
app.use("/api/webhook", webhookRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
