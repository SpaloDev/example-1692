const jsforce = require('jsforce');
const axios = require('axios')
const FormData = require('form-data');

/* salesforce functions */

exports.getConnection = async () => {
  // endpoint
  const login_url = 'https://login.salesforce.com';

  // 接続application
  const consumer_key = process.env.CONSUMER_KEY;
  const consumer_secret = process.env.CONSUMER_SECRET;

  // system administrator
  const client_username = process.env.CLIENT_USERNAME;
  const client_password = process.env.PASSWORD + process.env.SECURITY_TOKEN;

  // Create Connection.
  const conn = new jsforce.Connection({
    oauth2: {
      loginUrl: login_url,
      clientId: consumer_key,
      clientSecret: consumer_secret,
    },
  });
  await conn.login(client_username, client_password, async (error, response) => {
    if (error) {
      console.dir(error);
      return response.status(401).end();
    }
  });
  return conn;
}

exports.uploadImage = async (conn, file) => {
  try {
    const formdata = new FormData();
    formdata.append("fileData", file);
    const config = {
      headers: {
        Authorization: 'Bearer ' + conn.accessToken,
        ContentType: 'multipart/form-data',
        ...formdata.getHeaders(),
      },
    }
    const url = conn.instanceUrl + '/services/data/v49.0/connect/files/users/me';
    const res = await axios.post(url, formdata, config);

    // console.dir(res);

    return res.data.id;
  } catch (err) {
    console.dir(err);
  }
}

exports.insertObject = async (conn, insert_data) => {
  // custom object
  const sobject_name = 'photo_ledger_demo__c';
  try {
    conn.sobject(sobject_name).create(insert_data, function (error, response) {
      if (error) {
        console.log(error);
        return;
      }
      console.log(response);
    });
  } catch (err) {
    console.dir(err);
  }
}