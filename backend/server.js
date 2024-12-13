const util = require("util");
const exec = util.promisify(require('node:child_process').exec);

const fsPromises = require('node:fs/promises');
const { resolve } = require('node:path');

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
  let inFile;
  let buildDir;
  let outFile;
  try {
    console.log(`Build requested at ${new Date(Date.now()).toTimeString()}`);
    const buildStart = Date.now();

    // Write input files
    buildDir = resolve(await fsPromises.mkdtemp('typst-build-'));
    inFile = await fsPromises.open(`${buildDir}/email.typ`, 'w');
    await inFile.write(body);

    // Execute
    try {
      await exec("typst c --format svg --diagnostic-format short email.typ",
                                            {timeout: 3000, cwd:buildDir});
      console.log(`Build completed in ${Date.now() - buildStart}ms`);
      outFile = await fsPromises.open(`${buildDir}/email.svg`);
      output =  await outFile.readFile({encoding:'utf-8'});
      return output;
    } catch ({stdout, stderr}) {
      console.log(`Build failed in ${Date.now() - buildStart}ms`);
      return stderr;
    }
  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    // Cleanup
    if (inFile != undefined) { inFile.close(); }
    if (outFile  != undefined) { outFile.close(); }
    fsPromises.rm(buildDir, {force:true, recursive:true});
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

