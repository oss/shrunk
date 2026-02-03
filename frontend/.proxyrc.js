const { createProxyMiddleware } = require("http-proxy-middleware");

// Proxy for used in development to mimic httpd.
// Serves frontend on /app endpoints
// Forwards all other requests to backend, including /api
module.exports = function (app) {
    app.use(createProxyMiddleware({
	pathFilter: (path) => (!path.startsWith("/app")),
	target: "http://backend:3050",
    }));

    app.use(createProxyMiddleware({
	pathFilter: (path) => path.startsWith("/api"),
	target: "http://backend:3050",
    }));
};
