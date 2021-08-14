const express = require("express");
const mysql = require("mysql");
const authController = require("../controllers/auth");

const router = express.Router();

// Connection Pool
const pool = mysql.createPool({
    // connectionLimit  : 10,
    host             : process.env.DATABASE_HOST,
    user             : process.env.DATABASE_USER,
    password         : process.env.DATABASE_PASSWORD,
    database         : process.env.DATABASE,
    port             : process.env.DATABASE_PORT,  
    ssl  : {
        ca : fs.readFileSync(path.join(__dirname, "../ca-certificate.crt"))
        // ca : fs.readFileSync(__dirname + '/ca-certificate.crt')
      } 
});

//middleware
const redirectLogin = (req, res, next) => {
    pool.query("SELECT * FROM sessions", (err, rows) => {
        if(!err){
            if(rows[0] == null){
                console.log("No sessions present!")
                console.log(rows);
                return res.render("admin/login", {
                    layout: 'landingPage',
                    message: "Session timeout! Please Login Again."
                });
            } 
            else if(!req.session.user.user_id){
                return res.redirect('login');
            } else {
                return next();
            }
        } else{
            console.log("Error captured....");
            console.log(err);
        }
    });
}

//middleware
const redirectHome = (req, res, next) => {
    pool.query("SELECT * FROM sessions", (err, rows) => {
        if(!err){
            if(rows[0] == null){
                console.log("No sessions present!")
                console.log(rows);
                return res.render("admin/login", {layout: 'landingPage'});
            } 
            else if(req.session.user.user_id){
                return res.redirect('feed');
            } else {
                return next();
            }
        } else{
            console.log("Error captured....");
            console.log(err);
        }
    });
}

//middleware
const redirectRegisterHome = (req, res, next) => {
    pool.query("SELECT * FROM sessions", (err, rows) => {
        if(!err){
            if(rows[0] == null){
                console.log("No sessions present!")
                console.log(rows);
                return res.render("admin/register", {layout: 'landingPage'});
            } 
            else if(req.session.user.user_id){
                return res.redirect('feed');
            } else {
                return next();
            }
        } else{
            console.log("Error captured....");
            console.log(err);
        }
    });
}
  

//          "auth/register"
router.post("/register",  authController.register);

router.post("/login",  authController.login);

router.post("/upload", authController.upload);

router.post("/update", authController.update);

router.post("/editName", authController.editName);

router.post("/editPassword", authController.editPassword);

router.post("/logout", authController.logout);

router.post("/create", authController.create);


module.exports = router;
