const express = require('express');
const router = express.Router();
const AbortController = require('abort-controller');
const fetch = require('node-fetch');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

const USE_CACHED = {};

// 预览
router.get('/preview', async function (req, res) {
  const src = req.query.src;
  const attname = req.query.attname;

  function _preview(file) {
    res.sendFile(file, {
      headers: {
        'Content-Type': attname
          ? 'application/octet-stream'
          : 'application/pdf',
        'Content-Disposition': attname
          ? `attachment; filename=${encodeURIComponent(attname)}`
          : 'inline',
      },
    });
  }

  const srcClear = src.split('?')[0]; // No queries
  const c = USE_CACHED[srcClear];
  if (c) {
    const exists = fs.existsSync(c);
    if (exists) {
      console.log('Use cached :', c);
      _preview(c);
      return;
    } else {
      delete USE_CACHED[srcClear];
    }
  }

  await fileDownload(src, (err, file) => {
    if (err) {
      res.send(JSON.stringify(err));
    } else {
      convertPdf(file, (err2, file2) => {
        if (err2) {
          res.send(JSON.stringify(err2));
        } else {
          USE_CACHED[srcClear] = file2;
          _preview(file2);
        }
      });
    }
  });
});

// 下载文件
async function fileDownload(src, callback) {
  console.debug('Download file ...', src);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    (process.env.RBDP_FILE_DOWNLOAD_TIMEOUT || 30) * 1000
  );

  let response;
  try {
    response = await fetch(src, { signal: controller.signal });
  } catch (err) {
    if (err) console.error('>>>>>>>>>>', err);
    typeof callback === 'function' &&
      callback(`无法读取源文件 (1001) : ${src}`);
    return;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    typeof callback === 'function' &&
      callback(`无法读取源文件 (1002) : ${src}`);
    return;
  }

  const dest = `${getUseDir()}/file-${new Date().getTime()}`;

  const buffer = await response.buffer();
  fs.writeFile(`${dest}.download`, buffer, {}, err => {
    if (err) console.error('>>>>>>>>>>', err);
    typeof callback === 'function' && callback(err, dest);
  });
}

// 转换 PDF
function convertPdf(file, callback) {
  const cmd = `${
    process.env.RBDP_LIBREOFFICE_BIN || 'libreoffice'
  } --headless --convert-to pdf ${file}.download --outdir ${getUseDir()}`;
  console.debug('Exec convert ...', cmd);

  // eslint-disable-next-line no-unused-vars
  exec(cmd, (err, stdout, stderr) => {
    if (err) console.error('>>>>>>>>>>', err);
    typeof callback === 'function' && callback(err, `${file}.pdf`);
  });
}

function getUseDir() {
  const dir = `${process.env.RBDP_WORKDIR || os.tmpdir()}/${dateFormat(
    'YYYYmmdd',
    new Date()
  )}`;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  return dir;
}

function dateFormat(fmt, date) {
  const opt = {
    'Y+': date.getFullYear().toString(),
    'm+': (date.getMonth() + 1).toString(),
    'd+': date.getDate().toString(),
    'H+': date.getHours().toString(),
    'M+': date.getMinutes().toString(),
    'S+': date.getSeconds().toString(),
  };

  let ret;
  for (let k in opt) {
    ret = new RegExp(`(${k})`).exec(fmt);
    if (ret) {
      fmt = fmt.replace(
        ret[1],
        ret[1].length == 1 ? opt[k] : opt[k].padStart(ret[1].length, '0')
      );
    }
  }

  return fmt;
}

module.exports = router;
