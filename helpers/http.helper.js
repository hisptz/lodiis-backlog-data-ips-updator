const request = require("request");
const Promise = require("promise");

async function getHttp(headers, url) {
  return new Promise((resolve, reject) => {
    request(
      {
        headers,
        uri: url,
        method: "GET",
      },
      (error, response, body) => {
        if (!error) {
          let data = null;
          try {
            data = JSON.parse(body);
          } catch (error) {
            console.log(error.message || error);
          } finally {
            resolve(data);
          }
        } else {
          reject(error);
        }
      }
    );
  });
}

async function postHttp(headers, url, data) {
  return new Promise((resolve, reject) => {
    request(
      {
        headers,
        uri: url,
        method: "POST",
        body: JSON.stringify(data),
      },
      (error, response, body) => {
        if (!error) {
          let data = null;
          try {
            data = JSON.parse(body);
          } catch (error) {
            console.log(error.message || error);
          } finally {
            resolve(data);
          }
        } else {
          reject(error);
        }
      }
    );
  });
}

async function deleteHttp(headers, url, data) {
  return new Promise((resolve, reject) => {
    request(
      {
        headers,
        uri: url,
        method: "DELETE",
        body: JSON.stringify(data),
      },
      (error, response, body) => {
        if (!error) {
          let data = null;
          try {
            data = JSON.parse(body);
          } catch (error) {
            console.log(error.message || error);
          } finally {
            resolve(data);
          }
        } else {
          reject(error);
        }
      }
    );
  });
}

async function putHttp(headers, url, data) {
  return new Promise((resolve, reject) => {
    request(
      {
        headers,
        uri: url,
        method: "PUT",
        body: JSON.stringify(data),
      },
      (error, response, body) => {
        if (!error) {
          let data = null;
          try {
            data = JSON.parse(body);
          } catch (error) {
            console.log(error.message || error);
          } finally {
            resolve(data);
          }
        } else {
          reject(error);
        }
      }
    );
  });
}

module.exports = {
  getHttp,
  postHttp,
  putHttp,
  deleteHttp,
};
