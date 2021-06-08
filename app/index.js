const { sourceConfig } = require("../configs");

const dhis2UtilHelper = require("../helpers/dhis2-util.helper");
const logsHelper = require("../helpers/logs.helper");

async function startAppProcess() {
  try {
    const { username, password, url: serverUrl } = sourceConfig;
    const headers = dhis2UtilHelper.getHttpAuthorizationHeader(
      username,
      password
    );
    console.log({ serverUrl, headers });
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
