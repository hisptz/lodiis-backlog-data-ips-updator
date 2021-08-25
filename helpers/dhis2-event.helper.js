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

async function uploadEventsToTheServer(headers, serverUrl, data, programName) {
  let count = 0;
  const serverResponse = [];
  try {
    const url = `${serverUrl}/api/events?strategy=CREATE_AND_UPDATE`;
    const total = chunk(data, uploadPageSize).length;
    for (const events of chunk(data, uploadPageSize)) {
      count++;
      await logsHelper.addLogs(
        "info",
        `Uploading event data for :: ${programName} ::: ${count} of ${total}`,
        `uploadEventsToTheServer`
      );
      try {
        for (const eventData of chunk(events, 50)) {
          const response = await httpHelper.postHttp(headers, url, {
            events: eventData,
          });
          serverResponse.push(response);
        }
      } catch (error) {
        console.log(error.message || error);
      }
    }
  } catch (error) {
    await logsHelper.addLogs(
      "error",
      error.message || error,
      "uploadEventsToTheServer"
    );
  }
  return flattenDeep(serverResponse);
}

async function getAndUploadEventsFromServer(
  headers,
  serverUrl,
  implementingPartnerReferrence,
  subImplementingPartnerReferrence,
  serviceProviderReference,
  users,
  program,
  eventResponse
) {
  const sanitizedEvents = [];
  try {
    const fields = `fields=storedBy,event,eventDate,enrollment,program,programStage,orgUnit,createdByUserInfo[uid,username],trackedEntityInstance,status,dataValues[value,dataElement]`;
    const { id: programId, name: programName } = program;
    const eventUrl = `${serverUrl}/api/events.json`;
    await logsHelper.addLogs(
      "info",
      `Discovering event's paginations for program :: ${programName}`,
      "getAndUploadEventsFromServer"
    );
    const paginationFilters =
      await dhis2UtilHelper.getDhis2ResourcePaginationFromServer(
        headers,
        eventUrl,
        donwloadPageSize,
        `&program=${programId}&totalPages=true`
      );
    let count = 0;
    for (const paginationFilter of paginationFilters) {
      count++;
      await logsHelper.addLogs(
        "info",
        `Discovering events for program :: ${programName} :: ${count} of ${paginationFilters.length}`,
        "getAndUploadEventsFromServer"
      );
      const url = `${eventUrl}?program=${programId}&${fields}&${paginationFilter}&order=created:DESC`;
      const response = await httpHelper.getHttp(headers, url);
      if (response && response.events) {
        const events = getSanitizedEvents(
          response.events || [],
          implementingPartnerReferrence,
          subImplementingPartnerReferrence,
          serviceProviderReference,
          users
        );
        const data = map(flattenDeep(events), (event) =>
          omit(event, ["createdByUserInfo", "storedBy"])
        );
        if (data.length > 0) {
          sanitizedEvents.push(data);
          writeToFile("output", programName, sanitizedEvents);
          const response = await uploadEventsToTheServer(
            headers,
            serverUrl,
            data,
            programName
          );
          const date = dhis2UtilHelper.getFormattedDate(new Date());
          eventResponse.push(response);
          writeToFile(
            "response",
            `[${programName}] server response ${date}`,
            flattenDeep(eventResponse)
          );
        }
      }
    }
  } catch (error) {
    await logsHelper.addLogs(
      "error",
      error.message || error,
      "getAndUploadEventsFromServer"
    );
  }
}

function getSanitizedEvents(
  events,
  implementingPartnerReferrence,
  subImplementingPartnerReferrence,
  serviceProviderReference,
  users
) {
  return flattenDeep(
    map(events, (eventObj) => {
      const createdByUserInfo = eventObj.createdByUserInfo || {};
      let dataValues = eventObj.dataValues || [];
      if (
        createdByUserInfo.uid ||
        createdByUserInfo.username ||
        eventObj.storedBy
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
                  eventObj.storedBy &&
                  userObj.username == eventObj.storedBy
              );
        if (user && user.implementingPartner) {
          const implementingPartnerDataValue = find(
            eventObj.dataValues || [],
            (dataValue) =>
              dataValue &&
              dataValue.value !== "" &&
              dataValue.dataElement === implementingPartnerReferrence
          );
          const subImplementingPartnerDataValue = find(
            eventObj.dataValues || [],
            (dataValue) =>
              dataValue &&
              dataValue.value !== "" &&
              dataValue.dataElement === subImplementingPartnerReferrence
          );
          const serviveProviderDataValue = find(
            eventObj.dataValues || [],
            (dataValue) =>
              dataValue &&
              dataValue.value !== "" &&
              dataValue.dataElement === serviceProviderReference
          );
          dataValues = getEventDataValues(
            serviveProviderDataValue,
            implementingPartnerDataValue,
            subImplementingPartnerDataValue,
            eventObj,
            user,
            serviceProviderReference,
            implementingPartnerReferrence,
            subImplementingPartnerReferrence
          );
          dataValues =
            dataValues.length > 0
              ? concat(
                  filter(
                    dataValues,
                    (dataValue) =>
                      dataValue &&
                      dataValue.dataElement !== serviceProviderReference
                  ),
                  {
                    dataElement: serviceProviderReference,
                    value: user.username || "",
                  }
                )
              : [];
        }
      }
      return dataValues.length > 0
        ? {
            ...eventObj,
            dataValues,
          }
        : [];
    })
  );
}

function getEventDataValues(
  serviveProviderDataValue,
  implementingPartnerDataValue,
  subImplementingPartnerDataValue,
  eventObj,
  user,
  serviceProviderReference,
  implementingPartnerReferrence,
  subImplementingPartnerReferrence
) {
  return implementingPartnerDataValue && subImplementingPartnerDataValue
    ? !serviveProviderDataValue
      ? concat(
          filter(
            eventObj.dataValues || [],
            (dataValue) =>
              dataValue && dataValue.dataElement !== serviceProviderReference
          ),
          {
            dataElement: serviceProviderReference,
            value: user.username || "",
          }
        )
      : []
    : !implementingPartnerDataValue && subImplementingPartnerDataValue
    ? concat(
        filter(
          eventObj.dataValues || [],
          (dataValue) =>
            dataValue && dataValue.dataElement !== implementingPartnerReferrence
        ),
        {
          dataElement: implementingPartnerReferrence,
          value: user.implementingPartner,
        }
      )
    : implementingPartnerDataValue && !subImplementingPartnerDataValue
    ? concat(
        filter(
          eventObj.dataValues || [],
          (dataValue) =>
            dataValue &&
            dataValue.dataElement !== subImplementingPartnerReferrence
        ),
        {
          dataElement: subImplementingPartnerReferrence,
          value: user.subImplementingPartner,
        }
      )
    : concat(
        filter(
          eventObj.dataValues || [],
          (dataValue) =>
            dataValue &&
            dataValue.dataElement !== implementingPartnerReferrence &&
            dataValue.dataElement !== subImplementingPartnerReferrence
        ),
        {
          dataElement: subImplementingPartnerReferrence,
          value: user.subImplementingPartner,
        },
        {
          dataElement: implementingPartnerReferrence,
          value: user.implementingPartner,
        }
      );
}

module.exports = { getAndUploadEventsFromServer };
