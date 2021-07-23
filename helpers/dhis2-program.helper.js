const { sortBy, flattenDeep, map } = require("lodash");

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
    const url = `${serverUrl}/api/programs.json?fields=id,name,programType`;
    const response = await httpHelper.getHttp(headers, url);
    programs.push(
      map(response.programs || [], (program) => {
        const { id, name, programType } = program;
        return {
          id,
          name,
          isTrackerBased: programType === "WITH_REGISTRATION",
        };
      })
    );
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
