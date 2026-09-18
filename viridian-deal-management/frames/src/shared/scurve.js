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
