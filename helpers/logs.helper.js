const moment = require("moment");
const fileManipulationHelper = require("./file-manipulation.helper");
const fileName = "logs";
const dirFolder = "logs";

async function clearLogs(nameOfFile = fileName) {
  const data = "";
  try {
    await fileManipulationHelper.writeToFile(
      dirFolder,
      nameOfFile,
      data,
      false
    );
  } catch (error) {
    error = error.message || error;
    console.log({ error });
  } finally {
    return;
  }
}
async function addLogs(
  type = "INFO",
  message,
  resource = "",
  nameOfFile = fileName
) {
  const time = moment().format("YYYY-MM-DD hh:mm:ss.SSS A");
  const data = `${time} ${type.toUpperCase()}(${resource}) ${message}\n`;
  const flag = "a+";
  try {
    await fileManipulationHelper.writeToFile(
      dirFolder,
      nameOfFile,
      data,
      false,
      flag
    );
  } catch (error) {
    error = error.message || error;
    console.log({ error, data: data.replace("\n", "") });
  } finally {
    return;
  }
}

async function getLogsContents() {
  return await fileManipulationHelper.readDataFromFile(
    dirFolder,
    fileName,
    false
  );
}

module.exports = { clearLogs, addLogs, getLogsContents };
