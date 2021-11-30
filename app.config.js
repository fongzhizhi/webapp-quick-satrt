// const babel = require('@babel/core');
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const less = require("less");
const del = require("del");
const express = require("express");

/**
 * 全局配置
 */
const appConfig = {
  BASE_URL: "./",
  dest: "dist",
  page_title: "",
  css_path: "",
  js_path: "",
  assets_path: "",
};

/**
 * 一些初始化工作
 */
function appInit() {
  createDir(path.resolve(__dirname, appConfig.dest));
}

/**
 * 创建目录
 * @param {string} dir
 */
function createDir(dir) {
  try {
    fs.statSync(dir);
  } catch (error) {
    fs.mkdirSync(dir);
  }
}

/**
 * 读取指定目录下的文件路径
 * @param {string} dir 路径
 * @param {string?} accept 接受的文件类型
 * @param {boolean?} deep 深度遍历
 * @returns {{relativePath: string;path: string;fileName: string;}[]}
 */
function readDir(dir, accept, deep) {
  const files = [];
  const res = fs.readdirSync(dir);
  res &&
    res.forEach((p) => {
      const filePath = path.resolve(dir, p);
      const state = fs.statSync(filePath);
      if (state.isDirectory()) {
        deep && files.push(...readDir(filePath, accept, deep));
      } else if (!accept || filePath.endsWith(accept)) {
        files.push({
          path: filePath,
          relativePath: path.join(dir, p),
          fileName: p,
        });
      }
    });
  return files;
}

/**
 * 获取目标路径
 * @param {string} extendPath
 */
function getDestPath(extendPath) {
  return path.resolve(appConfig.dest, extendPath);
}

/**
 * 打印任务日志
 * @param {string} title
 * @param {string[]} msgs
 */
function taskLog(title, ...msgs) {
  console.log(`[${title}]`, ...msgs);
}

/**
 * html渲染
 */
function htmlTempRender() {
  ejs.renderFile(
    path.resolve(__dirname, "public/index.html"),
    appConfig,
    (err, str) => {
      if (err) throw err;
      const htmlPath = getDestPath("index.html");
      fs.writeFileSync(htmlPath, str);
      taskLog("htmlTempRender", "html template was rendered in", htmlPath);
    }
  );
}

/**
 * css编译
 */
function cssCompiler() {
  let index = 0;
  readDir("src/styles", ".less", false).forEach((item) => {
    index++;
    const content = fs.readFileSync(item.path).toString();
    let cssStr = "";
    less.render(content, (err, res) => {
      if (err) throw err;
      cssStr += `\n/* [fileSource] ${item.relativePath} */ \n`;
      cssStr += res.css;
      if (--index === 0) {
        const cssName = "main.css";
        const cssPath = getDestPath(cssName);
        appConfig.css_path = cssName;
        fs.writeFileSync(cssPath, cssStr);
        taskLog("cssCompiler", "css was compiled in", cssPath);
      }
    });
  });
}

/**
 * js编译
 */
function jsComplier() {
  appConfig.js_path = "app.js";
  taskLog(
    "jsComplier",
    "js was compiled in",
    path.resolve(appConfig.dest, appConfig.js_path)
  );
}

/**
 * 清除缓存目录
 */
function clearDist() {
  del.sync(appConfig.dest);
  taskLog("clearDist", appConfig.dest, "dir was clean.");
}

/**
 * 资源文件clone
 */
function assetsClone() {
  const dirName = "assets";
  const copyDest = path.resolve(appConfig.dest, dirName);
  createDir(copyDest);
  readDir(path.resolve("src", dirName), "", false).forEach((item) => {
    fs.copyFileSync(item.path, path.resolve(copyDest, item.fileName));
  });
  readDir("public", ".ico", false).forEach((item) => {
    fs.copyFileSync(item.path, path.resolve(appConfig.dest, item.fileName));
  });
  appConfig.assets_path = appConfig.BASE_URL + dirName + "/";
  taskLog("assetsClone", "assets was cloned in", copyDest);
}

/**
 * 服务器
 */
function server() {
  const app = express();
  const port = 3000;
  app.use(express.static(appConfig.dest));
  app.get("/", (req, res) => {
    res.sendFile(path.resolve(appConfig.dest, "index.html"));
  });
  app.listen(port, () => {
    taskLog("server", `App listening at http://localhost:${port}`);
  });
}

// ===> app run
clearDist();
appInit();
assetsClone();
cssCompiler();
jsComplier();
htmlTempRender();
server();
