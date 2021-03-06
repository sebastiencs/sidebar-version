const http = require('http')
const url = require('url')
const querystring = require('querystring')
const semver = require('semver-extra')
const fs = require('fs');
const log = require('gelf-pro');

//log.setConfig({host: '172.17.0.1'});

const sendVersion = (req, res) => {

  const params = querystring.parse(url.parse(req.url).query);

  log.info('sidebar-version request', {
    ip: req.headers['x-real-ip'],
    version: params.version
  });

  fs.readFile('last_version', 'utf8', (err, data) => {
    if (err) {
      console.log(err);
      res.writeHead(500)
    }
    else {
      const client = params.version
      const last = data
      res.writeHead(200, {"Content-Type": "text/plain"})
      res.write(semver.max([client, last]) === client ? "1" : "0")
    }
    res.end()
  });
}

const receiveVersion = (req, res, body) => {
  try {
    const params =  querystring.parse(body);
    const version = semver.isStable(params.new) && params.new
    fs.writeFile("last_version", version, (err) => {
      if (err) {
	console.log(err)
	res.writeHead(500)
      }
      else {
	console.log(`New version saved: ${version}`);
	res.writeHead(200)
      }
      res.end()
    });
  }
  catch (e) {
    console.log(`Fail while receiving new version:`);
    console.log(e);
    res.writeHead(400)
    res.end()
  }
}

const server = http.createServer((req, res) => {

  const page = url.parse(req.url).pathname

  if (page == "/islast" && req.method === "GET") {
    sendVersion(req, res)
  }
  else if (page == "/update/last"  && req.method === "POST"
	   && req.headers["x-real-ip"] === "172.17.0.2") {
    let body = "";
    req.on("data", (data) => {
      body +=data;
    });
    req.on("end",function(){
      receiveVersion(req, res, body)
    });
  }
  else {
    console.log(`unknown request: ${req.method} ${page}`);
    res.writeHead(400)
    res.end()
  }

}).on("listening", () => {
  console.log("sidebar-version listening on port " + server.address().port);
}).listen(process.env.PORT || 5353)
