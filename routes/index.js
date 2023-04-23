const { google } = require('googleapis')
const express = require('express')
const OAuth2Data = require('../google_key.json')
const http = require('http')
const fs = require('fs')
const path = require('path')
const app = express()

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URL = OAuth2Data.client.redirect

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;

app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
})
app.get('/login', function(req, res){
  if (!authed) {
    const url = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/userinfo.profile'
    });
    console.log(url)
    res.redirect(url);
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
      var ret = `<body>
                      <p> Logged in:` + loggedUser +` <img src="` + result.data.picture + `"height="23" width="23"> </p>
                      <button id="logoutButton" onclick="window.location.href = '/logout';">Wyloguj się</button>
                      <button id="returnButton" onclick="window.location.href = '/';">Powrór do strony głównej</button>
                </body>`;
      res.send(ret);
    });
  };
})
app.get('/logout', function(req, res) {
  var oauth2 = google.oauth2({ auth: oAuth2Client, version: 'v2'});
  authed = false;
  res.send(`<p>Wylogowano</p>
            <button id="returnButton" onclick="window.location.href = '/';">Powrór do strony głównej</button>`
  );
});
app.get('/auth/google/callback', function (req, res) {
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
                res.redirect('/')
            }
        });
    }
});

const port = 5000
app.listen(port, () => console.log(`Server running at ${port}`));

module.exports = app;