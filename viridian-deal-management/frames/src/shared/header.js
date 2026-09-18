// Shared 56px header, identical on every Frame (brief section 7.3).
// VIRIDIAN_LOGO is injected by build.py: a base64 data URI when a valid
// assets/Viridian_-_Logo_-_White.png is present, otherwise null, in which case
// we fall back to an inline SVG wordmark so the header never depends on a URL.

var NAV = ['Pipeline', 'Deals', 'New deal', 'Matching', 'Forecast', 'Admin'];

function logoMarkup() {
  if (typeof VIRIDIAN_LOGO === 'string' && VIRIDIAN_LOGO) {
    return '<img src="' + VIRIDIAN_LOGO + '" alt="Viridian" ' +
           'style="height:28px;width:auto;display:block;">';
  }
  // Fallback wordmark: white, 28px tall, no network dependency.
  return '<svg height="28" viewBox="0 0 300 42" role="img" aria-label="Viridian" ' +
    'style="display:block;"><text x="0" y="30" font-family="' + FONT.display +
    '" font-size="30" font-weight="700" letter-spacing="1.5" fill="#FFFFFF">VIRIDIAN</text></svg>';
}

// screen: which nav label is active. loadDate: ISO string or null.
function headerHtml(screen, loadDate) {
  var h = '<div style="height:56px;background:' + T.violet + ';display:flex;align-items:center;' +
          'padding:0 24px;flex:0 0 56px;">';

  h += '<div style="display:flex;align-items:center;padding-right:12px;">' + logoMarkup() + '</div>';
  h += '<div style="width:1px;height:24px;background:' + T.divider + ';opacity:.4;"></div>';
  h += '<div style="font:15px ' + FONT.body + ';color:' + T.cream + ';padding-left:16px;">Deal Management</div>';

  h += '<div style="display:flex;align-items:center;gap:18px;margin-left:32px;">';
  for (var i = 0; i < NAV.length; i++) {
    var active = NAV[i] === screen;
    h += '<div style="font:' + (active ? '600 ' : '') + '14px ' + FONT.body +
      ';color:' + (active ? T.gold : T.cream) + ';padding:18px 0 16px;' +
      (active ? 'border-bottom:2px solid ' + T.gold + ';' : 'border-bottom:2px solid transparent;opacity:.72;') +
      '">' + esc(NAV[i]) + '</div>';
  }
  h += '</div>';

  h += '<div style="margin-left:auto;text-align:right;">';
  h += '<div style="font:11px ' + FONT.mono + ';color:' + T.copper + ';letter-spacing:.08em;">' +
       'VIRIDIAN &middot; DEAL MGMT &middot; ' + esc(screen.toUpperCase()) + '</div>';
  h += '<div style="font:11px ' + FONT.body + ';color:' + T.cream + ';opacity:.62;margin-top:2px;">' +
       (loadDate ? 'Pigment pipeline loaded ' + esc(fmtDate(loadDate)) : 'Pigment pipeline not yet loaded') +
       '</div>';
  h += '</div></div>';
  return h;
}

// Standard page shell: fixed header, then a scrolling content area with the
// 12px cream gap and 24px side padding the brief specifies.
function shellHtml(screen, loadDate, contentHtml) {
  return '<div style="position:absolute;inset:0;display:flex;flex-direction:column;' +
         'background:' + T.cream + ';font-family:' + FONT.body + ';">' +
         headerHtml(screen, loadDate) +
         '<div id="content" style="flex:1 1 auto;overflow:auto;padding:12px 24px 24px;">' +
         contentHtml + '</div></div>';
}

function pageTitle(text, sub) {
  return '<div style="margin:4px 0 16px;">' +
    '<div style="font:700 26px ' + FONT.display + ';color:' + T.ink + ';">' + esc(text) + '</div>' +
    (sub ? '<div style="font:13px ' + FONT.body + ';color:' + T.secondary + ';margin-top:2px;">' +
      esc(sub) + '</div>' : '') + '</div>';
}
