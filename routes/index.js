const { google } = require('googleapis')
const express = require('express')
const bodyParser = require('body-parser');
const pg = require('pg')
const http = require('http');
const url = require('url');
const fs = require('fs')
const path = require('path')
const app = express()
require('dotenv').config()

app.use(express.static('public'));

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

app.use(bodyParser.json());

app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  res.sendFile(filePath);
})

app.get('/api/getDBName', function (req, res) {
  pool.query('SELECT current_database()', (error, result) => { 
    if (error) throw error;
    console.log(result.rows[0].current_database);
    res.send({dbname: result.rows[0].current_database});
  });
});

app.get('/api/getTables', function (req, res) {
  pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`, (error, result) => { 
    if (error) throw error;
    console.log(result.rows);
    res.send(result.rows);
  });
});

app.get('/api/getColumns', function (req, res) {
  const tableName = req.query.table;
  pool.query(`SELECT * FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name   = '${tableName}'`, (error, result) => { 
    if (error) throw error;
    res.send(result.rows);
  });
});


app.get('/api/getTableData', function (req, res) {
  const tableName = req.query.table;
  pool.query(`SELECT * FROM ${tableName}`, (error, result) => { 
    if (error) throw error;
    res.send(result.rows);
  });
});

app.post('/api/insertRow', function (req, res) {
  const tableName = req.body.tableName;
  const row = req.body.row;

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
    if (error) {
      res.send(error.message)
    }
    else {
      res.send("Dodano wiersz");
    }
  });
});

app.delete('/api/deleteRow', function (req, res) {
  const tableName = req.body.tableName;
  const row = req.body.row;

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
});

app.put('/api/editRow', function (req, res) {
  const tableName = req.body.tableName;
  const row = req.body.row;
  const rowToBeEdited = req.body.rowToBeEdited;

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
});

app.post('/api/execQuery', function (req, res) {
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
});

app.get('/api/sortTable', function (req, res) {
  var tableName = req.query.tableName;
  var columnName = req.query.columnName;
  var order = req.query.order;

  pool.query(`SELECT * FROM ${tableName} ORDER BY ${columnName} ${order}`, (error, result) => { 
    if (error) throw error;
    console.log(result.rows);
    res.send(result.rows);
  });
});

app.post('/api/filter', function (req, res) {
  const tableName = req.body.tableName;
  const row = req.body.row;

  var SQLstmt = `SELECT * FROM ${tableName} WHERE `
  for (var key in row) {
    SQLstmt += key + " " + row[key] + " AND ";
  }
  SQLstmt = SQLstmt.slice(0, -4) + ";";
  console.log(SQLstmt);
  pool.query(SQLstmt, (error, result) => { 
    if (error) throw error;
    console.log(result.rows);
    res.send(result.rows);
  });
});

const port = 5000
app.listen(port, () => console.log(`Server running at ${port}`));

module.exports = app;