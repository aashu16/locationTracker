// var app = require("express")();
// var http = require("http").createServer(app);
// var io = require("socket.io")(http);

const Koa = require("koa");
const Router = require("koa-router");
const bodyParser = require("koa-bodyparser");
const { promisify } = require("util");

const app = new Koa();
const router = new Router();
const logger = require("koa-logger");
const cors = require("@koa/cors");

const redis = require("redis");

const client = redis.createClient();
client.on("error", function(error) {
  console.error(error);
});

const getAsync = promisify(client.get).bind(client);

app.use(
  cors({
    origin: "*",
    allowHeaders: ["Content-Type"],
  }),
);

app.use(bodyParser());

app.use(logger());

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = err.message;
    ctx.app.emit("error", err, ctx);
  }
});

router.get("/", (ctx, next) => {
  ctx.body = {
    message: "Hello, world!",
    status: "success",
  };
});

router.get("/getLocation/:code", async (ctx, next) => {
  const locationCode = ctx.params.code;

  const reply = await getAsync(locationCode);

  if (reply) {
    const coords = reply.split(",");
    ctx.status = 200;
    ctx.body = {
      status: "success",
      lat: coords[0],
      lng: coords[1],
    };
  } else {
    ctx.status = 404;
    ctx.body = {
      status: "failure",
    };
  }
});

router.get("/new/:code", (ctx, next) => {
  const locationCode = ctx.params.code;

  ctx.status = 200;
  ctx.body = { status: "success", code: locationCode };
});

router.post("/setLocation/:code", (ctx, next) => {
  const locationCode = ctx.params.code;
  const coords = ctx.request.body["lat"] + "," + ctx.request.body["lng"];

  client.set(locationCode, coords);

  ctx.status = 200;
  ctx.response.body = {
    status: "success",
  };
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(8080);
