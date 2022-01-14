const fetch = require('node-fetch');

module.exports = settings => {
  return () => {
    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('username', settings.username);
    body.set('password', settings.password);
    body.set('client_id', settings.client);
    body.set('client_secret', settings.secret);

    const opts = { method: 'POST', body };

    return fetch(`${settings.url}/realms/${settings.realm}/protocol/openid-connect/token`, opts)
      .then(res => {
        if (!res.ok) {
          throw new Error(res.statusText);
        }
        return res.json();
      })
      .then(json => json.access_token);
  };
};
