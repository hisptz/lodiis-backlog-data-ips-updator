const _ = require("lodash");
const fs = require("fs");
const shelljs = require("shelljs");
const Promise = require("promise");
const logsHelper = require("./logs.helper");

const fileDir = "files-folder";

function getFilesNamesUsingPath(path) {
  const fileResponse = shelljs.ls(`${path}`);
  return _.flatMapDeep(
    _.map(
      _.filter(fileResponse.stdout.split(`\n`), (name) => name !== ""),
      (name) => name.trim()
    )
  );
}

function getFileNamesFromDirectories(dir) {
  dir = `${fileDir}/${dir}`;
  return getFilesNamesUsingPath(dir);
}

function intiateFilesDirectories(directories) {
  return new Promise((resolve, reject) => {
    const response = shelljs.mkdir("-p", directories);
    if (response && !response.stderr) {
      resolve();
    } else {
      reject(response.stderr);
    }
  });
}

function writeToFile(dir, filename, data, shouldStringify = true, flag = "w") {
  dir = `${fileDir}/${dir}`;
  if (!fs.existsSync(dir)) {
    intiateFilesDirectories(dir);
  }
  return new Promise((resolve, reject) => {
    data = shouldStringify ? JSON.stringify(data) : data;
    filename = getSanitizedFileName(filename);
    fs.writeFile(`${dir}/${filename}.txt`, data, { flag }, async (error) => {
      if (error) {
        console.log(JSON.stringify({ error, type: "writeToFile" }));
      } else {
        resolve();
      }
    });
  });
}

async function readDataFromFile(dir, filename) {
  dir = `${fileDir}/${dir}`;
  let data = [];
  filename = getSanitizedFileName(filename);
  return new Promise((resolve) => {
    fs.readFile(`${dir}/${filename}.txt`, (error, response) => {
      if (error) {
        console.log(JSON.stringify({ error, type: "readDataFromFile" }));
      } else {
        data = JSON.parse(response);
      }
      resolve(data);
    });
  });
}

async function writeMappedFormDataToTheFile(dir, formMapping) {
  const filenames = Object.keys(formMapping);
  try {
    for (let filename of filenames) {
      const data = formMapping[filename];
      await writeToFile(dir, filename, data);
    }
  } catch (error) {
    await logsHelper.addLogs(
      "ERROR",
      JSON.stringify(error),
      "writeMappedFormDataToTheFile"
    );
  } finally {
    await writeToFile(dir, "Form name", { data: filenames });
  }
}

function getSanitizedFileName(filename) {
  filename = _.join(
    _.filter(filename.split("/"), (key) => key.trim() !== ""),
    "_"
  );
  return _.join(
    _.filter(filename.split(" "), (key) => key.trim() !== ""),
    "_"
  );
}

module.exports = {
  intiateFilesDirectories,
  getFilesNamesUsingPath,
  writeMappedFormDataToTheFile,
  readDataFromFile,
  writeToFile,
  fileDir,
  getFileNamesFromDirectories,
};
