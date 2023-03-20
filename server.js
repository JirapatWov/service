// server.js

const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const multer = require('multer');

const app = express();

// configure cors
app.use(cors());
app.use(express.json());

// configure MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'secco_secco',
  password: '123456789',
  database: 'secco_secco'
});

// connect to MySQL
connection.connect(function(err) {
  if (err) throw err;
  console.log('Connected to MySQL!');
});

// create an API endpoint to get data from MySQL
app.get('/homepage', function(req, res) {
  connection.query('SELECT * FROM homepage', function(err, results, fields) {
    if (err) throw err;
    res.send(results);
  });
});

app.get('/currentProjects', function(req, res) {
  connection.query('SELECT * FROM projects INNER JOIN current ON projects.id = current.project_id ORDER BY current.position', function(err, results, fields) {
    if (err) throw err;
    res.send(results);
  });
});


app.get('/projects/:cat', function(req, res) {
  const cat = req.params.cat;
  const sql = 'SELECT * FROM projects WHERE cat LIKE ? ORDER BY position';
  connection.query(sql, [cat], function(err, result) {
    if (err) {
      console.error(err);
      res.status(500).send('Error retrieving data');
    } else {
      res.send(result);
    }
  });
});

app.get('/project/:id', function(req, res) {
  const id = req.params.id;
  const sql = 'SELECT * FROM projects WHERE id LIKE ?';
  connection.query(sql, [id], function(err, result) {
    if (err) {
      console.error(err);
      res.status(500).send('Error retrieving data');
    } else {
      res.send(result);
    }
  });
});

app.get('/iscurrent/:id', function(req, res) {
  const id = req.params.id;
  const sql = 'SELECT * FROM current WHERE project_id LIKE ?';
  connection.query(sql, [id], function(err, result) {
    if (err) {
      console.error(err);
      res.status(500).send('Error retrieving data');
    } else {
      res.send(result);
    }
  });
});

// Create a Multer storage engine to handle file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.path === '/api/edit-homepage') {
      cb(null, '../img/home/selected');
    } else {
      cb(null, '../img/projects/');
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  },
});
const upload = multer({ storage });
const uploadToCurrent = (id, position) => {
  connection.query(
    'INSERT INTO current (project_id, position) VALUES (?, ?)',
    [id, position],
    (error, result) => {
      if (error) {
        console.error('Error inserting data:', error);
        return false
      } else {
        console.log('Data inserted successfully');
        return true
      }
    }
  );
} 

// Handle form submissions
app.post('/api/submit-form', upload.single('image'), (req, res) => {
  const { title, cat, current } = req.body;
  const image = req.file.filename;
  const position = 1;
  console.log('current->',current)
  let lastInsertId = 0;

  connection.query(
    'INSERT INTO projects (title, img, cat, position) VALUES (?, ?, ?, ?)',
    [title, image, cat, position],
    (error, result) => {
      if (error) {
        console.error('Error inserting data:', error);
        res.status(500).send('Error inserting data');
      } else {
        console.log('Data inserted successfully');
        res.send('Data inserted successfully');
      }
      lastInsertId = result.insertId
      console.log(result.insertId)
      console.log(lastInsertId)
      if(current == "1"){
        if(lastInsertId !== 0){
          uploadToCurrent(lastInsertId,1)
        }else{
          console.error('Error to find inserted id');
        }
      }
    }
  );
});

app.post('/api/update-position', (req, res) => {
  const data = req.body;
  console.log(data)

  let newq = '';
  let allId = ''
  let count = 0;
  for(const d of data){
    newq += ' WHEN id = ' + d.id + ' THEN ' + d.position;
    if(count == 0){
      allId += d.id
    }else{
      allId += ', ' + d.id
    }
    count++
    
  }
  
  const finalq = 'UPDATE projects SET position = CASE' + newq + ' ELSE position END WHERE id IN (' + allId + ')';
  console.log(finalq)
  connection.query(finalq, function(err, results, fields) {
    if (err) throw err;
    res.send(results);
  });
});

app.post('/api/update-position-current', (req, res) => {
  const data = req.body;
  console.log(data)

  let newq = '';
  let allId = ''
  let count = 0;
  for(const d of data){
    newq += ' WHEN id = ' + d.id + ' THEN ' + d.position;
    if(count == 0){
      allId += d.id
    }else{
      allId += ', ' + d.id
    }
    count++
    
  }
  
  const finalq = 'UPDATE current SET position = CASE' + newq + ' ELSE position END WHERE id IN (' + allId + ')';
  console.log(finalq)
  connection.query(finalq, function(err, results, fields) {
    if (err) throw err;
    res.send(results);
  });
});

const DeleteCurrent = (id) => {
  connection.query(
    'DELETE FROM current WHERE project_id = ?',
    [id],
    (error, result) => {
      if (error) {
        console.error('Error deleting data:', error);
        return false
      } else {
        console.log('Data delete successfully');
        return true
      }
    }
  );
} 

app.get('/deleteproject/:id', function(req, res) {
  const id = req.params.id;
  const sql = 'DELETE FROM projects WHERE id LIKE ?';
  connection.query(sql, [id], function(err, result) {
    if (err) {
      console.error(err);
      res.status(500).send('Error retrieving data');
    } else {
      res.send(result);
    }
  });
});


// Handle form edit form
app.post('/api/edit-form', upload.single('image'), (req, res) => {
  const { id, title, cat, current, defaultCurrent } = req.body;
  let image = null;
  if (req.file) {
    image = req.file.filename;
  }
  console.log('current->',req.body);
  if(title !== '' || image !== null || cat !== ''){
  console.log('current->',req.body);

  // Build SQL query dynamically based on which fields have non-empty values
  let query = 'UPDATE projects SET';
  let params = [];
  if (title !== '') {
    query += ' title = ?,';
    params.push(title);
  }
  if (image !== null) {
    query += ' img = ?,';
    params.push(image);
  }
  if (cat !== '') {
    query += ' cat = ?,';
    params.push(cat);
  }
  query = query.slice(0, -1); // Remove trailing comma
  query += ' WHERE id = ?';

  params.push(id);

  console.log(query)
  console.log(params)

  connection.query(
    query,
    params,
    (error, result) => {
      if (error) {
        console.error('Error updating data:', error);
        res.status(500).send('Error updating data');
      } else {
        console.log('Data updated successfully');
        if(current !== defaultCurrent){
          if (current == "1") {
            console.log('Update current project');
            uploadToCurrent(id, 1);
          }else{
            console.log('Delete current project');
            DeleteCurrent(id)
          }
        }
        res.send('Data updated successfully');
      }
    }
  );
  }else{
    if(current !== defaultCurrent){
      if (current == "1") {
        console.log('Update current project');
        uploadToCurrent(id, 1);
        res.send('Data updated successfully');
      }else{
        console.log('Delete current project');
        DeleteCurrent(id)
        res.send('Data updated successfully');
      }
    }
  }
});

app.post('/api/edit-homepage', upload.single('image'), (req, res) => {
  const { id } = req.body;
  let image = null;
  if (req.file) {
    image = req.file.filename;
  }
  if(image !== null){
    console.log(id)
    console.log(image)

  // Build SQL query dynamically based on which fields have non-empty values
  let query = 'UPDATE homepage SET';
  let params = [];
  if (image !== null) {
    query += ' img = ?,';
    params.push(image);
  }
  query = query.slice(0, -1); // Remove trailing comma
  query += ' WHERE id = ?';

  params.push(id);
  console.log(query)
  console.log(params)

  connection.query(
    query,
    params,
    (error, result) => {
      if (error) {
        console.error('Error updating data:', error);
        res.status(500).send('Error updating data');
      } else {
        console.log('Data updated successfully');
        res.send('Data updated successfully');
      }
    }
  );
  }
});

// start the server
app.listen(3000, function() {
  console.log('Server listening on port 3000!');
});
