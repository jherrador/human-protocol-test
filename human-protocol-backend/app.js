require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const basicAuth = require('express-basic-auth')
const app = express();

// Settings
app.set("appName", process.env.APP_NAME);
app.set("port", process.env.PORT);

// MiddleWares
app.use(express.json());
app.use(morgan("dev"));
app.use(basicAuth({
    users: { 'admin': 'human-protocol' }
}));

// Routes
const routes = require("./routes/api.routes");

app.use(routes);

app.listen(3000, () => {
    console.log(`${app.get("appName")} application running on port ${app.get("port")}`);
});

module.exports = app
