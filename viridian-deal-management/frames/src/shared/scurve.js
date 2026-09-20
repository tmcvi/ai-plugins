// S-curve generator, the client-side twin of tools/scurve.py (brief section 5.1).
// Used by the Admin Frame's "Regenerate from curve" and the New deal preview.
function sCurve(nWeeks, steepness, maxWeeks) {
  steepness = steepness || 6;
  maxWeeks = maxWeeks || 52;
  if (nWeeks < 1) return [];
  function f(w) { return 1 / (1 + Math.exp(-steepness * (w / nWeeks - 0.5))); }
  var f0 = f(0), fn = f(nWeeks), span = fn - f0;
  function g(w) { return (f(w) - f0) / span; }
  var out = [], total = 0, i;
  for (i = 1; i <= nWeeks; i++) {
    var p = Math.round((g(i) - g(i - 1)) * 1000) / 1000;
    out.push(p);
    total += p;
  }
  // Put the rounding residue on the last week so the row sums to exactly 100%.
  out[out.length - 1] = Math.round((out[out.length - 1] + (1 - total)) * 1000) / 1000;
  for (i = nWeeks; i < maxWeeks; i++) out.push(0);
  return out;
}

// Bar sparkline for a profile. Shared: the Admin S-curve tab and the New deal
// economics preview both draw one, and the preview lives in shared code, so
// this cannot sit in a page module.
function barsSvg(vals, w, hgt) {
  var max = 0, i;
  for (i = 0; i < vals.length; i++) if (vals[i] > max) max = vals[i];
  if (max <= 0) max = 1;
  var n = 0;
  for (i = 0; i < vals.length; i++) if (vals[i] > 0) n = i + 1;
  if (n === 0) n = 1;
  var bw = w / n;
  var s = '<svg width="100%" viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none" style="display:block;">';
  for (i = 0; i < n; i++) {
    var bh = (vals[i] / max) * (hgt - 2);
    s += '<rect x="' + (i * bw + 0.5) + '" y="' + (hgt - bh) + '" width="' + Math.max(1, bw - 1) +
      '" height="' + bh + '" fill="' + T.violet + '"></rect>';
  }
  s += '</svg>';
  return s;
}
