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

  const srcClear = src.split('?')[0]; // No query
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

  const dest = `${
    process.env.RBDP_WORKDIR || os.tmpdir()
  }/pdf-${new Date().getTime()}`;

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
  } --headless --convert-to pdf ${file}.download --outdir ${
    process.env.RBDP_WORKDIR || os.tmpdir()
  }`;
  console.debug('Exec convert ...', cmd);

  // eslint-disable-next-line no-unused-vars
  exec(cmd, (err, stdout, stderr) => {
    if (err) console.error('>>>>>>>>>>', err);
    typeof callback === 'function' && callback(err, `${file}.pdf`);
  });
}

module.exports = router;
