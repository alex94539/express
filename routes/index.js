const express = require('express');
const cors = require('cors');
const router = express.Router();

const sql = require('mysql2');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const moment = require('moment');

const auth = require('../api/auth');

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

function log(user, event) {
  console.log(`UserID ${user} request ${event} `);
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
  if (!req.body.account) {
    res.send("wrong pattern, put data in body");
  }
  else {
    let temp = await search(req.body.account, req.body.pwd);
    console.log(temp.truth);

    if (temp.truth) {

      log(temp.index, `login`);

      let temp_in = await duplicate(req.body.account);
      if (temp_in.truth) {
        await logout(temp_in.token);

        console.log(`UserID ${temp.index} failed to login - Duplicate`);

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

        console.log(`UserID ${temp.index} logged in successful`);

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
  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `logout`);

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
  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `get profile`);

    res.send(await userprofile(temp.userID));
  }
  else {
    res.send({ code: 403 });
  }
});

router.patch('/auth/profile', async (req, res, next) => {
  set(res);
  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `patch profile`);

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

  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `get notification`);

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

  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `get board`);

    let data = await board();
    res.send({
      code: 200,
      data: data
    });
  }
  else {
    res.send({ code: 403 });
  }
});

router.get('/pasi', async (req, res, next) => {
  set(res);

  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `get pasi`);

    let data = await getpasi(temp.userID);
    res.send({
      code: 200,
      data: data
    });
  }
  else {
    res.send({ code: 403 });
  }
});

router.post('/pasi', async (req, res, next) => {
  set(res);

  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `post pasi`);

    let data = await addpasi(req.body, temp.userID);
    res.send(data);
  }
  else {
    res.send({ code: 403 });
  }
});

router.delete('/pasi/:pasiindex', async (req, res, next) => {
  let index = req.params.pasiindex;
  console.log(index);
  set(res);

  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `delete pasi`);

    res.send(await deletepasi(index, temp.userID));
  }
  else{
    res.send({ code: 403 });
  }
});

router.put('/pasi/:pasiindex', async (req, res, next) => {
  let index = req.params.pasiindex;

  set(res);

  let temp = await auth.auth(req.header('Authorization'));;
  if (temp.truth) {

    log(temp.userID, `put pasi`);

    res.send(await putpasi(index, temp.userID, req.body));
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
      if (!result.length || !result[result.length - 1].valid) {// 若資料庫回傳空陣列，或是該使用者的最後登入紀錄的valid值為0
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
  return new Promise(async (resolve, reject) => {
    let count = 0;
    if (obj.name) {
      count += await update_name(obj.name, ID);
    }
    if (obj.password) {
      count += await update_passwod(obj.password, ID);
    }
    if (obj.gender) {
      count += await update_gender(obj.gender, ID);
    }
    if (obj.birthday) {
      count += await update_birthday(obj.birthday, ID);
    }
    if (obj.photo) {
      count += await update_photo(obj.photo, ID);
    }
    resolve({
      code: 200,
      update_success_count: count
    });
  });
}

async function update_name(name, ID) {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET `name` = ? WHERE `user`.`index` = ?', [name, ID], (err, result) => {
      if (err) throw err;
      resolve(1);
    });
  });
}

async function update_passwod(password, ID) {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET password = ? WHERE `user`.`index` = ?', [password, ID], (err, result) => {
      if (err) throw err;
      resolve(1);
    });
  });
}

async function update_gender(gender, ID) {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET `gender` = ? WHERE `user`.`index` = ?', [gender, ID], (err, result) => {
      if (err) throw err;
      resolve(1);
    });
  });
}

async function update_birthday(birthday, ID) {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET `birthday` = ? WHERE `user`.`index` = ?', [birthday, ID], (err, result) => {
      if (err) throw err;
      resolve(1);
    });
  });
}

async function update_photo(photo, ID) {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET `photo` = ? WHERE `user`.`index` = ?', [photo, ID], (err, result) => {
      if (err) throw err;
      resolve(1);
    });
  })
}

async function update_Utime() {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `user` SET `photo` = ? WHERE `user`.`index` = ?', [photo, ID], (err, result) => {
      if (err) throw err;
      resolve(1);
    });
  })
}

async function notification() {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `notification`', (err, result) => {
      if (err) throw err;
      resolve(result);
    });
  });
}

async function board() {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `topic`', (err, result) => {
      if (err) throw err;
      resolve(result);
    });
  });
}

async function getpasi(ID) {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `pasi` WHERE `pasi`.`ID` = ?', [ID], (err, result) => {
      if (err) throw err;
      result.forEach((temp) => {
        
        temp.head = JSON.parse(temp.head);
        temp.upper = JSON.parse(temp.upper);
        temp.lower = JSON.parse(temp.lower);
        temp.body = JSON.parse(temp.body);
      });
      resolve(result);
    });
  });
}

async function addpasi(body, ID) {
  return new Promise((resolve, reject) => {
    connection.query('INSERT INTO `pasi` (`index`, `createdAt`, `head`, `upper`, `lower`, `body`, `ID`) VALUES (NULL, ?, ?, ?, ?, ?, ?)', [new Date().toISOString(), JSON.stringify(body.head), JSON.stringify(body.upper), JSON.stringify(body.lower), JSON.stringify(body.body), ID], (err, result) => {
      if (err) throw err;
      console.log(`pasi added`);
      resolve({
        code: 200,
        update_success_count: 1
      });
    });
  });
}

async function deletepasi(index, userID) {
  return new Promise(async (resolve, reject) => {
    let temp = await pasi_checkuser(index, userID);
    if (temp.truth) {
      resolve(await pasi_deletion(index));
    }
    else {
      resolve({ code: 403 });
    }
  });
}

async function putpasi(index, userID, body) {
  return new Promise(async (resolve, reject) => {
    let temp = await pasi_checkuser(index, userID);
    if (temp.truth) {
      resolve(await pasi_put(index, body));
    }
    else {
      resolve({ code: 403 });//おぼえます
    }
  });
}

async function pasi_checkuser(index, userID) {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM `pasi` WHERE `pasi`.`index` = ?', [index], (err, result) => {
      if (err) throw err;
      if (!result.length || result[0].ID != userID) {
        resolve({
          truth: false
        });
      }
      else {
        resolve({
          truth: true
        });
      }
    });
  });
}

async function pasi_deletion(index) {
  return new Promise((resolve, reject) => {
    connection.query('DELETE FROM `pasi` WHERE `pasi`.`index` = ?', [index], (err, result) => {
      if (err) throw err;
      resolve({
        code: 200,
        update_success_count: 1
      });
    });
  });
}

async function pasi_put(index, body) {
  return new Promise((resolve, reject) => {
    connection.query('UPDATE `pasi` SET `head` = ?, `upper` = ?, `lower` = ?, `body` = ? WHERE `pasi`.`index` = ?', [JSON.stringify(body.head), JSON.stringify(body.upper), JSON.stringify(body.lower), JSON.stringify(body.body), index], (err, result) => {
      if(err) throw err;
      resolve({
        code: 200,
        update_success_count: 5
      })
    });
  });
}


//'INSERT INTO `login_log` (`TID`, `Token`, `userID`, `Ctime`, `Utime`, `device_ID`, `valid`, `userindex`) VALUES (NULL, ?, ?, ?, ?, ?, 1, ?)