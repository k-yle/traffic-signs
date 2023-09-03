import { promises as fs } from "node:fs";
import { join } from "node:path";
import { COUNTRIES } from "./countries";

export interface Countries {
  [countryCode: string]: {
    wikiPage: string;
    regex: RegExp;
  };
}

export interface DB {
  [countryCode: string]: {
    [signCode: string]: string[];
  };
}

interface WikimediaApiResponse {
  query: {
    pages: {
      title: string;
      revisions: [{ slots: { main: { content: string } } }];
    }[];
  };
}

const getCommonsThumbnailLink = (commonsFileName: string) => {
  const fileBaseName = commonsFileName
    .replace(/^File:/, "")
    .replaceAll(" ", "_");
  // adding ?width=500 gives us the thumbnail URL without using the md5 hash
  return `https://en.wikipedia.org/wiki/Special:FilePath/File:${fileBaseName}`;
};

async function getWikipediaPages(pageNames: string[]) {
  const qp = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "revisions",
    titles: pageNames.map((page) => page.replaceAll(" ", "_")).join("|"),
    formatversion: "2",
    rvprop: "content",
    rvslots: "*",
  }).toString();

  const json: WikimediaApiResponse = await fetch(
    `https://en.wikipedia.org/w/api.php?${qp}`,
  ).then((r) => r.json());

  const wikiMarkup = Object.fromEntries(
    json.query.pages.map((page) => [
      page.title,
      page.revisions[0].slots.main.content,
    ]),
  );
  return wikiMarkup;
}

function parseWikiPage(wikiMarkup: string, regex: RegExp): DB[string] {
  const matches = [...wikiMarkup.matchAll(regex)];
  const output: DB[string] = {};
  for (const match of matches) {
    const { code, image } = match.groups!;
    for (const subCode of code.split("/")) {
      output[subCode] ||= [];
      output[subCode].push(getCommonsThumbnailLink(image));
    }
  }
  return output;
}

async function main() {
  const wikipediaPageNames = Object.values(COUNTRIES).map(
    (country) => country.wikiPage,
  );

  const wikipediaPages = await getWikipediaPages(wikipediaPageNames);

  const output: DB = {};

  for (const countryCode in COUNTRIES) {
    const { wikiPage, regex } = COUNTRIES[countryCode];
    const wikiPageContent = wikipediaPages[wikiPage];

    output[countryCode] = parseWikiPage(wikiPageContent, regex);
  }

  await fs.writeFile(
    join(__dirname, "../data/index.json"),
    JSON.stringify(output, null, 2),
  );
}

main();
