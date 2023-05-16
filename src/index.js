const fs = require("fs");
const path = require("path");
const fm = require("front-matter");
const marked = require("marked");
const nunjucks = require("nunjucks");
const { Fountain } = require("fountain-js");
const feed = require("feed");
const siteConfig = require("../site_config.json");

let pages = [];
let tags = new Set();

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
      if (parsedContents.attributes.tags)
        parsedContents.attributes.tags.forEach((t) => tags.add(t));

      pages.push(parsedMd(parsedContents, parentFolderPath, file));
    } else if (path.extname(file) === ".fountain") {
      // Read the YAML front matter and markdown content
      const fileContent = fs.readFileSync(filePath, "utf-8");
      let parsedContents = fm(fileContent);
      if (parsedContents.attributes.tags)
        parsedContents.attributes.tags.forEach((t) => tags.add(t));

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
      .replace(".md", ""),
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

// create a folder if it doesn't exist
function createFolderIfNotExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
}

function buildHtmlFiles() {
  pages
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((page) => {
      // build template
      nunjucks.configure("../templates");
      let data = {
        ...page,
        site: {
          ...siteConfig,
          pages: pages,
          tags: tags,
        },
      };

      if (page.title == "Blog")
        data = { ...data, pagesByYear: groupPagesByYear() };

      const html = nunjucks.render(`${page.template}.njk`, data);

      // write to html file
      fs.writeFileSync(`../dist/${page.location}.html`, html, (err) => {
        if (err) throw err;
        console.log("The file has been saved!");
      });
    });

  Array.from(tags)
    .sort()
    .forEach((tag) => {
      // build template
      nunjucks.configure("../templates");
      let data = {
        tag: tag,
        title: tag,
        display_date: false,
        site: { ...siteConfig, pages: pages, tags: tags },
      };
      const html = nunjucks.render("tagpage.njk", data);

      // write to html file
      createFolderIfNotExists("../dist/tags");
      fs.writeFileSync(`../dist/tags/${tag}.html`, html, (err) => {
        if (err) throw err;
        console.log("The file has been saved!");
      });
    });
}

function generateRssFeed() {
  const feedOptions = {
    title: siteConfig.title,
    description: siteConfig.description,
    id: siteConfig.url,
    link: siteConfig.url,
    language: "en",
    image: `/${siteConfig.baseUrl}/assets/images/favicon.ico`,
    favicon: `/${siteConfig.baseUrl}/assets/images/favicon.ico`,
    generator: "",
    feedLinks: {
      rss: `${siteConfig.url}rss.xml`,
    },
  };

  const rss = new feed.Feed(feedOptions);

  pages.forEach((p) => {
    rss.addItem({
      title: p.title,
      id: `${siteConfig.url}${p.location}`,
      link: `${siteConfig.url}${p.location}`,
      description: p.description ?? "",
      content: p.content,
      author: [
        {
          name: siteConfig.author,
          email: siteConfig.email,
          link: siteConfig.aboutLink,
        },
      ],
      date: new Date(p.date),
    });
  });

  fs.writeFileSync(
    path.join(__dirname, "../dist/rss.xml"),
    rss.rss2(),
    "utf-8"
  );
}

function groupPagesByYear() {
  let groupByYear = pages.reduce((group, page) => {
    const { year } = page;
    group[year] = group[year] ?? [];
    group[year].push(page);
    return group;
  }, {});
  delete groupByYear["2001"];
  groupByYear = Object.keys(groupByYear)
    .map((key) => [key, groupByYear[key]])
    .reverse();
  return groupByYear;
}

function generateSite() {
  readMarkdownFiles("../pages");
  pages = pages.filter((p) => p.draft != true);
  groupPagesByYear();
  buildHtmlFiles();
  generateRssFeed();
}

generateSite();
