/**
 * Given a list of strings with varying length, that have
 * the same prefix and suffix, extracts the unique
 */
export function stringDiff(strings: string[]) {
  if (!strings.length) return {};

  let [start, end] = [0, 0];

  for (let index = 0; strings[0][index] !== undefined; index++) {
    const uniqChars = new Set(strings.map((item) => item[index]));
    if (uniqChars.size !== 1) {
      start = index;
      break;
    }
  }

  for (let index = 1; strings[0].at(-index) !== undefined; index++) {
    const uniqChars = new Set(strings.map((item) => item.at(-index)));
    if (uniqChars.size !== 1) {
      end = index - 1;
      break;
    }
  }

  return Object.fromEntries(
    strings.map((str) => [
      // also trim leading/trailing punctuation
      str
        .slice(start, -end)
        .replaceAll(/^[()_]+|[()_]+$/g, "")
        .toUpperCase(),
      str,
    ]),
  );
}
