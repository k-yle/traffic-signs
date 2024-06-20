import { JSDOM } from "jsdom";
import type { DB } from "../helpers/common.js";

export async function fetchFromTfNSW(database: DB) {
  let totalChunks = Infinity;

  for (let page = 0; page < totalChunks; page++) {
    console.log(`[TfNSW] Fetching page ${page} of ${totalChunks}…`);

    const url = `https://www.transport.nsw.gov.au/operations/roads-and-waterways/traffic-signs?page=${page}`;
    const { origin } = new URL(url);
    const html = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
      },
    }).then((response) => response.text());

    const dom = new JSDOM(html);
    const { document } = dom.window;

    const [start, end, total] = document
      .querySelector("main header")!
      .querySelectorAll("b");

    const perPage = +end.textContent! - +start.textContent! + 1;
    totalChunks = Math.floor(+total.textContent! / perPage);

    for (const item of document.querySelectorAll(".featured__item")) {
      const text = item.querySelector("h3")!.textContent!;
      const infoPath = item.querySelector<HTMLAnchorElement>("h3 a")!.href;
      const imgPath = item.querySelector("img")!.src;

      const [fullCode, ...title] = text.split(" ");

      const code = fullCode.split("(")[0].toUpperCase();
      const variant =
        fullCode.split("(")[1]?.replace(")", "").toUpperCase() || "";

      database.AU ||= {};
      database.AU[code] ||= { name: undefined, docs: undefined, urls: {} };
      database.AU[code].name ||= title.join(" ");
      database.AU[code].docs ||= origin + infoPath;
      database.AU[code].urls[variant] ||= origin + imgPath;
    }
  }
}
