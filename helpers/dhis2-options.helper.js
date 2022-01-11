const { flattenDeep } = require("lodash");

const httpHelper = require("./http.helper");
const logsHelper = require("./logs.helper");

async function getOptionsByOptionSetId(headers, serverUrl, optionSetId) {
    const options = [];
    try {
        await logsHelper.addLogs(
            "info",
            `Discovering options for :: ${optionSetId}`,
            "getOptionsByOptionSetId"
        );
        const url = `${serverUrl}/api/optionSets/${optionSetId}.json?fields=options[code,id]`;
        const response = await httpHelper.getHttp(headers, url);
        options.push(response.options || []);
    } catch (error) {
        await logsHelper.addLogs(
            "error",
            error.message || error,
            "getOptionsByOptionSetId"
        );
    }
    return flattenDeep(options);
}

module.exports = {
    getOptionsByOptionSetId,
};