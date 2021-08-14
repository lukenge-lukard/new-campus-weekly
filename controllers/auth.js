const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require('fs');

// let user_email;
var data = fs.readFileSync('words.json');
var words = JSON.parse(data);
console.log(words);


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

pool.getConnection((err, connection) => {
  if(err) throw err; //not connected
});

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).render("admin/login", {
        message: "Please provide an email and password",
        layout: 'landingPage',
      });
    }
    
    pool.getConnection((err, connection) => {
      if(err) throw err; //not connected
      
      connection.query("SELECT * FROM tbl_user WHERE email = ?", [email], async (error, results) => {
          // Once done, release connection
          connection.release();
          
          if (!results || !(await bcrypt.compare(password, results[0].password)) ) {
              res.status(401).render("admin/login", {
                message: "Email or Password is Incorrecct",
                layout: 'landingPage',
              });
          
          }else {                 
              req.session.user = results[0];
              // req.session.userId = user.id;
              // return res.redirect('/home');

              if(!req.session.user){
                  return res.status(401).send("Unauthorized!");
              } else {
                  return res.status(200).redirect("/feed");
              }       
          }
      });
            
    });
    
  } catch (error) {
    console.log(error);
  }
        
};

exports.register = (req, res) => {
  console.log(req.body);

  const { surname, firstname, email, password, passwordConfirm } = req.body;

  if (!surname || !firstname || !email || !password) {
    return res.status(400).render("admin/register", {
      message: "Please provide name, email and password",
      layout: 'landingPage',
    });
  }

  if ( !passwordConfirm) {
    return res.status(400).render("admin/register", {
      message: "Please re-fill form and comfirm password",
      layout: 'landingPage',
    });
  }

  pool.getConnection((err, connection) => {
    if(err) throw err; //not connected

    connection.query(
      "SELECT email FROM tbl_user WHERE email = ?",
      [email],
      async (error, results) => {
        // Once done, release connection
        connection.release();

        if (error) {
          console.log(error);
        }
        if (results.length > 0) {
          return res.render("admin/register", {
            message: "That email is already in use",
            layout: 'landingPage',
          });
        } else if (password !== passwordConfirm) {
          return res.render("admin/register", {
            message: "Passwords do not match",
            layout: 'landingPage',
          });
        }
  
        let hashedPassword = await bcrypt.hash(password, 8);
        console.log(hashedPassword);

        pool.getConnection((err, connection) => {
          if(err) throw err; //not connected

          connection.query(
            "INSERT INTO tbl_user SET ?",
            { surname: surname, firstname: firstname, email: email, password: hashedPassword },
            (error, results) => {
              // Once done, release connection
              connection.release();

              if (error) {
                console.log(error);
              } else {
                console.log(results);
                return res.render("admin/register", {
                  message: "User registered",
                  layout: 'landingPage',
                });
              }
            }
          );
        });  
      }
    );
  });
};

exports.upload =  (req, res) => {
  try {
      let sampleFile;
      let uploadPath;
    
      if(!req.files || Object.keys(req.files).length === 0){
          req.session.msg = "No files were uploaded";
          return res.status(400).redirect('/account');
      }
    
      // name of the input is sampleFile
      sampleFile = req.files.sampleFile;
      uploadPath = path.join(__dirname, "../upload", sampleFile.name);
      const imageV2 = sampleFile.data.toString('base64');
    
      // use mv() to place file on the server
      sampleFile.mv(uploadPath, function(err){
          if(err) return res.status(500).send(err);
    
          pool.getConnection((err, connection) => {
              if(err) throw err; //not connected
              
              connection.query('UPDATE tbl_user SET profile_photo = ? WHERE user_id = ?', [imageV2,req.session.user.user_id], (err, rows) => {
                  // Once done, release connection
                  connection.release();
                  
                  if(!err){
                      req.session.msg = "Profile Photo Updated";
                      return res.redirect('/account');                      
                  } else{
                      console.log(err);
                  }
              });
          });
      });
      
    
    
  } catch (error) {
    console.log(error);
  }
};

exports.update = (req, res) => {
  try {

    const { sex, date, phoneNumber } = req.body;
    
    if (!sex && !date && !phoneNumber) {      
      console.log("No field filled");

      pool.getConnection((err, connection) => {
          if(err) throw err; //not connected                  
          connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
              connection.release();                      
              if(!err){
                  req.session.msg = "No field filled";
                  return res.redirect('/account'); 
              } else{
                console.log(err);
              }
          });
      });
    }

    else if (sex && !date && !phoneNumber) {

      console.log("Input Only: Sex");
      pool.getConnection((err, connection) => {
        if(err) throw err; //not connected
  
        connection.query(
          "UPDATE tbl_user SET ? WHERE user_id = ?",
          [{ sex: sex }, req.session.user.user_id],
          (error, results) => {
            connection.release();
            
            if (error) {
              console.log(error);
            } else {
              pool.getConnection((err, connection) => {
                  if(err) throw err; //not connected                  
                  connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
                      connection.release();                      
                      if(!err){
                          req.session.msg = "Sex Updated";
                          return res.status(200).redirect('/account'); 
                      } else{
                        console.log(err);
                      }
                  });
              });
            }
          }
        );
      });
  
    }

    else if (!sex && date && !phoneNumber) {

      console.log("Input Only: Date");
      pool.getConnection((err, connection) => {
        if(err) throw err; //not connected
  
        connection.query(
          "UPDATE tbl_user SET ? WHERE user_id = ?",
          [{ date_of_birth: date }, req.session.user.user_id],
          (error, results) => {
            connection.release();

            if (error) {
              console.log(error);
            } else {
              pool.getConnection((err, connection) => {
                  if(err) throw err; //not connected                  
                  connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
                      connection.release();                      
                      if(!err){
                          req.session.msg = "Date Updated";
                          return res.status(200).redirect('/account');
                      } else{
                        console.log(err);
                      }
                  });
              });
            }
          }
        );
      });
    }

    else if (!sex && !date && phoneNumber) {

      console.log("Input Only: Phonenumber");
      pool.getConnection((err, connection) => {
        if(err) throw err; //not connected
  
        connection.query(
          "UPDATE tbl_user SET ? WHERE user_id = ?",
          [{ phone_number: phoneNumber }, req.session.user.user_id],
          (error, results) => {
            connection.release();

            if (error) {
              console.log(error);
            } else {
              pool.getConnection((err, connection) => {
                  if(err) throw err; //not connected                  
                  connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
                      connection.release();                      
                      if(!err){
                          req.session.msg = "Phone Number Updated";
                          return res.status(200).redirect('/account');
                      } else{
                        console.log(err);
                      }
                  });
              });
            }
          }
        );
      });
    }      
    
    else if (!sex || !date || !phoneNumber) {      
      console.log("Some field left out");

      pool.getConnection((err, connection) => {
          if(err) throw err; //not connected                  
          connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
              connection.release();                      
              if(!err){
                  req.session.msg = "Fill ALL fields or only ONE in a section and submit";
                  return res.status(200).redirect('/account');
              } else{
                console.log(err);
              }
          });
      });
    } 

    else {

      console.log("Input Only: All fields entered!");
      pool.getConnection((err, connection) => {
        if(err) throw err; //not connected
  
        connection.query(
          "UPDATE tbl_user SET ? WHERE user_id = ?",
          [{ sex: sex, date_of_birth: date, phone_number: phoneNumber }, req.session.user.user_id],
          (error, results) => {
            connection.release();

            if (error) {
              console.log(error);
            } else {
              pool.getConnection((err, connection) => {
                  if(err) throw err; //not connected                  
                  connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
                      connection.release();                      
                      if(!err){
                          req.session.msg = "Profile Updated";
                          return res.status(200).redirect('/account');
                      } else{
                        console.log(err);
                      }
                  });
              });
            }
          }
        );
      });
    } 
    
  } catch (error) {
    console.log(error);
  }
};

exports.editName = (req, res) => {
  try {

    const { surname, firstname, username } = req.body;
    
    if (!surname && !firstname && !username) {      
      console.log("No fields filled");

      pool.getConnection((err, connection) => {
          if(err) throw err; //not connected                  
          connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
              connection.release();                      
              if(!err){
                  req.session.msg = "No field filled";
                  return res.status(400).redirect('/account');
              } else{
                console.log(err);
              }
          });
      });
    }

    else if (surname && !firstname && !username) {

      console.log("Input Only: surname");
      pool.getConnection((err, connection) => {
        if(err) throw err; //not connected
  
        connection.query(
          "UPDATE tbl_user SET ? WHERE user_id = ?",
          [{ surname: surname }, req.session.user.user_id],
          (error, results) => {
            connection.release();
            
            if (error) {
              console.log(error);
            } else {
              pool.getConnection((err, connection) => {
                  if(err) throw err; //not connected                  
                  connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
                      connection.release();                      
                      if(!err){
                          req.session.msg = "Surname Updated";
                          return res.status(200).redirect('/account');
                      } else{
                        console.log(err);
                      }
                  });
              });
            }
          }
        );
      });
  
    }

    else if (!surname && firstname && !username) {

      console.log("Input Only: firstname");
      pool.getConnection((err, connection) => {
        if(err) throw err; //not connected
  
        connection.query(
          "UPDATE tbl_user SET ? WHERE user_id = ?",
          [{ firstname: firstname }, req.session.user.user_id],
          (error, results) => {
            connection.release();

            if (error) {
              console.log(error);
            } else {
              pool.getConnection((err, connection) => {
                  if(err) throw err; //not connected                  
                  connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
                      connection.release();                      
                      if(!err){
                          req.session.msg = "First Name Updated";
                          return res.status(200).redirect('/account');
                      } else{
                        console.log(err);
                      }
                  });
              });
            }
          }
        );
      });
    }

    else if (!surname && !firstname && username) {

      console.log("Input Only: username");
      pool.getConnection((err, connection) => {
        if(err) throw err; //not connected
  
        connection.query(
          "UPDATE tbl_user SET ? WHERE user_id = ?",
          [{ username: username }, req.session.user.user_id],
          (error, results) => {
            connection.release();

            if (error) {
              console.log(error);
            } else {
              pool.getConnection((err, connection) => {
                  if(err) throw err; //not connected                  
                  connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
                      connection.release();                      
                      if(!err){
                          req.session.msg = "Username Updated";
                          return res.status(200).redirect('/account');
                      } else{
                        console.log(err);
                      }
                  });
              });
            }
          }
        );
      });
    }      
    
    else if (!surname || !firstname || !username) {      
      console.log("Some field left out");

      pool.getConnection((err, connection) => {
          if(err) throw err; //not connected                  
          connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
              connection.release();                      
              if(!err){
                  req.session.msg = "Fill ALL fields or only ONE in a section and submit";
                  return res.status(400).redirect('/account');
              } else{
                console.log(err);
              }
          });
      });
    } 

    else {

      console.log("Input Only: All fields entered!");
      pool.getConnection((err, connection) => {
        if(err) throw err; //not connected
  
        connection.query(
          "UPDATE tbl_user SET ? WHERE user_id = ?",
          [{ surname: surname, firstname: firstname, username: username }, req.session.user.user_id],
          (error, results) => {
            connection.release();

            if (error) {
              console.log(error);
            } else {
              pool.getConnection((err, connection) => {
                  if(err) throw err; //not connected                  
                  connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
                      connection.release();                      
                      if(!err){
                          req.session.msg = "Profile Updated";
                          return res.status(200).redirect('/account');
                      } else{
                        console.log(err);
                      }
                  });
              });
            }
          }
        );
      });
    } 
    
  } catch (error) {
    console.log(error);
  }
};

exports.editPassword = (req, res) => {
  try {

    const { currentPassword, newPassword, confirmPassword } = req.body
    
    if (!currentPassword || !newPassword || !confirmPassword) {

      pool.getConnection((err, connection) => {
          if(err) throw err; //not connected                  
          connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
              connection.release();                      
              if(!err){
                  req.session.msg = "Please fill all the password fields.";
                  return res.status(400).redirect('/account');
              } else{
                console.log(err);
              }
          });
      });



      
    } 

    else if (newPassword !== confirmPassword) {

      pool.getConnection((err, connection) => {
          if(err) throw err; //not connected                  
          connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
              connection.release();                      
              if(!err){
                  req.session.msg = "New Passwords do not match";
                  return res.status(401).redirect('/account');
              } else{
                console.log(err);
              }
          });
      });
    }
    
    else {

      pool.getConnection((err, connection) => {
        if(err) throw err; //not connected
        
        connection.query(
          "SELECT * FROM tbl_user WHERE user_id = ?",
          [req.session.user.user_id],
          async (error, results) => {
            // Once done, release connection
            connection.release();
            
            if (
              !results ||
              !(await bcrypt.compare(currentPassword, results[0].password))
              ) {
  
                pool.getConnection((err, connection) => {
                    if(err) throw err; //not connected                  
                    connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
                        connection.release();                      
                        if(!err){
                            req.session.msg = "Password is Incorrect";
                            return res.status(401).redirect('/account');
                        } else{
                          console.log(err);
                        }
                    });
                });
  
  
              } else {
  
                  let hashedPassword = await bcrypt.hash(newPassword, 8);
                  console.log(hashedPassword);
          
                  pool.getConnection((err, connection) => {
                    if(err) throw err; //not connected
              
                    connection.query(
                      "UPDATE tbl_user SET ? WHERE user_id = ?",
                      [{ password: hashedPassword }, req.session.user.user_id],
                      (error, results) => {
                        connection.release();
                        
                        if (error) {
                          console.log(error);
                        } else {
                          pool.getConnection((err, connection) => {
                              if(err) throw err; //not connected                  
                              connection.query("SELECT * FROM tbl_user WHERE user_id = ?",[req.session.user.user_id], (err, rows) => {
                                  connection.release();                      
                                  if(!err){
                                      req.session.msg = "Password Changed";
                                      return res.status(200).redirect('/account');
                                  } else{
                                    console.log(err);
                                  }
                              });
                          });
                        }
                      }
                    );
                  });        
                }
        });
              
      });
    }
     
  } catch (error) {
    console.log(error);
  }
};

exports.logout = (req, res) => {
  console.log("button pressed!");
  req.session.destroy(err => {
      if(err) {
          return res.send('/home');
          // return res.redirect('/home');
      }

      res.clearCookie(SESS_NAME);
      res.redirect('/login');
  });
};

exports.create = (req, res) => {
  try {

    const { date, title, paragraph } = req.body;

    if ( date && title && paragraph  ) {

      console.log("Input Only: Date");
   
      pool.getConnection((err, connection) => {
        if(err) throw err; //not connected

        connection.query(
          "INSERT INTO tbl_post SET ?",
          { post_title: title, post_date: date},
          (postError, postResults) => {
            // Once done, release connection
            connection.release();

            if (postError) {
              console.log(postError);
            } else {

              pool.query("INSERT INTO tbl_user_vs_post SET ?", { user_id: req.session.user.user_id, post_id: postResults.insertId}, (error, results) => {
                if(error){console.log(error);} else{
                  console.log("tbl_user_vs_post reached too!");

                  pool.query(
                    "INSERT INTO tbl_post_paragraphs SET ?",
                  { paragraph: paragraph,  post_id: postResults.insertId},
                  (paraError, paragraphResult) => {
                    if(paraError){
                      console.log(paraError);
                    }else {
                      console.log("Paragraph created too");
                      console.log(req.session.user.user_id);
                      console.log(paragraphResult);
                      console.log("Post  ID can still be accessed: ");
                      console.log(postResults.insertId);
    
    
                      req.session.msg = "New Post Created";
                      return res.redirect("/create");
                      
                    }
                  });

                }
              });


            }
          }
        );
      }); 

    }
    
    
    
  } catch (error) {
    console.log(error);
  }
};
