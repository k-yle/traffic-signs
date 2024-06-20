import { JSDOM } from "jsdom";
import type { DB } from "../helpers/common.js";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
};

async function getCategories() {
  const html = await fetch(
    "https://www.nzta.govt.nz/resources/traffic-control-devices-manual/sign-specifications?term=a",
    { headers },
  ).then((response) => response.text());

  const { document } = new JSDOM(html).window;

  const categories = [
    ...document.querySelectorAll<HTMLOptionElement>(
      "#signage__filter--category option",
    ),
  ]
    .map((element) => ({
      id: element.value,
      label: element.textContent!,
      total: +(element.textContent!.split("(")[1]?.split(")")[0] || 0),
    }))
    .filter((x) => x.total);

  const perPage = +html.match(/Displaying 1 - (?<perPage>\d+) results of/)!
    .groups!.perPage;

  return { categories, perPage };
}

export async function fetchFromWakaKotahi(database: DB) {
  const { categories, perPage } = await getCategories();

  for (const category of categories) {
    for (let index = 0; index < category.total; index += perPage) {
      console.log(
        `[Waka Kotahi] Fetching page ${index}-${index + perPage - 1} of ${category.label}…`,
      );

      const url = `https://www.nzta.govt.nz/resources/traffic-control-devices-manual/sign-specifications?category=${category.id}&start=${index}`;
      const html = await fetch(url, { headers }).then((response) =>
        response.text(),
      );

      const { document } = new JSDOM(html).window;

      for (const row of document.querySelectorAll(".trafficsigns tbody tr")) {
        const code = row.querySelector(".rule-col")!.textContent!;
        const variant = row.querySelectorAll("td")[2].textContent!;
        const imagePath = row.querySelector("img")?.src;
        const infoPath =
          row.querySelector<HTMLAnchorElement>("td:nth-child(5) a")!.href;

        const title = row
          .querySelector("td:nth-child(5) a")!
          .textContent!.trim();

        if (code === "none" || !imagePath) continue;

        database.NZ ||= {};
        database.NZ[code] ||= { name: undefined, docs: undefined, urls: {} };
        database.NZ[code].name ||= title;
        database.NZ[code].docs ||= infoPath;
        database.NZ[code].urls[variant] ||= imagePath;
      }
    }
  }
}
