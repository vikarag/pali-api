import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "8080", 10),
  host: process.env.HOST || "0.0.0.0",
  dbPath: path.resolve(process.env.DB_PATH || "./data/dpd.db"),
};
