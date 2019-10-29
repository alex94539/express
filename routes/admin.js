const express = require('express');
const cors = require('cors');
const router = express.Router();

const sql = require('mysql');
const jwt = require('jsonwebtoken');

const auth = require('../api/auth');

const connection = sql.createPool({
    host: 'localhost',
    user: 'main',
    password: '',
    database: 'kumiko'
});

router.post('/adduser', async (req, res, next) => {
    let temp = await auth.auth(req.header('Authorization'));
    
    res.send({ status: temp.truth });
});



module.exports = router;