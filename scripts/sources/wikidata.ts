import { iso1A2Code } from "@rapideditor/country-coder";
import type { DB, Placeholder } from "../helpers/common.js";

const query = "SELECT ?sign WHERE { ?sign wdt:P31 wd:Q109772990; }";

const headers = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
};

interface AllSignIds {
  results: {
    bindings: {
      sign: {
        type: "uri";
        value: `http://www.wikidata.org/entity/Q${number}`;
      };
    }[];
  };
}

type QId = `Q${number}`;
type PId = `P${number}`;
type Rank = "preferred" | "normal" | "deprecated";

interface DataTypes {
  "wikibase-entityid": {
    "entity-type": "item";
    "numeric-id": number;
    id: QId;
  };
  string: string;
  monolingualtext: {
    text: string;
    language: string;
  };
  quantity: {
    amount: string;
    unit: `http://www.wikidata.org/entity/${QId}`;
  };
}

type GetKV<T extends keyof DataTypes> = T extends unknown
  ? { type: T; value: DataTypes[T] }
  : never;

interface Snacc {
  snaktype: string;
  property: PId;
  hash: string;
  datavalue: GetKV<keyof DataTypes>;
  datatype:
    | "commonsMedia"
    | "url"
    | "wikibase-item"
    | "string"
    | "quantity"
    | "monolingualtext";
}

interface AllSigns {
  entities: {
    [qId: QId]: {
      pageid: number;
      ns: 0;
      title: QId;
      lastrevid: number;
      modified: string;
      type: "item";
      id: QId;
      labels: {
        [langCode: string]: {
          language: string;
          value: string;
        };
      };
      descriptions: {
        [langCode: string]: {
          language: string;
          value: string;
        };
      };
      aliases: {
        [langCode: string]: {
          language: string;
          value: string;
        }[];
      };
      claims: {
        [property: PId]: {
          type: "statement";
          id: string;
          rank: Rank;
          mainsnak: Snacc;
          qualifiers?: {
            [property: PId]: Snacc[];
          };
          "qualifiers-order"?: PId[];
        }[];
      };
      sitelinks: unknown;
    };
  };
}

enum P {
  InstanceOf = "P31",
  Country = "P17",
  Image = "P18",
  CommonsCategory = "P373",
  CatalogCode = "P528",
  Catalog = "P972",
  Website = "P856",
  Index = "P1545",
  X = "P8684",
  Y = "P8685",
  Width = "P2049",
  Height = "P2048",
  Font = "P2739",
  Example = "P5831",
  Code = "P3295",
  Url = "P2699",
  Title = "P1476",
  StateOfUse = "P5817",
  Placeholder = "P9410",
}

const getValue = <T extends keyof DataTypes>(
  type: Snacc["datatype"],
  subType: T,
  value: Snacc | undefined,
) => {
  if (!value || value.datatype !== type || value.datavalue.type !== subType) {
    return undefined;
  }
  return value.datavalue.value as DataTypes[T];
};

function* createChunks<T>(array: T[], n: number) {
  for (let index = 0; index < array.length; index += n) {
    yield array.slice(index, index + n);
  }
}

export async function fetchFromWikidata(database: DB) {
  console.log(`Fetching wikidata index…`);
  const allSigns: AllSignIds = await fetch(
    `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`,
    { headers },
  ).then((response) => response.json());

  const allSignIds = allSigns.results.bindings.map(
    (x): QId => `Q${+x.sign.value.split("Q")[1]}`,
  );

  const data: AllSigns = { entities: {} };

  for (const chunk of createChunks(allSignIds, 100)) {
    console.log(`Fetching chunk…`);
    const resp: AllSigns = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join("|")}&format=json`,
      { headers },
    ).then((response) => response.json());
    Object.assign(data.entities, resp.entities);
  }

  console.log("Processing data…");

  for (const [qId, sign] of Object.entries(data.entities)) {
    const countryName = getValue(
      "wikibase-item",
      "wikibase-entityid",
      sign.claims[P.Country]?.[0]?.mainsnak,
    )?.id;

    const urls: Record<string, string> = {};
    for (const img of sign.claims[P.Image] || []) {
      const prefix = img.rank === "deprecated" ? "_" : "";

      const imgName = getValue("commonsMedia", "string", img.mainsnak);

      let code = getValue("string", "string", img.qualifiers?.[P.Code]?.[0]);

      code ||= "";
      if (code === "null") code = "";
      code = prefix + code;

      urls[code] =
        `https://en.wikipedia.org/wiki/Special:FilePath/File:${imgName?.replaceAll(" ", "_")}`;
    }

    const website = getValue(
      "url",
      "string",
      sign.claims[P.Website]?.[0]?.mainsnak,
    );

    const code = getValue(
      "string",
      "string",
      sign.claims[P.CatalogCode]?.find((s) => s.rank !== "deprecated")
        ?.mainsnak,
    );

    let placeholders: Placeholder[] | undefined;
    for (const s of sign.claims[P.Placeholder] || []) {
      const domId = getValue("string", "string", s.mainsnak);
      const index = +(
        getValue("string", "string", s.qualifiers?.[P.Index]?.[0]) ?? NaN
      );
      const x = +(
        getValue("quantity", "quantity", s.qualifiers?.[P.X]?.[0])?.amount ??
        NaN
      );
      const y = +(
        getValue("quantity", "quantity", s.qualifiers?.[P.Y]?.[0])?.amount ??
        NaN
      );
      const width = +(
        getValue("quantity", "quantity", s.qualifiers?.[P.Width]?.[0])
          ?.amount ?? NaN
      );
      const height = +(
        getValue("quantity", "quantity", s.qualifiers?.[P.Height]?.[0])
          ?.amount ?? NaN
      );
      const type = getValue(
        "wikibase-item",
        "wikibase-entityid",
        s.qualifiers?.[P.InstanceOf]?.[0],
      )?.id;
      const font = getValue(
        "wikibase-item",
        "wikibase-entityid",
        s.qualifiers?.[P.Font]?.[0],
      )?.id;

      const example = getValue(
        "monolingualtext",
        "monolingualtext",
        s.qualifiers?.[P.Font]?.[0],
      )?.text;

      if (!domId) {
        console.log(`[${qId}] [${s.id}] Invalid domId`);
        continue;
      }

      placeholders ||= [];
      placeholders[index] = { domId, x, y, width, height, font, example, type };
    }

    if (!code) {
      console.log(`[${qId}] Invalid sign ID`);
      continue;
    }
    if (!countryName) {
      console.log(`[${qId}] Invalid country`);
      continue;
    }

    const country = iso1A2Code(countryName);

    if (!country) {
      console.log(`[${qId}] Invalid country code ${countryName}`);
      continue;
    }

    database[country] ||= {};
    // completely override this entry, since wikidata is the best
    // data source.
    database[country][code] = {
      name: Object.values(sign.labels)[0].value,
      docs: website,
      urls,
      placeholders,
    };
  }

  return database;
}
