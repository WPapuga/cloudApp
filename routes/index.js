const { google } = require('googleapis')
const express = require('express')
const pg = require('pg')
const OAuth2Data = require('../google_key.json')
const http = require('http');
const url = require('url');
const fs = require('fs')
const path = require('path')
const axios = require('axios');
const app = express()
require('dotenv').config()


const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URL = OAuth2Data.client.redirect
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false
const CLIENT_ID_GH = process.env.CLIENT_ID_GH;
const CLIENT_SECRET_GH = process.env.CLIENT_SECRET_GH;
const gh_link = `https://github.com/login/oauth/authorize?client_id=` + CLIENT_ID_GH + 
                `&redirect_uri=https://cloudappwp.azurewebsites.net/auth/github/callback` +
                `&scope=read:user+user:email` + 
                `&allow_signup=true`;
var authed_gh;
var token_gh;
const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD, ENDPOINT_ID } = process.env
const credentialsDB = {
  user: PGUSER,
  host: PGHOST,
  database: PGDATABASE,
  password: PGPASSWORD,
  port: process.env.PGPORT,
  ssl: true
}
const pool = new pg.Pool(credentialsDB)
// const connectDB = async () => {
//   try {
//     const client = new Client({
//       user: process.env.PGUSER,
//       host: process.env.PGHOST,
//       database: process.env.PGDATABASE,
//       password: process.env.PGPASSWORD,
//       port: process.env.PGPORT
//     })

//     await client.connect()
//     const res = await client.query('SELECT * FROM users')
//     console.log(res)
//     await client.end()
//   } catch (error){
//     console.log(error)
//   }
// }

app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
})

app.get('/login', function(req, res){
  const referer = req.headers.referer;
  const redirectUrl = referer;
  console.log(redirectUrl);
  console.log(CLIENT_ID);

  if (!authed) {
    const URL = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/userinfo.profile'
    });
    console.log(URL)
    res.redirect(URL);
  } else {
    var oauth2 = google.oauth2({ auth: oAuth2Client, version: 'v2'});
    oauth2.userinfo.v2.me.get(function(err, result) {
      if(err) {
        console.log("Błąd");
        console.log(err);
      } else {
        loggedUser = result.data.name;
        console.log(loggedUser);
      }
      res.redirect(redirectUrl + `?message=${loggedUser}&picture=${result.data.picture}`);
    });
  };
})

app.get('/loginGH', function(req, res) {
  if(!authed_gh){
    res.redirect(gh_link);
  } else {
    res.send(`<body>
                  <p> Zalogowano przez GitHub! </p>
                  <button id="logoutButton" onclick="window.location.href = '/logoutGH';">Wyloguj się</button>
                  <button id="returnButton" onclick="window.location.href = '/';">Powrór do strony głównej</button>
              </body>`)
  }
});

app.get('/logout', function(req, res) {
  authed = false;
  res.send(`<p>Wylogowano</p>
            <button id="returnButton" onclick="window.location.href = '/';">Powrór do strony głównej</button>`
  );

});

app.get('/logoutGH', function(req, res) {
  authed_gh = false;
  res.send(`<p>Wylogowano</p>
            <button id="returnButton" onclick="window.location.href = '/';">Powrór do strony głównej</button>`
  );
});

app.get('/auth/google/callback', function (req, res) {
    const redirectUrl = `https://salmon-mud-09c577e03.3.azurestaticapps.net/`
    const code = req.query.code
    if (code) {
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating')
                console.log(err);
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                authed = true;
                res.redirect(redirectUrl + `?token=${tokens}`)
            }
        });
    }
});

async function getToken(code){
  const { data } = await axios({
    url: 'https://github.com/login/oauth/access_token',
    method: 'get',
    params: {
      client_id: process.env.CLIENT_ID_GH,
      client_secret: process.env.CLIENT_SECRET_GH,
      redirect_uri: 'https://cloudappwp.azurewebsites.net/auth/github/callback',
      code,
    },
  });
  return data.access_token;
}

app.get('/auth/github/callback', function (req, res) {
  const code = req.query.code;
  if (code) {
    token_gh = getToken(code);
    authed_gh = true;
    res.send(`<p>Zalogowano</p>
              <button id="returnButton" onclick="window.location.href = '/';">Powrót do strony głównej</button>`);
  }

});

const port = 5000
app.listen(port, () => console.log(`Server running at ${port}`));

module.exports = app;