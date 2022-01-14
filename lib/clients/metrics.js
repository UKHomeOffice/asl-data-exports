const fetch = require('node-fetch');
const ndjson = require('ndjson');

module.exports = settings => {
  return (path, { stream = true, query = {} } = {}, accessToken) => {
    const qs = new URLSearchParams({ stream, ...query }).toString();
    const metricsUrl = `${settings.url}${path}?${qs}`;

    const headers = {
      Authorization: `bearer ${accessToken}`,
      'Content-type': 'application/json'
    };

    return fetch(metricsUrl, { headers })
      .then(response => {
        if (response.status > 399) {
          return response.json()
            .then(json => {
              const err = new Error(json.message);
              err.status = response.status;
              Object.assign(err, json);
              throw err;
            });
        }
        if (stream) {
          return response.body.pipe(ndjson.parse());
        } else {
          return response.json();
        }
      });
  };
};
