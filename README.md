# REBUILD DOCS PREVIEW

基于 [Libre Office](https://www.libreoffice.org/) 的简易文档预览服务。原理是通过将 Office 文件转换成 PDF，然后通过浏览器自带的 PDF 阅读功能进行预览。

# 使用

## 环境准备

- [Node](https://nodejs.org/) `v12.x` `v14.x` `v16.x`
- [Libre Office](https://zh-cn.libreoffice.org/)

## 启动/运行

```
git clone git@github.com:getrebuild/rebuild-docs-preview.git

npm install && npm start

# dev
npm test

# daemon
nohup npm start &
```

启动后访问 [http://localhost:3000/](http://localhost:3000/)

## 配置

可根据自身需要对 [.env](.env) 配置文件进行修改。

| 配置项                       | 说明                                   |
| ---------------------------- | -------------------------------------- |
| `RBDP_LIBREOFFICE_BIN`       | Libre Office 命令，默认 `libreoffice`  |
| `RBDP_WORKDIR`               | 文件下载与转换目录，默认为系统临时目录 |
| `RBDP_FILE_DOWNLOAD_TIMEOUT` | 文件下载超时时间，默认 30 秒           |
| `RBDP_SRC_WHITELIST`         | 源文件地址白名单，默认不限制           |

## 在 [REBUILD](https://getrebuild.com/) 中配置使用

确保预览服务可正常使用/访问，然后在 RB 管理中心 - 通用配置 中填写“文档预览服务地址”，如下（其中 `PREVIEW_SERVER` 请替换为你自己的预览服务地址）。

```
http://PREVIEW_SERVER/docs-preview/preview?src=
```
