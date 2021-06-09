const { sortBy, flattenDeep } = require("lodash");

const httpHelper = require("./http.helper");
const logsHelper = require("./logs.helper");

async function getAllProgramsFromServer(headers, serverUrl) {
  const programs = [];
  try {
    await logsHelper.addLogs(
      "info",
      `Discovering programs metadata from server :: ${serverUrl}`,
      "getAllProgramsFromServer"
    );
    const url = `${serverUrl}/api/programs.json?fields=id,name`;
    const response = await httpHelper.getHttp(headers, url);
    programs.push(response.programs || []);
  } catch (error) {
    await logsHelper.addLogs(
      "error",
      error.message || error,
      "getAllProgramsFromServer"
    );
  }
  return sortBy(flattenDeep(programs), ["name"]);
}

module.exports = {
  getAllProgramsFromServer,
};
