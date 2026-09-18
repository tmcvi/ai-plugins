// Match suggestion scoring (brief section 6.5). Deliberately client-side:
// fuzzy text matching is cheap in JS and awkward in the formula language.

var STOPWORDS = /\b(ltd|limited|plc|group|inc|llc|holdings)\b/g;

function normaliseName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(STOPWORDS, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function longestToken(s) {
  var parts = normaliseName(s).split(' ');
  var best = '';
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].length > best.length) best = parts[i];
  }
  return best;
}

// deal:   {name, salesPerson, closeDate, pigmentAE, matched}
// pigRow: {name, account, partnerContact, closeDate, pigmentAE, matched}
// Returns {score, reasons[]}.
function scoreMatch(deal, pigRow) {
  if (deal.matched || pigRow.matched) return { score: 0, reasons: [] };

  var score = 0, reasons = [];
  var a = normaliseName(pigRow.account || pigRow.name);
  var b = normaliseName(deal.name);

  if (a && b && (b.indexOf(a) !== -1 || a.indexOf(b) !== -1)) {
    score += 50;
    reasons.push('account match');
  } else {
    var tok = longestToken(pigRow.account || pigRow.name);
    if (tok.length >= 5 && b.indexOf(tok) !== -1) {
      score += 35;
      reasons.push('name overlap');
    }
  }

  if (pigRow.partnerContact && deal.salesPerson &&
      pigRow.partnerContact === deal.salesPerson) {
    score += 20;
    reasons.push('same contact');
  }

  var gap = daysBetween(deal.closeDate, pigRow.closeDate);
  if (gap !== null) {
    var abs = Math.abs(gap);
    if (abs <= 45) { score += 15; reasons.push('close within 45 days'); }
    else if (abs <= 120) { score += 5; reasons.push('close within 120 days'); }
  }

  if (pigRow.pigmentAE && deal.pigmentAE && pigRow.pigmentAE === deal.pigmentAE) {
    score += 10;
    reasons.push('same Pigment AE');
  }

  return { score: score, reasons: reasons };
}

function matchBand(score) {
  if (score >= 60) return 'Likely';
  if (score >= 35) return 'Possible';
  return null;
}
