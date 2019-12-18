const proxy = require("http-proxy-middleware");

module.exports = function(app) {
  app.use(
    proxy("/api", {
      target: "https://www.v2ex.com",
      secure: false,
      changeOrigin: true,
    })
  );
};
