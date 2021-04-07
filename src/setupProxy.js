/*
Author: Hermann Plass (hermann.plass@gmail.com)
setupProxy.js (c) 2020
Desc: description
Created:  2020-12-30T12:29:45.464Z
Modified: 2021-01-18T00:24:43.068Z
*/

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  var route = '/api';
  var target = process.env.PROXY;
  
  app.use(
    route,
    createProxyMiddleware({
      target: target,
      changeOrigin: true,
    })
  );

  console.log(`Starting proxy. Requests for route '${route}' will be redirected to '${target}'`);
};