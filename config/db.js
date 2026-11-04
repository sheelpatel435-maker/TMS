const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({
    path: path.join(__dirname, "../backend/.env")
});

const useSsl =
    String(process.env.DB_SSL || "").toLowerCase() === "true" ||
    String(process.env.DB_SSL || "") === "1";

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ...(useSsl
        ? {
              ssl: {
                  rejectUnauthorized:
                      String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "false")
                          .toLowerCase() !== "false"
              }
          }
        : {})
});

module.exports = db;
