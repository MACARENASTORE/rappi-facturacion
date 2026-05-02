function parseMoney(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  let text = String(value).trim();
  if (!text) return 0;

  text = text
    .replace(/\s/g, '')
    .replace(/\$/g, '')
    .replace(/[^\d,.-]/g, '');

  const hasComma = text.includes(',');
  const hasDot = text.includes('.');

  if (hasComma && hasDot) {
    const lastComma = text.lastIndexOf(',');
    const lastDot = text.lastIndexOf('.');
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';

    text = text
      .replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '')
      .replace(decimalSeparator, '.');
  } else if (hasComma) {
    const decimals = text.length - text.lastIndexOf(',') - 1;
    text = decimals === 3 ? text.replace(/,/g, '') : text.replace(',', '.');
  } else if (hasDot) {
    const decimals = text.length - text.lastIndexOf('.') - 1;
    if (decimals === 3) {
      text = text.replace(/\./g, '');
    }
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

module.exports = { parseMoney };
