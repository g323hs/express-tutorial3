var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var multer = require("multer");
var upload = multer();
var session = require("express-session");
var cookieParser = require("cookie-parser");
var sqlite3 = require("sqlite3").verbose();

var sitePath = "";

app.set("view engine", "pug");
app.set("views", "./views");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(upload.array());
app.use(cookieParser());
app.use(
  session({ secret: "Your secret key", resave: false, saveUninitialized: true })
);

function connect() {
  var path =  "Users.db";
  const db = new sqlite3.Database(path, sqlite3.OPEN_READWRITE, err => {
    if (err) {
      console.error(err.message);
    } else {
      console.log("Connected to database.");
    }
  });
  return db;
}

function close(db) {
  db.close(err => {
    if (err) {
      console.error(err.message);
    } else {
      console.log("Closed the database connection.\n");
    }
  });
}

app.get("/signup", function(req, res) {
  res.render("signup");
});

app.post("/signup", function(req, res) {
  var UserExists = false;
  var db = connect();

  let sql = `SELECT * FROM Users WHERE ID == '` + req.body.id + `'`;
  db.all(sql, (err, rows) => {
    if (err) {
      console.error(err.message);
    } else {
      if (rows.length == 0) {
        //no user has that username => create new user
        var newUser = { id: req.body.id, password: req.body.password };
        db.run(
          `INSERT INTO Users(ID, password) VALUES(?,?)`,
          [newUser.id, newUser.password],
          function(err) {
            if (err) {
              return console.log(err.message);
              console.log(newUser.id, newUser.password);
              res.render("signup",{message: "Error submiting user data"});
            } else {
              console.log("User: " + newUser.id + " signed up");
              req.session.user = newUser;
              res.redirect(sitePath + "/protected_page");
            }
          }
        );
        
      } else {
        res.render("signup", {
          message: "User Already Exists! Login or choose another user id"
        });
      }
    }
  });
  close(db);
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  var valid = false;
  var user;
  var db = connect();

  let sql =
    `SELECT * FROM Users WHERE ID = '` +
    req.body.id +
    `' AND password = '` +
    req.body.password +
    `'`;

  db.all(sql, (err, rows) => {
    if (err) {
      console.error(err.message);
    } else {
      if (rows.length == 1) {
        // valid login
        user = { id: req.body.id, password: req.body.password };
        console.log("user: " + user.id + " logged in.");
        req.session.user = user;
        res.redirect(sitePath + "/protected_page");
      } else if (rows.length > 1){
        console.log("There is more than one user with that name!");
      } else {
        // invalid login
        res.render("login", { message: "Invalid credentials!", invalid: true });
      }
    }
  });
  close(db);
});

app.get("/logout", function(req, res) {
  if (req.session.user) {
    var id = req.session.user.id;
    req.session.destroy(function() {
      console.log("user: " + id + " logged out.\n");
    });
  }
  res.redirect(sitePath + "/login");
});

app.get("/failed_attempt", function(req, res) {
  res.render("failed_attempt");
});

function checkSignIn(req, res, next) {
  if (req.session.user) {
    console.log("successful attempt to view webpage");
    next();
  } else {
    console.log("failed attempt to view webpage");
    res.redirect(sitePath + "/failed_attempt");
  }
}

app.get("/protected_page", checkSignIn, function(req, res, next) {
  console.log("loading protected page");
  res.render("protected_page", { id: req.session.user.id });
});

app.get("/", function(req, res) {
  res.redirect(sitePath + "/login");
});

app.listen(3000, () => console.log("Listening on port 3000"));
