const { flattenDeep, map, find } = require("lodash");

const dhis2UtilHelper = require("./dhis2-util.helper");
const httpHelper = require("./http.helper");
const logsHelper = require("./logs.helper");

const implementingPartnerAttributeId = "wpiLo7DTwKF";
const subImplementingPartnerAttributeId = "P7YnaTZTSKl";

function getUserAttributeById(user, attributeId) {
    return find(
        user.attributeValues || [],
        (attributeValue) =>
        attributeValue &&
        attributeValue.attribute &&
        attributeValue.attribute.id &&
        attributeValue.attribute.id === attributeId
    );
}

async function getUserInfoFromServer(
    headers,
    serverUrl,
    implementingPartnerOptions,
    subImplementingPartnerOptions
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
                getSanitizedUserInfo(
                    response.users || [],
                    implementingPartnerOptions,
                    subImplementingPartnerOptions
                )
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

function getSanitizedUserInfo(
    users,
    implementingPartnerOptions,
    subImplementingPartnerOptions
) {
    return map(users, (user) => {
        const id = user.id || "";
        const userCredentials = user.userCredentials || {};
        const username = userCredentials.username || "";
        let implementingPartner = "";
        let subImplementingPartner = "";
        const implementingPartnerAttributeValueObj = getUserAttributeById(
            user,
            implementingPartnerAttributeId
        );
        const subImplementingPartnerAttributeValueObj = getUserAttributeById(
            user,
            subImplementingPartnerAttributeId
        );
        if (implementingPartnerAttributeValueObj) {
            const implementingPartnerOption = find(
                implementingPartnerOptions,
                (option) =>
                option &&
                option.id &&
                implementingPartnerAttributeValueObj.value &&
                option.id == implementingPartnerAttributeValueObj.value
            );
            implementingPartner =
                implementingPartnerOption && implementingPartnerOption.code ?
                implementingPartnerOption.code :
                implementingPartner;
        }
        if (subImplementingPartnerAttributeValueObj) {
            const subImplementingPartnerOption = find(
                subImplementingPartnerOptions,
                (option) =>
                option &&
                option.id &&
                subImplementingPartnerAttributeValueObj.value &&
                option.id == subImplementingPartnerAttributeValueObj.value
            );
            subImplementingPartner =
                subImplementingPartnerOption && subImplementingPartnerOption.code ?
                subImplementingPartnerOption.code :
                subImplementingPartner;
        }
        return {
            id,
            username,
            implementingPartner,
            subImplementingPartner,
        };
    });
}

module.exports = {
    getUserInfoFromServer,
};