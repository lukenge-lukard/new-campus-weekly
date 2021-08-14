const express = require("express");
const path = require("path");
// const mysql = require("mysql");
const dotenv = require("dotenv");
// const cookieParser = require("cookie-parser");

dotenv.config({ path: "./env" });

const app = express();


const publicDirectory = path.join(__dirname, "./public");
app.use(express.static(publicDirectory));


app.set("view engine", "hbs");



//Define Routes
// app.use("/", require("./routes/pages"));
// app.use("/auth", require("./routes/auth"));
app.get("/", (req, res) => {
    res.render("index");
});

app.listen(5002, () => {
  console.log("Listening on port 5002");
});
