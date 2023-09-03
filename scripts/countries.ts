import type { Countries } from "./download";

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
    regex: /^(?<image>File:.+)\|\((?<code>[^)]+)\)/gm,
  },
  US: {
    wikiPage: "Road signs in the United States",
    regex: /^(?<image>File:MUTCD (?<code>.+).svg)\|/gm,
  },
};
