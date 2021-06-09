const { sourceConfig, implementingPartnerReferrence } = require("../configs");

const dhis2ProgramHelper = require("../helpers/dhis2-program.helper");
const dhis2OptionsHelper = require("../helpers/dhis2-options.helper");
const dhis2UtilHelper = require("../helpers/dhis2-util.helper");
const logsHelper = require("../helpers/logs.helper");

async function startAppProcess() {
  try {
    const { username, password, url: serverUrl } = sourceConfig;
    const headers = dhis2UtilHelper.getHttpAuthorizationHeader(
      username,
      password
    );
    const programs = await dhis2ProgramHelper.getAllProgramsFromServer(
      headers,
      serverUrl
    );
    const implementingPartnerOptions =
      await dhis2OptionsHelper.getImpelemntingPartnerOptionsFromServer(
        headers,
        serverUrl
      );
    console.log(implementingPartnerOptions);
    const users = [];
  } catch (error) {
    await logsHelper.addLogs(
      "error",
      error.message || error,
      "startAppProcess"
    );
  }
}

module.exports = {
  startAppProcess,
};
