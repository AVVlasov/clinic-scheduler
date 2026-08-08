'use strict';
const express = require('express');
const srv = express();
srv.use(require('./stubs/api'));
srv.listen(55289, '127.0.0.1', () => console.log('UP 55289'));
process.stdin.resume();
