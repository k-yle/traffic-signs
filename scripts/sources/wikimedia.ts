import type { DB } from "../helpers/common.js";
import { stringDiff } from "../helpers/stringDiff.js";

export interface Countries {
  [countryCode: string]: {
    wikiPage: string;
    regex: RegExp;
  };
}

export const COUNTRIES: Countries = {
  AU: {
    wikiPage: "Road signs in Australia",
    regex: /^(?<image>File:.+)\|\((?<code>[^)]+)\)/gm,
  },
  DE: {
    wikiPage: "Road signs in Germany",
    regex: /^(?<image>File:.+)\|'''Sign (?<code>[^']+)'''/gm,
  },
  NL: {
    wikiPage: "Road signs in the Netherlands",
    regex: /^(?<image>File:.+)\|(?<code>[^\n :]+):/gm,
  },
  NZ: {
    wikiPage: "Road signs in New Zealand",
    regex: /^(?<image>File:.+)\|\((\[https[^ ]+ )?(?<code>[^)\]]+)]?\)/gm,
  },
  US: {
    wikiPage: "Road signs in the United States",
    regex: /^(?<image>File:MUTCD (?<code>.+).svg)\|/gm,
  },
};

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

function parseWikiPage(wikiMarkup: string, regex: RegExp) {
  const matches = [...wikiMarkup.matchAll(regex)];
  const output: { [code: string]: string[] } = {};
  for (const match of matches) {
    const { code, image } = match.groups!;
    for (const _subCode of code.split("/")) {
      const subCode = _subCode.toUpperCase();
      output[subCode] ||= [];
      output[subCode].push(getCommonsThumbnailLink(image));
    }
  }
  return output;
}

export async function fetchFromWikimedia(output: DB) {
  const wikipediaPageNames = Object.values(COUNTRIES).map(
    (country) => country.wikiPage,
  );

  const wikipediaPages = await getWikipediaPages(wikipediaPageNames);

  for (const countryCode in COUNTRIES) {
    const { wikiPage, regex } = COUNTRIES[countryCode];
    const wikiPageContent = wikipediaPages[wikiPage];

    output[countryCode] ||= {};
    for (const [code, urls] of Object.entries(
      parseWikiPage(wikiPageContent, regex),
    )) {
      output[countryCode][code] ||= {
        name: undefined,
        docs: undefined,
        urls: stringDiff(urls),
      };
    }
  }
}
