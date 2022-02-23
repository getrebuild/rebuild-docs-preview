const express = require('express');
const router = express.Router();

router.get('/', function (req, res) {
  res.render('index', { title: '文档预览' });
});

module.exports = router;
