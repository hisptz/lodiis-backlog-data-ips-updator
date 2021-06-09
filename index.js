const app = require("./app");

const logsHelper = require("./helpers/logs.helper");

startApp();
async function startApp() {
  try {
    await logsHelper.clearLogs();
    await logsHelper.addLogs(
      "info",
      `Start of script for generating user info`,
      "startApp"
    );
    await app.startAppProcess();
    await logsHelper.addLogs(
      "info",
      `End of script for generating user info`,
      "startApp"
    );
  } catch (error) {
    await logsHelper.addLogs("error", error.message || error, "startApp");
  }
}
