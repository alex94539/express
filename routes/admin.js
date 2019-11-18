const express = require('express');
const cors = require('cors');
const router = express.Router();

const sql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const auth = require('../api/auth');

const connection = sql.createPool({
    host: 'localhost',
    user: 'main',
    password: '',
    database: 'kumiko'
});

router.use(cors());

router.post('/adminlogin', async (req, res, next) => {
    await connection.execute('SELECT * FROM `user` WHERE `username` = ? AND `IsAdmin` = 1',[req.body.account], (err, result) => {
        if(err) throw err;
        if(result[0].password == req.body.pwd){
            
        }
    });
});

router.post('/adduser', async (req, res, next) => {
    let temp = await auth.auth(req.header('Authorization'));
    
    res.send({ status: temp.truth });
});



module.exports = router;

//pasi無更新?