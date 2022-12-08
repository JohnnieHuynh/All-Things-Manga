const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
require('dotenv').config();
const body_parser = require('body-parser');
const app = express();
const session = require('express-session');
const conn = dbConnection();

app.set("view engine", "ejs");
app.use(express.static("public"));
//Use to get values with POST method
app.use(body_parser.json()); // for parsing application/json
app.use(body_parser.urlencoded({ extended: true }));

//Initial Status
let isAdmin;

//Sessions
app.use(session({
  secret: "top secret!",
  resave: false,
  saveUninitialized: true
}));


//Listen
app.listen(3000, () => {
  console.log("Server Started!");
})

//Root Route (FOR NOW)
app.get('/', async (req, res) => {
  let sql = "SELECT * from manga";
  let rows = await executeSQL(sql);
  let id = -1;
  if (req.session.userID != null) {
    id = req.session.userID;
  }

  //Check if admin is set
  if (req.session.isAdmin == null) {
    isAdmin = -1;
  }
  else {
    isAdmin == req.session.isAdmin;
  }
  //this fixes the problem ^

  res.render("homepage.ejs", { "manga": rows, "userID": id, "isAdmin": isAdmin });
})

//Account Route
app.get('/account', async (req, res) => {
  //Going to Have to change because there will be times where u will be logged in already when u get to this screen
  let errMsg = "";
  res.render("account.ejs", { "errMsg": errMsg });
})

//POST Account
app.post('/account', async (req, res) => {
  //Get User Input From Login Form
  let usernameInput = req.body.username;
  let passwordInput = req.body.password;

  let sql = "SELECT * FROM atm_users WHERE username = ?";
  let params = [usernameInput];
  let rows = await executeSQL(sql, params);

  //DB Vars
  let dbUsername = "";
  let dbPassword = "";
  let dbUserID = 0;
  let dbAdminStat = false;

  //Note: Searching for Username is not needed unless the db allows for multiple values of username that are the same (which in this case it does, may go back and change if i want)
  if (rows.length > 0) {
    dbUsername = rows[0].username;
    dbPassword = rows[0].password;
    dbUserID = rows[0].userID;
    dbAdminStat = rows[0].isAdmin;

  }

  //Set Session Authentication to false
  req.session.authenticated = false;

  //Def Error Message
  let errMsg = "";

  if (usernameInput == dbUsername && passwordInput == dbPassword) {
    //Set Session Authentication
    req.session.authenticated = true;

    //Retrive UserID and Set Session UserID
    req.session.userID = dbUserID;
    let sentUserID = req.session.userID;

    //Set Session Admin Status
    req.session.isAdmin = dbAdminStat;

    //Get Mangas for Homepage Test
    let sql = "SELECT * from manga";
    let mangas = await executeSQL(sql);

    //Get Admin Status
    let isAdmin = req.session.isAdmin;
    console.log("Checkpoint 3: Admin Status is: " + isAdmin);

    //Send to Homepage if successful
    res.render("homepage.ejs", { "userID": sentUserID, "manga": mangas, "isAdmin": isAdmin });
  } else {
    //Error Message
    errMsg = "Wrong Credentials!";

    //Send back to login screen
    res.render("account.ejs", { "errMsg": errMsg });
  }

})


app.get('/cart', async (req, res) => {
  //get all manga 

  if (req.session.userID == null) {
    let errMsg = "";
    res.render("account.ejs", { "errMsg": errMsg });
  }
  else {
    let sql = "SELECT * from manga";
    let mangas = await executeSQL(sql);

    let sql2 = "SELECT * FROM cart WHERE userID = ? AND purchased = ?";
    //for testing purpose, change back when you;re done
    //let params = [1, 0]
    let params = [req.session.userID, 0];
    let rows = await executeSQL(sql2, params);
    let cartID = -1;
    let result = [];
    if (rows.length != 0) {
      sql = `SELECT * from cart_item WHERE cartID = ${rows[0].cartID}`;
      result = await executeSQL(sql);
      cartID = rows[0].cartID;
    }
    console.log("get cart: \n" + result);
    let isAdmin = -1;
    if (req.session.isAdmin != null) {
      isAdmin = req.session.isAdmin;
    }

    res.render("cart.ejs", { "rows": result, "mangas": mangas, "cartID": cartID, "isAdmin": isAdmin });
  }
});

app.get('/accountOrder', isAuthenticated, async (req, res) => {
  //get all carts that have been purchased first
  //for each cart in your carts, get all corresponding cart items
  //put all this into an array which you parse into your render 
  let sql = `SELECT * FROM cart WHERE userID= ${req.session.userID} AND purchased=1`;
  let carts = await executeSQL(sql);
  let output = [];
  for (let i = 0; i < carts.length; i++) {
    sql = `SELECT * FROM cart_item WHERE cartID = ${carts[i].cartID}`;
    let cart_items = await executeSQL(sql);
    let arr = [];
    for (let j = 0; j < cart_items.length; j++) {
      arr.push(cart_items[j]);
    }
    output.push(arr);
  }
  let isAdmin = -1;
  if (req.session.isAdmin != null) {
    isAdmin = req.session.isAdmin;
  }
  sql = "SELECT * from manga";
  let mangas = await executeSQL(sql);
  res.render("accountOrder.ejs", { "rows": output, "mangas": mangas, "isAdmin": isAdmin });
});

app.post('/cart', async (req, res) => {
  //update cart items
  //action contains what action to perform (UPDATE/DELETE)
  let action = req.body[0].action;
  let data = req.body;
  let sql = "";
  let params = [];
  if (action == "UPDATE") { //update from cart 
    for (let i = 2; i < data.length; i++) {
      sql = data[1].query;
      params = [data[i].qty, data[i].cartItemID];
      await executeSQL(sql, params);
    }
  }
  else if (action == "DELETE") { //delete from cart
    sql = data[1].query;
    params = [data[2].cartItemID];
    await executeSQL(sql, params);
  }
  //From homepage route, when user clicks on add to cart button
  else if (action == "ADD") {
    let id = req.body[1].userID;
    let mangaID = req.body[1].mangaID;
    //check if order exist based on user id
    sql = "SELECT * FROM cart WHERE userID = ? AND purchased = ?";
    params = [id, 0];
    let rows = await executeSQL(sql, params);
    // if order does not exist, create a new order and order item
    if (rows.length == 0) {
      sql = "INSERT INTO cart (userID, total, date, purchased) VALUES (?, ?, ? ,?)";
      params = [id, 0, 0, 0];
      await executeSQL(sql, params);
      sql = "SELECT * FROM cart WHERE userID = ? AND purchased = ?";
      params = [id, 0];
      let rows = await executeSQL(sql, params);
      let cart = rows[0];
      sql = "INSERT INTO cart_item (cartID, mangaID, qty) VALUES(?,?,?)";
      params = [cart.cartID, mangaID, 1];
      await executeSQL(sql, params);
    }
    // else create a new order item 
    else {
      //check if cart_item (manga) already in database, if it is, add qty by 1
      let cart = rows[0];
      sql = "SELECT * FROM cart_item WHERE cartID = ? AND mangaID = ?";
      params = [cart.cartID, mangaID];
      let cart_item = await executeSQL(sql, params);
      if (cart_item.length == 0) {
        sql = "INSERT INTO cart_item (cartID, mangaID, qty) VALUES(?,?,?)";
        params = [cart.cartID, mangaID, 1];
        await executeSQL(sql, params);
      }
      else {
        sql = "UPDATE cart_item SET qty = ? WHERE cartItemID = ?";
        let qty = Number(cart_item[0].qty) + 1;
        params = [qty, cart_item[0].cartItemID];
        await executeSQL(sql, params);
      }
    }
  }
  else if (action == "CHECKOUT") {
    console.log(data);
    sql = data[1].query;
    let cartID = data[2].cartID;
    let purchased = data[2].purchased;
    let total = data[2].total;
    params = [purchased, total, cartID];
    await executeSQL(sql, params);
  }

  sql = "SELECT * from manga";
  let mangas = await executeSQL(sql);

  let sql2 = "SELECT * FROM cart WHERE userID = ? AND purchased = ?";
  //for testing purpose, change back when you;re done
  //params = [1, 0]
  params = [req.session.userID, 0];
  let rows = await executeSQL(sql2, params);
  let cartID = -1;
  let result = [];
  if (rows.length != 0) {
    sql = `SELECT * from cart_item WHERE cartID = ${rows[0].cartID}`;
    result = await executeSQL(sql);
    cartID = rows[0].cartID;
  }
  console.log(result);
  let isAdmin = -1;
  if (req.session.isAdmin != null) {
    isAdmin = req.session.isAdmin;
  }

  res.render("cart.ejs", { "rows": result, "mangas": mangas, "cartID": cartID, "isAdmin": isAdmin });

});

//Add Account Route
app.get('/addAccount', async (req, res) => {

  let rowAffected = false;

  if (req.query.username) {

    let sql = "INSERT INTO atm_users (username, password, firstName, isAdmin, isActive, state, zipCode, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    //Default Admin Status is false
    let statusAdmin = false;
    let statusActive = true;
    let params = [req.query.username, req.query.password, req.query.firstName, statusAdmin, statusActive, req.query.state, req.query.zipCode, req.query.gender];
    let rows = await executeSQL(sql, params);
    console.log(rows);
    if (rows.affectedRows == 1) {
      rowAffected = true;
    }
  }
  res.render("addAccount.ejs", { "accountAdded": rowAffected });
})

//route for search
app.get('/search', async (req, res) => {
  let sql = "SELECT * from manga WHERE title LIKE ?";
  let params = [`%${req.query.search}%`];
  let rows = await executeSQL(sql, params);
  res.render("homepage.ejs", { "manga": rows });
})

//Normal User Menu
app.get('/normalUserMenu', isAuthenticated, async (req, res) => {

  res.render("normalUserMenu.ejs");
})

//Update Normal User Profile
app.get('/normalUserUpdateProfile', isAuthenticated, async (req, res) => {
  //Get UserInfo form session
  let tempUserID = req.session.userID;

  //Status for Update Message
  let rowAffected = false;

  if (req.query.username) {

    let sql = "UPDATE atm_users SET username = ?, password = ?, firstName = ?, state = ?, zipCode = ?, gender = ? WHERE userID = ?";

    let params = [req.query.username, req.query.password, req.query.firstName, req.query.state, req.query.zipCode, req.query.gender, req.query.userID];

    let rows = await executeSQL(sql, params);

    if (rows.affectedRows == 1) {
      rowAffected = true;
    }
  }

  let sql = "SELECT * FROM atm_users WHERE userID = ?";
  let rows = await executeSQL(sql, tempUserID);

  res.render("normalUserUpdateProfile.ejs", { "rows": rows, "userUpdated": rowAffected });
})

//Admin Menus
app.get('/adminAccountMenu', isAuthenticated, async (req, res) => {
  res.render("adminAccountMenu.ejs");
});

app.get('/displayAdminMenu1', async (req, res) => {
  let sql = "SELECT userID, username, firstName from atm_users WHERE isActive = 1 ORDER BY userID";
  let rows = await executeSQL(sql);

  res.render("displayAdminMenu1.ejs", { "rows": rows });

});

// Test display for update manga

app.get('/displayAdminMenu2', async (req, res) => {
  let sql = "SELECT mangaID, title, price from manga ORDER BY mangaID";
  let rows = await executeSQL(sql);

  res.render("displayAdminMenu2.ejs", { "rows": rows });

});


app.get('/updateAdminMenu1', async (req, res) => {

  let rowAffected = false;

  if (req.query.username) {

    let sql = "UPDATE atm_users SET username = ?, password = ?, firstName = ?, state = ?, zipCode = ?, gender = ? WHERE userID = ?";

    let params = [req.query.username, req.query.password, req.query.firstName, req.query.state, req.query.zipCode, req.query.gender, req.query.userID];

    let rows = await executeSQL(sql, params);

    if (rows.affectedRows == 1) {
      rowAffected = true;
    }
  }

  let sql = "SELECT * FROM atm_users WHERE userID = ?";
  let rows = await executeSQL(sql, [req.query.userID]);

  res.render("updateAdminMenu1.ejs", { "rows": rows, "userUpdated": rowAffected });
})

//Updating Manga from the Admin view
app.get('/updateManga', async (req, res) => {
  let rowAffected = false;

  if (req.query.title) {
    let sql = "UPDATE manga SET title = ?, quantity = ?, price = ? image = ?, description = ?";
    let params = [req.query.title, req.query.quantity, req.query.price, req.query.image, req.query.description, req.query.mangaID];
    let rows = await executeSQL(sql, params);

    if (rows.affectedRows == 1) {
      rowAffected = true;
    }
  }
  let sql = "SELECT * FROM manga WHERE mangaID=?";
  let rows = await executeSQL(sql, [req.query.mangaID]);

  res.render("updateManga.ejs", { "rows": rows, "mangaUpdated": rowAffected });
});

// Delete Account
app.get('/deleteAccount', isAuthenticated, async (req, res) => {
  //Look for user in sql table
  let sql = "UPDATE atm_users SET isActive = ? WHERE userID = ?";

  let params = [0, req.query.userID];

  let rows = await executeSQL(sql, params);

  //Changed to Johnnys Login Page for Now
  res.redirect("/displayAdminMenu1");

});

//Logout (Unused)
app.get('/logout', (req, res) => {
  //Kill Session
  req.session.destroy();
  //Redirect to root route
  res.redirect("homepage.ejs");
})

//DATA
async function executeSQL(sql, params) {
  return new Promise(function(resolve, reject) {
    conn.query(sql, params, function(err, rows, fields) {
      if (err) throw err;
      resolve(rows);
    })
  })
}

//DB Connection
function dbConnection() {
  const pool = mysql.createPool({
    connectionLimit: 5,
    host: process.env.HOST_KEY,
    user: process.env.USER_KEY,
    password: process.env.PASS_KEY,
    database: process.env.DATABASE_KEY

  });

  return pool;
}

//Function for Authentication
function isAuthenticated(req, res, next) {
  if (!req.session.authenticated) {
    res.render("account.ejs");
  } else {
    //If authenticated, then go to next route
    next();
  }
}


