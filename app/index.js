const {
  sourceConfig,
  implementingPartnerDataElementReferrence,
  subImplementingPartnerDataElementReferrence,
  implementingPartnerAttributeReferrence,
  subImplementingPartnerAttributeReferrence,
} = require("../configs");

const dhis2ProgramHelper = require("../helpers/dhis2-program.helper");
const dhis2OptionsHelper = require("../helpers/dhis2-options.helper");
const dhis2UserHelper = require("../helpers/dhis2-user.helper");
const dhis2EventHelper = require("../helpers/dhis2-event.helper");
const dhis2UtilHelper = require("../helpers/dhis2-util.helper");
const logsHelper = require("../helpers/logs.helper");
const dhis2TrackerDataHelper = require("../helpers/dhis2-tracker-data.helper");
const { writeToFile } = require("../helpers/file-manipulation.helper");

async function startAppProcess() {
  const implementingPartnerOptionSetId = "mMUDhf2vSwq";
  const subImplementingPartnerOptionSetId = "WMIYg0XjfJz";
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
      await dhis2OptionsHelper.getOptionsByOptionSetId(
        headers,
        serverUrl,
        implementingPartnerOptionSetId
      );
    const subImplementingPartnerOptions =
      await dhis2OptionsHelper.getOptionsByOptionSetId(
        headers,
        serverUrl,
        subImplementingPartnerOptionSetId
      );
    const users = await dhis2UserHelper.getUserInfoFromServer(
      headers,
      serverUrl,
      implementingPartnerOptions,
      subImplementingPartnerOptions
    );
    for (const program of programs) {
      if (program.isTrackerBased) {
        const trakerData =
          await dhis2TrackerDataHelper.getTrackerDataFromServer(
            headers,
            serverUrl,
            implementingPartnerAttributeReferrence,
            subImplementingPartnerAttributeReferrence,
            users,
            program
          );
        if (trakerData.length > 0) {
          const response =
            await dhis2TrackerDataHelper.uploadTrackerDataToTheServer(
              headers,
              serverUrl,
              trakerData,
              program.name
            );
          const date = dhis2UtilHelper.getFormattedDate(new Date());
          writeToFile(
            "response",
            `[${program.name}] tracker server response ${date}`,
            response
          );
        }
      }
      const events = await dhis2EventHelper.getEventsFromServer(
        headers,
        serverUrl,
        implementingPartnerDataElementReferrence,
        subImplementingPartnerDataElementReferrence,
        users,
        program
      );
      if (events.length > 0) {
        writeToFile("output", program.name, events);
        const response = await dhis2EventHelper.uploadEventsToTheServer(
          headers,
          serverUrl,
          events,
          program.name
        );
        const date = dhis2UtilHelper.getFormattedDate(new Date());
        writeToFile(
          "response",
          `[${program.name}] server response ${date}`,
          response
        );
      }
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
