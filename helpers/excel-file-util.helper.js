const XLSX = require("xlsx");
const _ = require("lodash");
const logsHelper = require("./logs.helper");

async function writeToSingleSheetExcelFile(
    jsonData,
    filePath,
    skipHeader = false,
    sheetName = "List"
) {
    try {
        const ws = XLSX.utils.json_to_sheet(jsonData, {
            header: _.uniq(_.flattenDeep(_.map(jsonData, (data) => _.keys(data)))),
            skipHeader,
        });
        let workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
        XLSX.writeFile(workbook, filePath);
    } catch (error) {
        await logsHelper.addLogs(
            "error",
            error.message || error,
            "writeToSingleSheetExcelFile"
        );
    }
}

async function writeToMultipleSheetExcelFile(
    jsonDataObject,
    filePath,
    skipHeader = false
) {
    try {
        let workbook = XLSX.utils.book_new();
        for (const sheetName of _.keys(jsonDataObject)) {
            const jsonData = jsonDataObject[sheetName];
            const ws = XLSX.utils.json_to_sheet(jsonData, {
                header: _.uniq(_.flattenDeep(_.map(jsonData, (data) => _.keys(data)))),
                skipHeader,
            });
            XLSX.utils.book_append_sheet(workbook, ws, sheetName);
        }
        XLSX.writeFile(workbook, filePath);
    } catch (error) {
        await logsHelper.addLogs(
            "error",
            error.message || error,
            "writeToMultipleSheetExcelFile"
        );
    }
}

async function getJsonDataFromExcelOrCsvFile(filePath) {
    let data = {};
    try {
        const workbook = XLSX.readFile(filePath);
        const sheet_name_list = workbook.SheetNames;
        for (const sheet_name of sheet_name_list) {
            try {
                const sheet = workbook.Sheets[sheet_name];
                const dataObjects = XLSX.utils.sheet_to_json(sheet);
                data[`${sheet_name}`.trim()] = _.map(dataObjects, (dataObj) => {
                    const newDataObj = {};
                    for (const key of _.keys(dataObj)) {
                        const newKey = `${key}`.trim().replace(/\n/g, "");
                        const value = `${dataObj[key]}`.trim();
                        if (value != "") {
                            newDataObj[newKey] = value;
                        }
                    }
                    return newDataObj;
                });
            } catch (error) {
                await logsHelper.addLogs(
                    "error",
                    error.message || error,
                    "getJsonDataFromExcelOrCsvFile"
                );
            }
        }
    } catch (error) {
        await logsHelper.addLogs(
            "error",
            error.message || error,
            "getJsonDataFromExcelOrCsvFile"
        );
    }
    return data;
}

module.exports = {
    getJsonDataFromExcelOrCsvFile,
    writeToSingleSheetExcelFile,
    writeToMultipleSheetExcelFile,
};