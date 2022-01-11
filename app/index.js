const {
    sourceConfig,
    implementingPartnerDataElementReferrence,
    subImplementingPartnerDataElementReferrence,
    implementingPartnerAttributeReferrence,
    subImplementingPartnerAttributeReferrence,
    serviceProviderAttributeReference,
    serviceProviderDataElementReference,
} = require("../configs");

const dhis2ProgramHelper = require("../helpers/dhis2-program.helper");
const dhis2OptionsHelper = require("../helpers/dhis2-options.helper");
const dhis2UserHelper = require("../helpers/dhis2-user.helper");
const dhis2EventHelper = require("../helpers/dhis2-event.helper");
const dhis2UtilHelper = require("../helpers/dhis2-util.helper");
const logsHelper = require("../helpers/logs.helper");
const dhis2TrackerDataHelper = require("../helpers/dhis2-tracker-data.helper");

async function startAppProcess(shouldUpdateAllData) {
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
            const tieResponse = [];
            const eventResponse = [];
            if (program.isTrackerBased) {
                await dhis2TrackerDataHelper.getAndUploadTrackerDataFromServer(
                    headers,
                    serverUrl,
                    shouldUpdateAllData,
                    implementingPartnerAttributeReferrence,
                    subImplementingPartnerAttributeReferrence,
                    serviceProviderAttributeReference,
                    users,
                    program
                );
            }
            await dhis2EventHelper.getAndUploadEventsFromServer(
                headers,
                serverUrl,
                shouldUpdateAllData,
                implementingPartnerDataElementReferrence,
                subImplementingPartnerDataElementReferrence,
                serviceProviderDataElementReference,
                users,
                program
            );
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