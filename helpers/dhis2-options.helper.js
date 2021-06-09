const { flattenDeep } = require("lodash");

const httpHelper = require("./http.helper");
const logsHelper = require("./logs.helper");

const implementingPartnerOptionSetId = "mMUDhf2vSwq";

async function getImpelemntingPartnerOptionsFromServer(headers, serverUrl) {
  const options = [];
  try {
    await logsHelper.addLogs(
      "info",
      `Discovering options for :: ${implementingPartnerOptionSetId}`,
      "getImpelemntingPartnerOptionsFromServer"
    );
    const url = `${serverUrl}/api/optionSets/${implementingPartnerOptionSetId}.json?fields=options[code,id]`;
    const response = await httpHelper.getHttp(headers, url);
    options.push(response.options || []);
  } catch (error) {
    await logsHelper.addLogs(
      "error",
      error.message || error,
      "getImpelemntingPartnerOptionsFromServer"
    );
  }
  return flattenDeep(options);
}

module.exports = {
  getImpelemntingPartnerOptionsFromServer,
};
