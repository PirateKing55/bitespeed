import express from "express";
import identifyRouter from "./routes/identify";
import { initDb } from "./db";
import dotenv from "dotenv";
import { errorHandler } from "./middlewares/errorHandler";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const ext = process.env.NODE_ENV === "production" ? "js" : "ts";

// Swagger setup
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Contact Identification API",
      version: "1.0.0",
      description:
        "API for identifying contacts and managing consolidated contact information.",
    },
  },
  apis: [
    path.join(__dirname, `./routes/*.${ext}`),
    path.join(__dirname, `./schemas/*.${ext}`),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", identifyRouter);

app.get("/", (_req, res) => {
  res.send("Welcome to Bitespeed API");
});

app.get("/api", (_req, res) => {
  res.send("Welcome to Bitespeed API");
});

//Catch-all for undefined routes
app.all("/{*any}", (req, res, next) => {
  res.status(404).json({ error: "This route does not exist" });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("FATAL ERROR: DATABASE_URL is not defined.");
      process.exit(1);
    }
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
};

startServer();
