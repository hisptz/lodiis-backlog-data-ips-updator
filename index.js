const app = require("./app");

const logsHelper = require("./helpers/logs.helper");
const indexOfShouldUpdateAllData = 2;

startApp();
async function startApp() {
    try {
        await logsHelper.clearLogs();
        await logsHelper.addLogs(
            "info",
            `Start of script for generating ips for events`,
            "startApp"
        );
        const shouldUpdateAllData = process.argv[indexOfShouldUpdateAllData] ? process.argv[indexOfShouldUpdateAllData] === "true" : false;
        await app.startAppProcess(shouldUpdateAllData);
        await logsHelper.addLogs(
            "info",
            `End of script for generating ips for events`,
            "startApp"
        );
    } catch (error) {
        await logsHelper.addLogs("error", error.message || error, "startApp");
    }
}