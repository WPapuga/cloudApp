const { google } = require('googleapis')
const express = require('express')
const bodyParser = require('body-parser');
const pg = require('pg')
const http = require('http');
const url = require('url');
const fs = require('fs')
const path = require('path')
const axios = require('axios');
const app = express()
require('dotenv').config()

app.use(express.static('public'));
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URL = 'https://cloudappwp.azurewebsites.net/auth/google/callback'
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = true
var loggedUser;
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
const connectDB = async () => {
    const res = await pool.query('SELECT * FROM users')
    console.log(res)
}

const getUsers = (request, response) => {
  console.log('Pobieram dane ...');
  pool.query('SELECT * FROM public.users', (error, res) => {
    if (error) throw error
    console.log('Dostałem ...');
    for (let row of res.rows) {
    console.log(JSON.stringify(row));
    }
  })
}

function addUser(username) {
  const currentDate = new Date();
  const date = currentDate.toISOString();
  console.log(username + " " + date);
  pool.query(`INSERT INTO public.users (name, joined, lastvisit, counter) VALUES ('${username}', '${date}', '${date}', 1)`, (error, res) => {
    if (error) {
      console.log(error);
      console.log("Błąd lub użytkownik już istnieje w tabeli ");
      pool.query(`UPDATE public."users" SET lastvisit = '${date}', counter = counter + 1 WHERE name = '${username}'`, (err, resp) => {
        if (err) throw err;
        else {
          console.log('Zakutalizowano ...');
        }
      });
    } else {
      console.log('Dodano użytkownika ...');
    }
  })
}

app.use(bodyParser.json());

app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
})

app.get('/login', function(req, res){
  if (!authed) {
    const URL = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/userinfo.profile'
    });
    console.log(URL)
    res.redirect(URL);
  } else {
    const filePath = path.join(__dirname, 'index.html');
    res.sendFile(filePath);
  };
});

app.get('/loginGH', function(req, res) {
  if(!authed_gh){
    res.redirect(gh_link);
  } else {
    const filePath = path.join(__dirname, 'index.html');
    res.sendFile(filePath);
  }
});

app.get('/logout', function(req, res) {
  authed = false;
  loggedUser = null;
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
});
app.get('/logoutGH', function(req, res) {
  authed_gh = false;
  loggedUser = null;
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
});

app.get('/auth/google/callback', function (req, res) {
    const code = req.query.code
    if (code) {
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating')
                console.log(err);
                res.send("Error przy tworzeniu tokena");
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                authed = true;
                var oauth2 = google.oauth2({ auth: oAuth2Client, version: 'v2'});
                oauth2.userinfo.v2.me.get(function(err, result) {
                  if(err) {
                    console.log("Błąd");
                    console.log(err);
                    res.send("Error przy pobieraniu informacji o użytkowniku");
                  } else {
                    loggedUser = result.data.name;
                    console.log(loggedUser);
                    console.log(authed);
                    addUser(loggedUser);
                    const filePath = path.join(__dirname, 'loggedGoogle.html');
                    res.sendFile(filePath);
                  }
                });
                
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
    loggedUser = 'tempGHuser';
    addUser(loggedUser);
    const filePath = path.join(__dirname, 'loggedGithub.html');
    res.sendFile(filePath);
  }

});

app.get('/api/getData', function (req, res) {
  console.log(authed + " " + authed_gh);
  if( authed || authed_gh) {
    pool.query('SELECT * FROM public."users"', (error, result) => { 
      if (error) throw error;
      console.log(result.rows);
      res.send(result.rows);
    });
  } else {
    res.send("Nie jesteś zalogowany");
  }
});

app.get('/api/getUsername', function (req, res) {
  console.log(authed + " " + authed_gh);
  if( authed || authed_gh) {
    res.send({username: loggedUser});
  } else {
    res.send("Nie jesteś zalogowany");
  }
});

app.get('/api/getDBName', function (req, res) {
  console.log(authed + " " + authed_gh);
  if( authed || authed_gh) {
    pool.query('SELECT current_database()', (error, result) => { 
      if (error) throw error;
      console.log(result.rows[0].current_database);
      res.send({dbname: result.rows[0].current_database});
    });
  } else {
    res.send("Nie jesteś zalogowany");
  }
});

app.get('/api/getTables', function (req, res) {
  console.log(authed + " " + authed_gh);
  if( authed || authed_gh) {
    pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`, (error, result) => { 
      if (error) throw error;
      console.log(result.rows);
      res.send(result.rows);
    });
  } else {
    res.send("Nie jesteś zalogowany");
  }
});

app.get('/api/getColumns', function (req, res) {
  const tableName = req.query.table;
  if( authed || authed_gh) {  
    pool.query(`SELECT * FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name   = '${tableName}'`, (error, result) => { 
      if (error) throw error;
      res.send(result.rows);
    });
  } else {
    res.send("Nie jesteś zalogowany");
  }
});


app.get('/api/getTableData', function (req, res) {
  const tableName = req.query.table;
  if( authed || authed_gh) {  
    pool.query(`SELECT * FROM ${tableName}`, (error, result) => { 
      if (error) throw error;
      res.send(result.rows);
    });
  } else {
    res.send("Nie jesteś zalogowany");
  }
});

app.post('/api/insertRow', function (req, res) {
  const tableName = req.body.tableName;
  const row = req.body.row;
  if( authed || authed_gh) {  
    var SQLstmt = `INSERT INTO ${tableName}(`
    for (var key in row) {
      SQLstmt += key + ", ";
    }
    SQLstmt = SQLstmt.slice(0, -2) + ") VALUES (";;   
    for (var key in row) {
      SQLstmt += "'" + row[key] + "', ";
    }
    SQLstmt = SQLstmt.slice(0, -2) + ");";; 
    console.log(SQLstmt);
    pool.query(SQLstmt, (error, result) => { 
      if (error) throw error;
      res.send("Dodano wiersz");
    });
  } else {
    res.send("Nie jesteś zalogowany");
  }
});

app.delete('/api/deleteRow', function (req, res) {
  const tableName = req.body.tableName;
  const row = req.body.row;
  if( authed || authed_gh) {  
    var SQLstmt = `DELETE FROM ${tableName} WHERE`
    for (var key in row) {
      SQLstmt += " " + key + " = '" + row[key] + "' AND";
    }
    SQLstmt = SQLstmt.slice(0, -4) + ";";;
    console.log(SQLstmt);
    pool.query(SQLstmt, (error, result) => { 
      if (error) throw error;
      res.send("Usunięto wiersz");
    });
  } else {
    res.send("Nie jesteś zalogowany");
  }
});

app.put('/api/editRow', function (req, res) {
  const tableName = req.body.tableName;
  const row = req.body.row;
  const rowToBeEdited = req.body.rowToBeEdited;
  if( authed || authed_gh) {  
    var SQLstmt = `UPDATE ${tableName} SET`
    for (var key in row) {
      SQLstmt += " " + key + " = '" + row[key] + "',";
    }
    SQLstmt = SQLstmt.slice(0, -1) + " WHERE";
    for (var key in rowToBeEdited) {
      SQLstmt += " " + key + " = '" + rowToBeEdited[key] + "' AND";
    }
    SQLstmt = SQLstmt.slice(0, -4) + ";";;
    console.log(SQLstmt);
    pool.query(SQLstmt, (error, result) => { 
      if (error) throw error;
      res.send("Zaktualizowano wiersz");
    });
  } else {
    res.send("Nie jesteś zalogowany");
  }
});

app.post('/api/execQuery', function (req, res) {
  console.log(req.body.query)
  if( authed || authed_gh) {  
    var SQLstmt = req.body.query
    pool.query(SQLstmt, (error, result) => { 
      if (error) {
        console.log(error)
        res.send({message: "Error", error: error.message})
      } else {
        console.log(result)
        var response = {
          message: "Sukces",
          rows: result.rows,
          command: result.command,
          rowCount: result.rowCount
        }
        res.send(response)
      }
    });
  } else {
    res.send("Nie jesteś zalogowany")
  }
});

app.get('/api/sortTable', function (req, res) {
  var tableName = req.query.tableName;
  var columnName = req.query.columnName;
  var order = req.query.order;

  if( authed || authed_gh) {  
    pool.query(`SELECT * FROM ${tableName} ORDER BY ${columnName} ${order}`, (error, result) => { 
      if (error) throw error;
      console.log(result.rows);
      res.send(result.rows);
    });
  } else {
    res.send("Nie jesteś zalogowany");
  }
});

const port = 5000
app.listen(port, () => console.log(`Server running at ${port}`));

module.exports = app;