const {
  flattenDeep,
  map,
  omit,
  find,
  concat,
  filter,
  chunk,
} = require("lodash");

const dhis2UtilHelper = require("./dhis2-util.helper");
const { writeToFile } = require("./file-manipulation.helper");
const httpHelper = require("./http.helper");
const logsHelper = require("./logs.helper");

const donwloadPageSize = 200;
const uploadPageSize = 200;

async function uploadTrackerDataToTheServer(
  headers,
  serverUrl,
  data,
  programName
) {
  let count = 0;
  const serverResponse = [];
  try {
    const url = `${serverUrl}/api/trackedEntityInstances?strategy=CREATE_AND_UPDATE`;
    const total = chunk(data, uploadPageSize).length;
    for (const trackedEntityInstances of chunk(data, uploadPageSize)) {
      count++;
      await logsHelper.addLogs(
        "info",
        `Uploading tracker data for :: ${programName} ::: ${count} of ${total}`,
        `uploadEventsToTheServer`
      );
      try {
        const response = await httpHelper.postHttp(headers, url, {
          trackedEntityInstances,
        });
        serverResponse.push(response);
      } catch (error) {
        console.log(error.message || error);
      }
    }
  } catch (error) {
    await logsHelper.addLogs(
      "error",
      error.message || error,
      "uploadTrackerDataToTheServer"
    );
  }
  return flattenDeep(serverResponse);
}

async function getAndUploadTrackerDataFromServer(
  headers,
  serverUrl,
  implementingPartnerReferrence,
  subImplementingPartnerReferrence,
  users,
  program,
  tieResponse
) {
  const sanitizedTrackerData = [];
  const fields = `fields=created,trackedEntityInstance,trackedEntityType,orgUnit,attributes[attribute,value],enrollments[storedBy,createdByUserInfo[uid,username],program,orgUnit,status,trackedEntityInstance,enrollment,trackedEntityType,incidentDate,enrollmentDate]`;
  try {
    const { id: programId, name: programName } = program;
    const trackerUrl = `${serverUrl}/api/trackedEntityInstances.json`;
    await logsHelper.addLogs(
      "info",
      `Discovering tracker data's paginations for program :: ${programName}`,
      "getAndUploadTrackerDataFromServer"
    );
    const paginationFilters =
      await dhis2UtilHelper.getDhis2ResourcePaginationFromServer(
        headers,
        trackerUrl,
        donwloadPageSize,
        `&ouMode=ALL&program=${programId}&totalPages=true`
      );
    let count = 0;
    for (const paginationFilter of paginationFilters) {
      count++;
      await logsHelper.addLogs(
        "info",
        `Discovering tracker data for program :: ${programName} :: ${count} of ${paginationFilters.length}`,
        "getAndUploadTrackerDataFromServer"
      );
      const url = `${trackerUrl}?ouMode=ALL&program=${programId}&${fields}&${paginationFilter}&order=created:DESC`;
      const response = await httpHelper.getHttp(headers, url);
      if (response && response.trackedEntityInstances) {
        const teiData = getSanitizedTrackerData(
          response.trackedEntityInstances || [],
          programId,
          implementingPartnerReferrence,
          subImplementingPartnerReferrence,
          users
        );
        const data = map(flattenDeep(teiData), (trackerData) =>
          omit(trackerData, ["enrollments"])
        );
        if (data.length > 0) {
          sanitizedTrackerData.push(data);
          writeToFile("output", programName, sanitizedTrackerData);
          const response = await uploadTrackerDataToTheServer(
            headers,
            serverUrl,
            data,
            programName
          );
          tieResponse.push(response);
          const date = dhis2UtilHelper.getFormattedDate(new Date());
          writeToFile(
            "response",
            `[${programName}] tracker server response ${date}`,
            flattenDeep(tieResponse)
          );
        }
      }
    }
  } catch (error) {
    await logsHelper.addLogs(
      "error",
      error.message || error,
      "getAndUploadTrackerDataFromServer"
    );
  }
}

function getSanitizedTrackerData(
  trackerData,
  programId,
  implementingPartnerReferrence,
  subImplementingPartnerReferrence,
  users
) {
  return filter(
    flattenDeep(
      map(trackerData || [], (trackerObject) => {
        const sanitizedTrackerData = [];
        const enrollment = find(
          trackerObject.enrollments || [],
          (enrollmentObj) =>
            enrollmentObj &&
            enrollmentObj.program &&
            enrollmentObj.program === programId
        );
        if (enrollment) {
          const createdByUserInfo = enrollment.createdByUserInfo || {};
          if (
            createdByUserInfo.uid ||
            createdByUserInfo.username ||
            enrollment.storedBy
          ) {
            const user =
              createdByUserInfo.uid || createdByUserInfo.username
                ? find(
                    users,
                    (userObj) =>
                      (userObj.id &&
                        createdByUserInfo.uid &&
                        userObj.id == createdByUserInfo.uid) ||
                      (userObj.username &&
                        createdByUserInfo.username &&
                        userObj.username == createdByUserInfo.username)
                  )
                : find(
                    users,
                    (userObj) =>
                      userObj.username &&
                      enrollment.storedBy &&
                      userObj.username == enrollment.storedBy
                  );
            if (user && user.implementingPartner) {
              const implementingPartnerAttribute = find(
                trackerObject.attributes || [],
                (attributeObj) =>
                  attributeObj &&
                  attributeObj.value !== "" &&
                  attributeObj.attribute === implementingPartnerReferrence
              );
              const subImplementingPartnerAttribute = find(
                trackerObject.attributes || [],
                (attributeObj) =>
                  attributeObj &&
                  attributeObj.value !== "" &&
                  attributeObj.attribute === subImplementingPartnerReferrence
              );
              sanitizedTrackerData.push({
                ...trackerObject,
                attributes:
                  implementingPartnerAttribute &&
                  subImplementingPartnerAttribute
                    ? []
                    : !implementingPartnerAttribute &&
                      subImplementingPartnerAttribute
                    ? concat(
                        filter(
                          trackerObject.attributes || [],
                          (attributeObj) =>
                            attributeObj &&
                            attributeObj.dataElement !==
                              implementingPartnerReferrence
                        ),
                        {
                          attribute: implementingPartnerReferrence,
                          value: user.implementingPartner,
                        }
                      )
                    : implementingPartnerAttribute &&
                      !subImplementingPartnerAttribute
                    ? concat(
                        filter(
                          trackerObject.attributes || [],
                          (attributeObj) =>
                            attributeObj &&
                            attributeObj.dataElement !==
                              subImplementingPartnerReferrence
                        ),
                        {
                          attribute: subImplementingPartnerReferrence,
                          value: user.subImplementingPartner,
                        }
                      )
                    : concat(
                        filter(
                          trackerObject.attributes || [],
                          (attributeObj) =>
                            attributeObj &&
                            attributeObj.dataElement !==
                              implementingPartnerReferrence &&
                            attributeObj.dataElement !==
                              subImplementingPartnerReferrence
                        ),
                        {
                          attribute: subImplementingPartnerReferrence,
                          value: user.subImplementingPartner,
                        },
                        {
                          attribute: implementingPartnerReferrence,
                          value: user.implementingPartner,
                        }
                      ),
              });
            }
          }
        }
        return sanitizedTrackerData;
      })
    ),
    (trackerObject) =>
      trackerObject &&
      trackerObject.attributes &&
      trackerObject.attributes.length > 0
  );
}

module.exports = {
  getAndUploadTrackerDataFromServer,
  uploadTrackerDataToTheServer,
};
