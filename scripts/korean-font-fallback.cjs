module.exports = () => ({
  postcssPlugin: 'note-gui-korean-font-fallback',
  AtRule: {
    'font-face'(rule) {
      const family = rule.nodes.find(node => node.prop === 'font-family');
      if (!family?.value.includes('Noto Sans KR Variable')) return;
      const unicode = rule.nodes.find(node => node.prop === 'unicode-range');
      const ranges = unicode.value.split(',').filter(range => {
        const start = parseInt(range.trim().slice(2), 16);
        return start >= 0x2e80 || start >= 0x1100 && start <= 0x11ff;
      });
      if (ranges.length) unicode.value = ranges.join(',');
      else rule.remove();
    },
  },
});
module.exports.postcss = true;
