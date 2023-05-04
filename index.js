const fs = require("fs");
const path = require("path");
const fm = require("front-matter");
// const nmd = require("nano-markdown");
const { marked } = require("marked");
const pages = [];
const nunjucks = require("nunjucks");

// Define a recursive function to read markdown files in subfolders
function readMarkdownFiles(folderPath, parentFolderPath = "") {
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

      const page = {
        ...parsedContents.attributes,
        content: marked
          .parse(parsedContents.body)
          .replace(/(\n)/g, "")
          .replace(/(&#39;)/g, "'"),
        location: path
          .join(parentFolderPath, file)
          .replace(/(\\)/g, "/")
          .replace(".md", ""),
      };
      pages.push(page);
    }
  }
}

// Read markdown files in the 'pages' folder
readMarkdownFiles("./pages");

// console.log(pages);
const html = nunjucks.render(`templates/${pages[0].template}.njk`, pages[0]);
console.log(pages[0].content);
console.log(html);