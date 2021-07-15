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
const httpHelper = require("./http.helper");
const logsHelper = require("./logs.helper");

async function uploadEventsToTheServer(headers, serverUrl, data, programName) {
  let count = 0;
  const serverResponse = [];
  const batchSize = 200;
  try {
    const url = `${serverUrl}/api/events?strategy=CREATE_AND_UPDATE`;
    const total = chunk(data, batchSize).length;
    for (const events of chunk(data, batchSize)) {
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

async function getEventsFromServer(
  headers,
  serverUrl,
  implementingPartnerReferrence,
  subImplementingPartnerReferrence,
  users,
  program
) {
  const sanitizedEvents = [];
  try {
    const fields = `fields=storedBy,event,eventDate,enrollment,program,programStage,orgUnit,createdByUserInfo[uid,username],trackedEntityInstance,status,dataValues[*]`;
    const { id: programId, name: programName } = program;
    const eventUrl = `${serverUrl}/api/events.json`;
    await logsHelper.addLogs(
      "info",
      `Discovering event's paginations for program :: ${programName}`,
      "getEventsFromServer"
    );
    const paginationFilters =
      await dhis2UtilHelper.getDhis2ResourcePaginationFromServer(
        headers,
        eventUrl,
        500,
        `&program=${programId}&totalPages=true`
      );
    let count = 0;
    for (const paginationFilter of paginationFilters) {
      count++;
      await logsHelper.addLogs(
        "info",
        `Discovering events for program :: ${programName} :: ${count} of ${paginationFilters.length}`,
        "getEventsFromServer"
      );
      const url = `${eventUrl}?program=${programId}&${fields}&${paginationFilter}&order=created:DESC`;
      const response = await httpHelper.getHttp(headers, url);
      const events = getSanitizedEvents(
        response.events || [],
        implementingPartnerReferrence,
        subImplementingPartnerReferrence,
        users
      );
      sanitizedEvents.push(events);
    }
  } catch (error) {
    await logsHelper.addLogs(
      "error",
      error.message || error,
      "getEventsFromServer"
    );
  }
  return map(flattenDeep(sanitizedEvents), (event) =>
    omit(event, ["createdByUserInfo", "storedBy"])
  );
}

function getSanitizedEvents(
  events,
  implementingPartnerReferrence,
  subImplementingPartnerReferrence,
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
        if (
          user &&
          user.implementingPartner
        ) {
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
              dataValue.dataElement === implementingPartnerReferrence
          );

          dataValues =
            implementingPartnerDataValue && subImplementingPartnerDataValue
              ? []
              : !implementingPartnerDataValue && subImplementingPartnerDataValue
              ? concat(
                  filter(
                    eventObj.dataValues || [],
                    (dataValue) =>
                      dataValue &&
                      dataValue.dataElement !== implementingPartnerReferrence
                  ),
                  {
                    dataElement: implementingPartnerReferrence,
                    value: user.implementingPartner,
                  }
                )
              : implementingPartnerDataValue && !subImplementingPartnerDataValue
              ? (dataValues = concat(
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
                ))
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
      }
      return dataValues.length > 0 ? { ...eventObj, dataValues } : [];
    })
  );
}

module.exports = { getEventsFromServer, uploadEventsToTheServer };
