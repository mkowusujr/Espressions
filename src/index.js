const fs = require("fs");
const path = require("path");
const fm = require("front-matter");
const marked = require("marked");
const nunjucks = require("nunjucks");
const { Fountain } = require("fountain-js");

let pages = [];
// read markdown files in subfolders
function readMarkdownFiles(folderPath, parentFolderPath = "") {
  let currPath = folderPath;

  createFolderIfNotExists(
    `..\\dist${currPath.replace("..\\pages", "").replace("../pages", "")}`
  );

  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      readMarkdownFiles(filePath, path.join(parentFolderPath, file));
    } else if (path.extname(file) === ".md") {
      // Read the YAML front matter and markdown content
      const fileContent = fs.readFileSync(filePath, "utf-8");
      let parsedContents = fm(fileContent);

      pages.push(parsedMd(parsedContents, parentFolderPath, file));
    } else if (path.extname(file) === ".fountain") {
      // Read the YAML front matter and markdown content
      const fileContent = fs.readFileSync(filePath, "utf-8");
      let parsedContents = fm(fileContent);

      pages.push(parseFountain(parsedContents, parentFolderPath, file));
    }
  }
}

function parsedMd(parsedContents, parentFolderPath, file) {
  marked.setOptions({
    silent: true,
  });

  return {
    ...parsedContents.attributes,
    content: marked.parse(parsedContents.body).replace(/(\n)/g, ""),
    location: path
      .join(parentFolderPath, file)
      .replace(/(\\)/g, "/")
      .replace(".md", "")
  };
}

function parseFountain(parsedContents, parentFolderPath, file) {
  let fountain = new Fountain();

  return {
    ...parsedContents.attributes,
    content: fountain.parse(parsedContents.body).html.script,
    location: path
      .join(parentFolderPath, file)
      .replace(/(\\)/g, "/")
      .replace(".md", "")
      .replace(".fountain", ""),
  };
}

// Function to create a folder if it doesn't exist
function createFolderIfNotExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
}

function buildHtmlFiles() {
  siteConfig = { title: "hhh" };
  pages
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((page) => {
      // build template
      nunjucks.configure("../templates");
      let data = { ...page, site: { ...siteConfig, pages: pages } };
      const html = nunjucks.render(`${page.template}.njk`, data);

      // write to html file
      fs.writeFileSync(`../dist/${page.location}.html`, html, (err) => {
        if (err) throw err;
        console.log("The file has been saved!");
      });
    });
}

// Read markdown files in the 'pages' folder

function generateSite() {
  readMarkdownFiles("../pages");
  buildHtmlFiles();
}

generateSite();
