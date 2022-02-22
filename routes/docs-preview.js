const express = require('express');
const router = express.Router();
const AbortController = require('abort-controller');
const { fetch } = require('node-fetch');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

// 预览
router.get('/preview', async function (req, res) {
  const src = req.query.src;
  const attname = req.query.attname;

  await fileDownload(src, (err, file) => {
    if (err) {
      res.send(err);
    } else {
      convertPdf(file, (err2, file2) => {
        if (err2) {
          res.send(err);
        } else {
          res.sendFile(file2, {
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
      });
    }
  });
});

// 下载文件
async function fileDownload(src, callback) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    (process.env.RBDP_FILE_DOWNLOAD_TIMEOUT || 30) * 1000
  );

  let response;
  try {
    response = await fetch(src, { signal: controller.signal });
  } catch (ex) {
    typeof callback === 'function' && callback(`无法读取源文件 : ${src}`);
    return;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    typeof callback === 'function' && callback(`无法读取源文件 : ${src}`);
    return;
  }

  const dest = `${
    process.env.RBDP_WORKDIR || os.tmpdir()
  }/pdf-${new Date().getTime()}`;

  const buffer = await response.buffer();
  fs.writeFile(`${dest}.download`, buffer, {}, err => {
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

  // eslint-disable-next-line no-unused-vars
  exec(cmd, (err, stdout, stderr) => {
    callback(err, `${file}.pdf`);
  });
}

module.exports = router;
