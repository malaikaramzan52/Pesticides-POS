const normalizeAccountName = (accName) => {
  if (!accName) return 'Cash';
  const lower = accName.toLowerCase().trim();
  if (lower.includes('cash') && !lower.includes('jazz') && !lower.includes('easy')) return 'Cash';
  if (lower.includes('easypaisa')) return 'EasyPaisa';
  if (lower.includes('jazzcash') || lower.includes('jazz')) return 'JazzCash';
  if (lower.includes('sadapay') || lower.includes('nayapay')) return 'SadaPay';
  if (lower.includes('card') || lower.includes('credit') || lower.includes('debit')) return 'Card';
  if (lower.includes('cheque') || lower.includes('check')) return 'Cheque';
  
  return accName;
};

module.exports = {
  normalizeAccountName
};
