const express = require('express');

const sql = require('mysql');

const connection = sql.createPool({
    host: 'localhost',
    user: 'main',
    password: '',
    database: 'kumiko'
});

function auth(token) {// 檢查token是否合法
    return new Promise((resolve, reject) => {
        connection.query('SELECT * FROM `login_log` WHERE token = ?', [token], (err, result) => {
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

module.exports = {auth};