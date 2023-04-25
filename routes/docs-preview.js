const express = require('express');
const router = express.Router();
const AbortController = require('abort-controller');
const fetch = require('node-fetch');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

const USE_CACHED = {};

// 预览
router.get('/preview', async (req, res) => {
  const src = req.query.src;
  const attname = req.query.attname;

  const srcClear = src.split('?')[0]; // No queries

  if (!isWhitelist(srcClear)) {
    res.send(`源文件不在白名单 (1003) : ${src}`);
    return;
  }

  // 发送预览
  function preview(file) {
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

  const c = USE_CACHED[srcClear];
  if (c) {
    const exists = fs.existsSync(c);
    if (exists) {
      console.log('Use cached :', c);
      preview(c, attname);
      return;
    } else {
      delete USE_CACHED[srcClear];
    }
  }

  // OO Service
  if (process.env.RBDP_ONLYOFFICE_SERVER) {
    ooConvertPdf(
      src,
      (err, file) => {
        if (err) {
          res.send(`预览服务失败: ${JSON.stringify(err)}`);
        } else {
          USE_CACHED[srcClear] = file;
          preview(file, attname);
        }
      },
      attname
    );
    return;
  }

  // LO
  await fileDownload(src, (err, file) => {
    if (err) {
      res.send(`源文件失败: ${JSON.stringify(err)}`);
    } else {
      loConvertPdf(file, (err4c, file4c) => {
        if (err4c) {
          res.send(`转换失败: ${JSON.stringify(err4c)}`);
        } else {
          USE_CACHED[srcClear] = file4c;
          preview(file4c, attname);
        }
      });
    }
  });
});

let SRC_WHITELIST;

// 源文件是否白名单
function isWhitelist(src) {
  if (!SRC_WHITELIST) {
    SRC_WHITELIST = (process.env.RBDP_SRC_WHITELIST || '').split(',');
    console.log('Load whitelist ...', SRC_WHITELIST);
  }

  let inWhitelist = SRC_WHITELIST.length === 0;
  if (!inWhitelist) {
    for (let i = 0; i < SRC_WHITELIST.length; i++) {
      let w = SRC_WHITELIST[i];
      if (src.includes(w)) {
        inWhitelist = true;
        break;
      }
    }
  }

  return inWhitelist;
}

// 下载文件
async function fileDownload(src, callback) {
  console.log('Download file ...', src);

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
function loConvertPdf(file, callback) {
  const cmd = `${
    process.env.RBDP_LIBREOFFICE_BIN || 'libreoffice'
  } --headless --convert-to pdf ${file}.download --outdir ${getUseDir()}`;
  console.log('Exec convert ...', cmd);

  // eslint-disable-next-line no-unused-vars
  exec(cmd, (err, stdout, stderr) => {
    if (err) console.error('>>>>>>>>>>', err);
    typeof callback === 'function' && callback(err, `${file}.pdf`);
  });
}

// 转换 PDF
function ooConvertPdf(file, callback, title) {
  let csUrl = process.env.RBDP_ONLYOFFICE_SERVER;
  if (csUrl.endsWith('/')) csUrl += 'ConvertService.ashx';
  else csUrl += '/ConvertService.ashx';

  let fileType = file.split('?')[0].split('.');
  fileType = fileType[fileType.length - 1];

  const post = {
    async: false,
    filetype: fileType,
    outputtype: 'pdf',
    title: title || 'Office Preview',
    url: file,
  };
  console.log(post);

  fetch(csUrl, {
    method: 'post',
    body: JSON.stringify(post),
    headers: { 'Content-Type': 'application/json' },
  })
    .then(res => {
      callback(null, res);
    })
    .catch(err => {
      console.error('>>>>>>>>>>', err);
      callback(err);
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
