const express = require('express');
const router = express.Router();

router.get('/', function (req, res) {
  res.render('index', { title: 'Rebuild Docs Preview' });
});

module.exports = router;
