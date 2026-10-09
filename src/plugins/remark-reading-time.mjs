// Native lightweight reading-time calculator (no external dependencies)
export function remarkReadingTime() {
  return function (tree, { data }) {
    let text = '';
    function visit(node) {
      if (node.value) {
        text += ' ' + node.value;
      }
      if (node.children) {
        for (const child of node.children) {
          visit(child);
        }
      }
    }
    visit(tree);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    data.astro.frontmatter.minutesRead = `${minutes} min read`;
  };
}
