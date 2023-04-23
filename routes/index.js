const { google } = require('googleapis')
const express = require('express')
const session = require('express-session');
const OAuth2Data = require('../google_key.json')
const http = require('http')
const fs = require('fs')
const path = require('path')
const app = express()

app.use(session({
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  REDIRECT_URL: OAuth2Data.client.redirect,
  oAuth2Client: new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL),
  authed: false
}))

app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
})
app.get('/login', function(req, res){
  if (!req.session.authed) {
    const url = req.session.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/userinfo.profile'
    });
    console.log(url)
    res.redirect(url);
  } else {
    var oauth2 = google.oauth2({ auth: req.session.oAuth2Client, version: 'v2'});
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
  var oauth2 = google.oauth2({ auth: req.session.oAuth2Client, version: 'v2'});
  req.session.authed = false;
  res.send(`<p>Wylogowano</p>
            <button id="returnButton" onclick="window.location.href = '/';">Powrór do strony głównej</button>`
  );
});
app.get('/auth/google/callback', function (req, res) {
    const code = req.query.code
    if (code) {
        req.session.oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating')
                console.log(err);
            } else {
                console.log('Successfully authenticated');
                req.session.oAuth2Client.setCredentials(tokens);
                req.session.authed = true;
                res.redirect('/')
            }
        });
    }
});

const port = 5000
app.listen(port, () => console.log(`Server running at ${port}`));

module.exports = app;
