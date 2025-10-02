const appConfig = {
    baseUrl: __DEV__
        ? "http://localhost:5000/api"               // development
        : "https://poster-maker-pro.onrender.com/api" // production
};

module.exports = appConfig;