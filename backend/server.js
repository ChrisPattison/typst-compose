const util = require("util");
const { exec } = require("child_process");

/* Split up a string into chunks */
String.prototype.chunk = function (size) {
  return [].concat.apply(
    [],
    this.split("").map(function (x, i) {
      return i % size ? [] : this.slice(i, i + size);
    }, this),
  );
};

/* Returns a promise for all output of a stream */
function unchunckedReadStream(stream) {
  return new Promise((resolve) => {
    const chunks = [];

    stream.on("readable", () => {
      let chunk;
      while (null !== (chunk = stream.read())) {
        chunks.push(chunk);
      }
    });

    stream.on("end", async () => {
      const content = chunks.join("");
      resolve(content);
    });
  });
}

/* Compile preview */
async function compileTypst(body) {
  try {
    console.log(`Build requested at ${new Date(Date.now()).toTimeString()}`);
    const buildStart = Date.now();

    pandocSubprocess = exec("pandoc --mathml -f gfm -t html", {
      maxBuffer: 1024 * 1024,
      timeout: 3000,
    });

    pandocSubprocess.stdin.write(body);
    // // Write to stdin in chunks
    // for (const chunk in body.chunk(4 * 1024)) {
    //   console.log(chunk);
    //   pandocSubprocess.stdin.write(chunk);
    // }
    pandocSubprocess.stdin.end();

    output = await unchunckedReadStream(pandocSubprocess.stdout);

    console.log(`Build completed in ${Date.now() - buildStart}ms`);
    console.log(output);
    return output;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

/* Server setup */
const { createServer } = require("node:http");
const hostname = "127.0.0.1";
const port = 3000;

const server = createServer(async (req, res) => {
  // Dump the headers
  // for (var key in req.headers) {
  //   console.log(key, req.headers[key]);
  // }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html");
  res.setHeader(
    "Access-Control-Allow-Origin",
    "moz-extension://a90ee53b-b1da-43e7-87b2-e8f48b7aab0d",
  );

  content = await unchunckedReadStream(req);
  response = await compileTypst(content);
  res.write(response);
  res.end();
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
