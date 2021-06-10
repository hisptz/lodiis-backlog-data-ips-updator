const { flattenDeep, map, find } = require("lodash");

const dhis2UtilHelper = require("./dhis2-util.helper");
const httpHelper = require("./http.helper");
const logsHelper = require("./logs.helper");

const implementingPartnerAttributeId = "wpiLo7DTwKF";

async function getUserInfoFromServer(
  headers,
  serverUrl,
  implementingPartnerOptions
) {
  const usersInfo = [];
  try {
    const userUrl = `${serverUrl}/api/users.json?`;
    const fields = `fields=id,userCredentials[username],attributeValues[value,attribute[id]]`;
    await logsHelper.addLogs(
      "info",
      `Discovering paginations for user info from :: ${userUrl}`,
      "getUserInfoFromServer"
    );
    const paginationFilters =
      await dhis2UtilHelper.getDhis2ResourcePaginationFromServer(
        headers,
        userUrl
      );
    let count = 0;
    for (const paginationFilter of paginationFilters) {
      count++;
      await logsHelper.addLogs(
        "info",
        `Discovering users info from :: ${userUrl} ::: ${count} of ${paginationFilters.length}`,
        "getUserInfoFromServer"
      );
      const url = `${userUrl}${fields}&${paginationFilter}`;
      const response = await httpHelper.getHttp(headers, url);
      usersInfo.push(
        getSanitizedUserInfo(response.users || [], implementingPartnerOptions)
      );
    }
  } catch (error) {
    await logsHelper.addLogs(
      "error",
      error.message || error,
      "getUserInfoFromServer"
    );
  }
  return flattenDeep(usersInfo);
}

function getSanitizedUserInfo(users, implementingPartnerOptions) {
  return map(users, (user) => {
    const id = user.id || "";
    const userCredentials = user.userCredentials || {};
    const username = userCredentials.username || "";
    let implementingPartner = "";
    const attributeValueObj = find(
      user.attributeValues || [],
      (attributeValue) =>
        attributeValue &&
        attributeValue.attribute &&
        attributeValue.attribute.id &&
        attributeValue.attribute.id === implementingPartnerAttributeId
    );
    if (attributeValueObj) {
      const implementingPartnerOption = find(
        implementingPartnerOptions,
        (option) =>
          option &&
          option.id &&
          attributeValueObj.value &&
          option.id == attributeValueObj.value
      );
      implementingPartner =
        implementingPartnerOption && implementingPartnerOption.code
          ? implementingPartnerOption.code
          : implementingPartner;
    }
    return {
      id,
      username,
      implementingPartner,
    };
  });
}

module.exports = {
  getUserInfoFromServer,
};
