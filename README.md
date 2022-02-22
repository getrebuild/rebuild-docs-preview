# REBUILD DOCS PREVIEW

基于 [Libre Office](https://www.libreoffice.org/) 的文档预览服务，原理是通过将 Office 文件转换成 PDF，然后通过浏览器自带的 PDF 阅读功能进行预览。

# 使用

## 环境

- Node v14.x
- Libre Office 6.x 或更高

## 启动/运行

```
npm install && npm start

# or dev
npm test
```

启动后访问 [http://localhost:3000/](http://localhost:3000/)

## 配置

可根据自身需要对 [.env](.env) 配置文件进行修改。

| 配置项                       | 说明                                   |
| ---------------------------- | -------------------------------------- |
| `RBDP_LIBREOFFICE_BIN`       | Libre Office 命令，默认 `libreoffice`  |
| `RBDP_WORKDIR`               | 文件下载与转换目录，默认为系统临时目录 |
| `RBDP_FILE_DOWNLOAD_TIMEOUT` | 文件下载超时时间，默认 30 秒           |
