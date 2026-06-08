import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';

export function remarkReadingTime() {
  return function (tree, { data }) {
    const textOnPage = toString(tree);
    const readingTime = getReadingTime(textOnPage);
    // frontmatter property must be populated via 'astro.frontmatter' inside remark plugin
    data.astro.frontmatter.minutesRead = readingTime.text;
  };
}
