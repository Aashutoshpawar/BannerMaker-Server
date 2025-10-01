const { base } = require("../Models/creationSchema");

const appConfig = {
    baseUrl: "http://localhost:5000/api", // development
    // baseUrl: "https://poster-maker-pro.onrender.com/api", // production
}
module.exports = appConfig;