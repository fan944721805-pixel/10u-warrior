(() => {
  const panel = document.querySelector('.paper-panel');
  if (!panel) return;
  const media = matchMedia('(max-width: 760px)');
  const details = document.createElement('details');
  details.className = 'mobile-market-details';
  const summary = document.createElement('summary');
  summary.textContent = '行情与规则';
  const content = document.createElement('div');
  content.className = 'mobile-market-content';
  details.append(summary, content);

  // Move the existing live nodes, retaining their IDs and event handlers.
  // Placeholders restore their exact desktop positions when the viewport grows.
  const nodes = [
    panel.querySelector('#sim-source'),
    document.querySelector('#sim-market'),
    document.querySelector('#sim-next'),
    document.querySelector('.sim-battles > small'),
  ].filter(Boolean).map(node => {
    const anchor = document.createComment('mobile-layout');
    node.before(anchor);
    return { node, anchor };
  });
  const count = document.querySelector('#ai-arena .section-heading > span');
  const countAnchor = document.createComment('agent-count');
  count?.before(countAnchor);
  function apply() {
    if (media.matches) {
      panel.append(details);
      nodes.forEach(({ node }) => content.append(node));
      if (count) document.querySelector('#ai-arena .arena-toolbar')?.append(count);
    } else {
      nodes.forEach(({ node, anchor }) => anchor.after(node));
      details.remove();
      if (count) countAnchor.after(count);
    }
  }
  media.addEventListener('change', apply);
  apply();
})();
