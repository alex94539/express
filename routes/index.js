const express = require('express');
const cors = require('cors');
const router = express.Router();

const sql = require('mysql');
const jwt = require('jsonwebtoken');

const key = "OumaeKumiko";

let token, payload;
const connection = sql.createPool({
  host: 'localhost',
  user: 'main',
  password: '',
  database: 'kumiko'
});

function set(res) {
  res.set('Access-Control-Allow-Headers', 'Authorization,Content-type, Accept');
  res.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.set('Access-Control-Allow-Origin', '*');
}

router.use(cors());

router.options('*', cors());

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});
/*
                /auth/login
*/

router.options('/auth/login', async (req, res, next) => {
  set(res);
  res.set('Allow', 'POST, OPTIONS');
  res.send({ code: 200 });
});

router.post('/auth/login', async (req, res, next) => {
  set(res);
  res.set('Allow', 'POST, OPTIONS');
  console.log(req.body.pwd);
  if (!req.body.account) {
    res.send("wrong pattern, put data in body");
  }
  else {
    let temp = await search(req.body.account, req.body.pwd);
    console.log(temp.truth);

    if (temp.truth) {
      let temp_in = await duplicate(req.body.account);
      if (temp_in.truth) {
        await logout(temp_in.token);
        res.send({
          code: 401,
          text: '先前未登出，請重新登入'
        })
      }
      else {
        payload = {
          account: req.body.account,
          password: req.body.pwd,
          device: req.body.device
        }

        token = jwt.sign(payload, key);

        await newlog(token, req.body.account, req.body.device, temp.index);


        res.send({
          code: 200,
          token: token
        });
      }
    }
    else {

      res.send({ code: 401 });
    }
  }
});

/*
              /auth/logout
*/

router.get('/auth/logout', async (req, res, next) => {

  set(res);
  let temp = await auth(req.header('Authorization'));
  if (temp.truth) {

    await logout(req.header('Authorization'));
    res.send({
      code: 200,
      logout: true
    });
  }
  else {

    res.send({ code: 403 });
  }
});

/*
            /auth/profile
*/

router.get('/auth/profile', async (req, res, next) => {

  set(res);
  let temp = await auth(req.header('Authorization'));
  if (temp.truth) {
    res.send(await userprofile(temp.userID));
  }
  else {
    res.send({ code: 403 });
  }
});

router.patch('/auth/profile', async (req, res, next) => {
  set(res);
  let temp = await auth(req.header('Authorization'));
  if (temp.truth) {
    res.send(await updateprofile(req.body, temp.userID));
  }
  else {
    res.send({ code: 403 });
  }
});

router.options('/auth/profile', async (req, res, next) => {
  set(res);

  res.set('Allow', 'GET, PATCH, OPTIONS');
  res.send({ code: 200 });
});

router.get('/notification', async (req, res, next) => {
  set(res);

  let temp = await auth(req.header('Authorization'));
  if (temp.truth) {
    let data = await notification();
    res.send({
      code: 200,
      data: data
    })
  }
  else {
    res.send({ code: 403 });
  }

});

router.get('/board', async (req, res, next) => {
  set(res);

  let temp = await auth(req.header('Authorization'));
  if(temp.truth){
    let data = await board();
    res.send({
      code: 200,
      data: data
    });
  }
  else{
    res.send({ code: 200 });
  }
});

router.post('pasi', async (req, res, next) => {
  set(res);

  let temp = await auth(req.header('Authorization'));
  if(temp.truth){
    let data = await addpasi();
  }
  else{
    res.send({ code: 200 });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


module.exports = router;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function search(name, pass) { // 檢查登入資訊
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `user` WHERE username= ?', [name], async (err, result) => {
      if (err) throw err;
      console.log(result[0]);
      if (result[0].username == name && result[0].password == pass) {
        resolve({
          truth: true,
          index: result[0].index
        });
      }
      else {
        resolve({
          truth: false
        });
      }
    });
  });
}

async function duplicate(ID) {// 檢查Login log是否有重複登入紀錄
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `login_log` WHERE userID = ?', [ID], async (err, result) => {
      if (err) throw err;
      if (!result.length || !result[result.length - 1].valid) {
        resolve({
          truth: false
        });
      }
      else {
        resolve({
          truth: true,
          token: result[result.length - 1].Token
        });
      }


    });
  });
}

async function newlog(token, user, device, index) {// 新增登入資訊
  return new Promise((resolve, reject) => {
    connection.query('INSERT INTO `login_log` (`TID`, `Token`, `userID`, `Ctime`, `Utime`, `device_ID`, `valid`, `userindex`) VALUES (NULL, ?, ?, ?, ?, ?, 1, ?)', [token, user, new Date(), new Date(), device, index], (err, result) => {
      if (err) throw err;
      console.log(`insert`);
      resolve();
    });
  });
}

function showlog(body) {
  console.log();
  console.log(req.body.account);
  console.log(req.body.device);
}

async function auth(token) {// 檢查token是否合法
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `login_log` WHERE token = ?', [token], (err, result) => {
      console.log(result);
      if (err) throw err;
      if (result[0] && result[0].valid) {
        //console.log('resolve true');

        resolve({
          truth: true,
          userID: result[0].userindex
        });
      }
      else {
        //console.log('resolve false');

        resolve({ truth: false });

      }
    });
  });
}

async function logout(token) {// 登出
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `login_log` SET `valid` = 0 WHERE `login_log`.`Token` = ?', [token], (err, result) => {
      if (err) throw err;
      resolve();
    });
  });
}

async function userprofile(ID) {// return user profile
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `user` WHERE `index` = ?', [ID], (err, result) => {
      if (err) throw err;
      resolve({
        code: 200,
        name: result[0].name,
        gender: result[0].gender,
        birthday: result[0].birthday,
        photo: result[0].photo
      });
    });
  });
}

async function updateprofile(obj, ID) {// update user profile
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET `name` = ?, password = ?, `gender` = ?, `birthday` = ?, `photo` = ?, `Utime` = ? WHERE `user`.`index` = ?', [obj.name, obj.password, obj.gender, obj.birthday, obj.photo, ID, new Date()], (err, result) => {
      if (err) throw err;
      resolve({
        code: 200,
        update_success_count: 5
      });
    });
  });
}

async function notification() {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `notification`', (err, result) => {
      if (err) throw err;
      resolve({
        noti: result
      });
    });
  });
}

async function board(){
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `board`', (err, result) => {
      if(err) throw err;
    });
  });
}

async function addpasi(){

}