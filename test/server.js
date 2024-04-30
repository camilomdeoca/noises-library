import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer } from "ws";

const hostname = 'localhost';
const port = 3000;

const clients = [];

function log() {
  let args = []
  for (let arg of arguments) {
    args.push(arg);
  }
  console.log("[server]", args.join(" "));
}

const server = http.createServer((req, res) => {
  const filePath = '.' + req.url;
  const extname = path.extname(filePath);
  const contentTypesByExtension = {
    '.html': "text/html",
    '.css':  "text/css",
    '.js':   "text/javascript"
  };
  const contentType = contentTypesByExtension[extname];

  fs.readFile(filePath, (error, content) => {
    if (error) {
      log(`File: "${filePath}" does not exist.`)
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('404: File not found.');
    } else {
      log(`Serving file: "${filePath}".`)
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}).listen(port);

const wss = new WebSocketServer({ server });
wss.on('connection', (client, req) => {
  log(`${req.socket.remoteAddress}:${req.socket.remotePort}`, "connected");
  clients.push(client);
  client.on('close', () => {
    let pos = clients.indexOf(client);
    clients.splice(pos, 1);
    log(`${req.socket.remoteAddress}:${req.socket.remotePort}`, "disconected");
  });
});

fs.watch("./test/bundle.js", () => {
  for (const client of clients) {
    client.send("reload");
  }
});

log(`Server running at http://${hostname}:${port}`);
