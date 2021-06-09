const { sourceConfig, implementingPartnerReferrence } = require("../configs");

const dhis2ProgramHelper = require("../helpers/dhis2-program.helper");
const dhis2OptionsHelper = require("../helpers/dhis2-options.helper");
const dhis2UserHelper = require("../helpers/dhis2-user.helper");
const dhis2EventHelper = require("../helpers/dhis2-event.helper");
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
    const users = await dhis2UserHelper.getUserInfoFromServer(
      headers,
      serverUrl,
      implementingPartnerOptions
    );
    for (const program of programs) {
      const events = await dhis2EventHelper.getEventsFromServer(
        headers,
        serverUrl,
        implementingPartnerReferrence,
        users,
        program
      );
      if (events.length > 0) console.log(`${JSON.stringify(events)}\n\n`);
    }
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
