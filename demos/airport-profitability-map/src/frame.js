/*
 * Airport Profitability Map — Pigment Frame body.
 *
 * Pure JavaScript, no network, no libraries: paste as the Frame body in Pigment.
 * Reads everything through window.PigmentSDK using these binding aliases:
 *   units (List, read+write)  features (List, read)  unitKpis (View)
 *   unitTrend (View)          gatePax (View)         revenueShare (Metric, write)
 * Page selector aliases: months (Month list), units (Unit list).
 */
(function () {
  'use strict';
  var root = document.getElementById('app');
  if (root.__cleanup) root.__cleanup();
  var SDK = window.PigmentSDK;
  if (!SDK || typeof SDK.subscribeToDataSource !== 'function') {
    root.innerHTML = '<p style=\'font:14px system-ui;padding:24px;color:#eef4f9;background:#011326\'>This Frame needs PigmentSDK.subscribeToDataSource. Open it inside Pigment.</p>';
    return;
  }

  // ------------------------------------------------------------- constants
  var ALIAS = { units: 'units', features: 'features', kpis: 'unitKpis', trend: 'unitTrend', gates: 'gatePax', rate: 'revenueShare', months: 'months' };
  var COL = { sales: 'Tenant Sales', conc: 'Concession Income', other: 'Other Income', direct: 'Direct Cost', alloc: 'Allocated Cost', profit: 'Airport Profit', budget: 'Budget Profit', tx: 'Transactions', pax: 'Passengers Exposed', bpax: 'Budget Passengers Exposed', rate: 'Revenue Share' };
  var MONTHS = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'];
  var LAST_ACTUAL = 9;
  var AS_OF = new Date('2026-10-31T00:00:00Z');
  var PERIODS = [{ key: 'ytd', label: 'YTD Oct 2026', months: MONTHS.slice(0, 10) }, { key: 'fy', label: 'FY 2026 · actual + forecast', months: MONTHS.slice() }];
  MONTHS.forEach(function (m, i) { PERIODS.push({ key: 'm' + i, label: m + (i > LAST_ACTUAL ? ' · forecast' : ''), months: [m] }); });
  var CONFIG = { airport: 'Manchester Airport', title: 'Commercial & estate map', subtitle: 'Manchester Airport · 2026 · Actual & Budget', currency: '£', disclaimer: 'Illustrative data' };
  // MAG logo, shared with the MAG Aviation Income route-network Frame so both read as one solution.
  var MAG_LOGO = "<svg style='display:block;width:100%;height:100%' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 159.4 100'><defs><linearGradient id='mgA' x1='0' y1='1' x2='.75' y2='0'><stop offset='0' stop-color='#8a939c'/><stop offset='.55' stop-color='#cdd3d8'/><stop offset='.8' stop-color='#f1f3f5'/><stop offset='1' stop-color='#dfe3e7'/></linearGradient><linearGradient id='mgB' x1='0' y1='0' x2='1' y2='.6'><stop offset='0' stop-color='#86c6e8'/><stop offset='.6' stop-color='#b4def4'/><stop offset='1' stop-color='#d9effa'/></linearGradient></defs><path fill='url(#mgA)' d='M58.0 0.3 40.5 5.1 37.5 6.7 34.7 8.2 32.1 9.8 29.6 11.3 27.2 12.9 24.9 14.5 22.8 16.0 20.7 17.6 18.8 19.1 17.0 20.7 15.3 22.2 13.8 23.8 12.3 25.3 10.9 26.9 9.6 28.5 8.5 30.0 7.4 31.6 6.4 33.1 5.4 34.7 4.6 36.2 3.9 37.8 3.2 39.3 2.6 40.9 2.1 42.5 1.6 44.0 1.2 45.6 0.9 47.1 0.7 48.7 0.5 50.2 0.4 51.8 0.3 53.3 0.3 54.9 0.3 56.5 0.4 58.0 0.6 59.6 0.8 61.1 1.0 62.7 1.3 64.2 1.7 65.8 2.1 67.3 2.6 68.9 3.1 70.5 3.6 72.0 4.3 73.6 5.0 75.1 5.7 76.7 6.6 78.2 7.5 79.8 8.5 81.4 9.6 82.9 10.8 84.5 12.1 86.0 13.6 87.6 15.2 89.1 17.0 90.7 18.9 92.2 21.0 93.8 23.4 95.4 26.0 96.9 27.1 97.3 28.8 98.0 30.4 98.5 32.1 99.0 33.7 99.3 35.4 99.6 37.1 99.7 38.7 99.7 40.4 99.6 42.0 99.4 43.7 99.1 45.3 98.6 47.0 98.1 48.6 97.4 50.3 96.7 52.0 95.8 53.6 94.8 55.3 93.7 56.9 92.4 58.6 91.1 59.4 90.4 58.2 89.2 55.8 87.9 53.6 86.6 51.5 85.3 49.5 84.0 47.6 82.7 45.8 81.3 44.1 80.0 42.5 78.7 41.0 77.4 39.5 76.1 38.1 74.7 36.8 73.4 35.6 72.1 34.4 70.8 33.3 69.5 32.2 68.2 31.2 66.8 30.2 65.5 29.3 64.2 28.4 62.9 27.6 61.6 26.7 60.3 25.9 58.9 25.1 57.6 25.7 55.8 26.4 54.1 27.2 52.3 28.0 50.5 28.9 48.7 29.9 46.9 30.9 45.2 31.9 43.4 33.0 41.6 34.1 39.8 35.2 38.0 36.4 36.2 37.6 34.5 38.9 32.7 40.1 30.9 41.4 29.1 42.7 27.3 43.9 25.6 45.2 23.8 46.5 22.0 47.8 20.2 49.1 18.4 50.3 16.7 51.6 14.9 52.8 13.1 54.0 11.3 55.1 9.5 56.3 7.7 57.4 6.0Z'/><path fill='url(#mgB)' d='M25.1 57.6 25.9 58.9 26.7 60.3 27.6 61.6 28.4 62.9 29.3 64.2 30.2 65.5 31.2 66.8 32.2 68.2 33.3 69.5 34.4 70.8 35.6 72.1 36.8 73.4 38.1 74.7 39.5 76.1 41.0 77.4 42.5 78.7 44.1 80.0 45.8 81.3 47.6 82.7 49.5 84.0 51.5 85.3 53.6 86.6 55.8 87.9 58.2 89.2 59.4 90.4 58.6 91.1 56.5 92.8 54.4 94.3 52.3 95.6 50.2 96.7 48.1 97.7 46.0 98.4 43.9 99.0 41.8 99.4 39.7 99.7 37.6 99.7 35.6 99.6 33.5 99.3 31.4 98.8 29.3 98.1 28.7 96.9 27.4 95.3 26.3 93.8 25.3 92.2 24.4 90.6 23.6 89.1 23.0 87.5 22.4 85.9 22.0 84.4 21.6 82.8 21.3 81.3 21.2 79.7 21.1 78.1 21.0 76.6 21.1 75.0 21.2 73.4 21.4 71.9 21.7 70.3 22.0 68.7 22.3 67.2 22.7 65.6 23.1 64.0 23.6 62.5 24.1 60.9 24.6 59.3Z'/><path fill='#012f60' fill-rule='evenodd' d='M116.1 33.5 115.5 33.3 108.1 33.4 107.7 33.5 107.2 33.9 106.9 35.0 106.7 35.2 106.1 37.4 105.8 37.9 105.5 39.5 105.0 40.5 105.0 41.0 104.7 42.0 104.4 42.5 104.4 42.8 103.6 45.0 103.6 45.6 103.0 47.0 103.0 47.5 102.7 48.0 102.7 48.5 102.1 49.6 101.8 50.8 101.3 52.3 101.2 52.9 100.7 54.1 100.7 54.6 99.9 56.7 99.9 57.1 99.3 58.3 99.0 60.0 98.4 61.3 98.4 61.7 97.9 62.9 97.9 63.5 97.0 65.6 96.8 66.9 96.4 67.6 96.4 67.9 96.2 68.3 96.3 69.1 96.9 69.3 101.8 69.4 102.6 69.1 103.1 68.4 103.3 67.2 103.7 66.6 103.7 65.9 103.9 65.4 103.9 64.9 104.2 64.4 105.1 61.1 105.3 60.8 105.8 60.7 116.6 60.7 117.2 61.3 117.3 62.3 117.5 62.7 117.5 63.2 118.3 65.5 118.6 67.0 118.9 67.6 118.9 68.1 119.3 69.1 119.9 69.3 120.6 69.4 127.0 69.4 127.4 69.1 127.5 68.3 126.6 66.3 126.4 64.9 125.8 63.5 125.2 61.2 125.0 61.0 124.9 60.4 124.4 59.1 124.4 58.6 124.2 58.2 123.8 56.6 123.2 55.5 122.7 53.5 122.1 51.9 121.9 50.7 121.6 50.1 121.5 49.6 121.0 48.5 121.0 48.1 120.7 47.5 120.7 47.2 120.0 45.7 119.8 44.5 119.5 43.7 119.5 43.3 119.3 42.9 119.3 42.4 118.6 41.1 118.4 40.4 118.4 39.9 118.2 39.6 118.1 39.0 117.3 36.9 117.3 36.1 117.0 35.3 116.7 35.0 116.7 34.7 116.4 34.1 116.4 33.8ZM110.9 41.8 111.2 41.8 111.8 43.1 112.1 44.6 112.9 46.9 112.9 47.3 113.1 48.0 113.2 48.7 113.5 49.0 113.8 49.8 113.8 50.2 114.4 51.5 114.4 51.9 114.6 52.6 114.6 53.1 114.9 53.6 115.0 54.6 114.7 54.8 107.7 54.9 107.3 54.8 107.1 54.6 107.0 53.7 107.2 53.4 107.3 52.8 107.5 52.4 107.6 51.9 107.9 51.4 107.9 51.0 108.2 50.4 108.4 49.1 108.7 48.6 108.7 48.2 109.0 47.6 109.1 47.0 109.3 46.7 109.4 46.0 109.6 45.7 109.9 44.4 110.2 43.8 110.2 43.4ZM55.6 33.6 55.5 33.9 55.4 35.2 55.5 36.4 55.3 39.8 55.3 66.4 55.4 68.7 55.5 69.1 56.4 69.3 60.8 69.4 61.4 69.2 61.6 68.8 61.6 43.1 61.6 41.4 61.8 41.2 62.0 41.4 62.0 41.8 62.3 42.2 62.4 42.6 62.6 42.9 62.8 44.3 63.2 45.0 63.2 45.5 63.8 46.7 64.1 47.8 64.1 48.2 64.5 49.2 64.6 49.9 64.9 50.5 64.9 50.9 65.2 51.3 65.5 52.9 66.0 54.0 66.3 55.4 66.6 55.8 66.6 56.4 66.9 57.0 67.0 57.6 67.2 58.1 67.5 59.5 68.0 60.7 68.3 62.0 68.9 63.4 68.9 63.7 69.5 65.0 69.5 65.7 69.7 66.2 69.7 66.8 70.1 67.3 70.3 68.5 70.7 69.1 71.4 69.3 74.5 69.4 75.9 69.2 76.4 68.3 76.4 67.4 76.8 66.2 76.9 65.6 77.1 65.3 77.5 64.3 77.7 63.0 78.3 61.6 78.3 61.2 78.5 60.9 78.6 60.3 79.1 59.0 79.2 58.3 79.7 57.4 80.0 55.7 80.6 54.4 80.7 53.8 81.0 53.3 81.0 52.9 81.2 52.5 81.2 51.8 81.5 51.4 81.5 50.9 81.7 50.4 81.7 49.9 82.0 49.2 82.3 48.7 82.6 48.0 83.4 44.7 83.7 44.1 84.0 42.8 84.2 42.5 84.4 41.7 84.8 41.4 85.0 41.7 85.1 43.9 84.9 50.9 85.0 66.3 84.9 67.0 84.9 68.0 85.0 68.6 85.3 69.2 85.6 69.3 86.8 69.4 90.2 69.3 91.8 69.3 92.4 69.1 92.6 68.5 92.6 34.2 92.5 33.8 92.3 33.5 91.4 33.3 81.8 33.4 81.5 33.5 81.1 33.8 81.0 35.1 80.0 37.6 79.6 39.5 79.2 40.4 79.1 41.1 78.3 43.4 78.3 43.9 77.7 45.3 77.7 45.9 77.2 47.2 77.1 47.7 76.9 48.1 76.8 48.6 76.5 49.1 76.3 50.6 75.7 52.0 75.4 53.3 75.1 53.9 75.1 54.3 74.9 55.3 74.1 56.8 73.8 56.6 73.1 55.3 72.9 54.1 72.4 52.8 72.4 52.4 72.2 52.1 71.5 49.5 71.0 48.6 70.9 47.9 69.9 45.1 69.8 44.5 69.5 43.8 69.5 43.3 68.4 40.7 68.3 40.0 67.8 38.2 67.5 37.7 67.2 36.2 67.0 35.3 66.7 35.0 66.3 33.7 66.1 33.5 65.5 33.3 56.4 33.3ZM134.7 35.7 134.0 36.4 133.0 37.1 132.0 38.6 131.5 39.0 131.0 39.8 129.7 42.3 128.8 44.8 128.8 45.5 128.6 46.0 128.6 47.1 128.3 48.0 128.3 49.2 128.1 49.9 128.1 52.9 128.3 53.6 128.3 54.8 128.6 55.7 128.6 56.8 128.8 57.3 128.8 58.0 129.1 58.6 129.1 59.0 129.4 59.8 130.2 61.3 130.5 62.2 130.8 62.6 131.3 63.7 132.2 64.5 132.9 65.5 134.3 66.9 135.2 67.3 135.7 67.8 138.7 69.2 139.4 69.3 140.1 69.6 140.6 69.6 141.2 69.8 145.6 69.8 146.5 69.5 147.0 69.5 147.7 69.2 148.2 69.2 148.5 69.0 149.0 68.9 149.7 68.3 150.2 68.3 150.7 67.9 150.9 67.8 151.4 67.4 152.1 66.9 152.6 66.4 152.8 66.0 153.2 65.7 153.4 65.7 153.7 66.2 153.8 66.8 154.2 67.4 154.4 68.4 154.9 69.2 155.5 69.5 158.1 69.6 158.8 69.4 159.0 68.8 159.1 67.6 159.0 51.1 158.8 50.6 157.9 50.3 144.8 50.3 144.1 50.7 143.9 51.2 143.9 54.8 144.1 55.6 144.5 56.1 151.0 56.2 151.2 56.4 151.3 58.5 151.0 59.0 151.0 59.6 150.4 60.7 148.8 62.5 147.7 62.8 146.7 63.4 145.0 63.7 142.6 63.4 140.9 62.6 140.4 62.5 139.3 61.3 138.3 59.8 137.7 58.1 137.4 57.7 137.2 56.8 137.1 55.6 136.9 55.0 136.9 47.8 137.2 46.8 137.2 46.0 137.4 45.5 137.4 44.7 137.7 44.3 138.0 43.1 139.1 41.4 140.4 39.9 142.3 39.1 143.6 38.8 144.8 38.8 146.1 39.1 146.5 39.4 146.8 39.4 147.1 39.6 147.8 39.9 149.1 41.1 149.3 41.6 150.2 42.8 151.0 45.0 151.4 45.3 152.2 45.3 152.8 45.1 153.6 45.1 155.1 44.8 156.6 44.8 157.1 44.5 158.0 44.5 158.3 44.2 158.4 43.4 158.2 42.2 156.7 38.9 154.6 36.4 154.1 36.2 153.5 35.3 152.9 35.0 151.6 34.2 150.5 33.9 149.3 33.3 148.8 33.3 148.4 33.0 147.5 33.0 146.8 32.8 146.0 32.8 142.8 32.8 141.4 33.0 140.4 33.0 140.1 33.3 139.4 33.3 137.9 33.9Z'/></svg>";
  var WORLD = { x: 0, y: 0, w: 3711, h: 3579 };            // map space (north up)
  var AIRPORT_VIEW = { x: 330, y: -80, w: 3440, h: 3720 };  // opening view: the whole airfield
  var LOD_FAR = 1300;                                        // wider than this: show zone totals, hide unit detail
  var BASE_COLORS = { land: '#0c2847', airfield: '#0f2f52', urban: '#12345a', forest: '#0b2644', beige: '#0e2c4e', water: '#03182f', apronbld: '#1a446e', paved: '#1e4a76', roadfill: '#3a6995' };
  // Area tabs. Keys match the 'Terminal' property on Units and Map Features; zoom boxes come from the data.
  var SCOPE_LIST = [['all', 'Airport'], ['T2', 'Terminal 2'], ['T3', 'Terminal 3'], ['Landside', 'Station & Skylink'], ['Ground', 'Car parks']];
  var SCOPES = {};
  SCOPE_LIST.forEach(function (s) { SCOPES[s[0]] = { label: s[1], box: WORLD, test: s[0] === 'all' ? function () { return true; } : function (u) { return u.terminal === s[0]; } }; });
  var PIER_ZONES = {};
  var CAT_GROUP = {
    'Duty Free': 'Duty Free', 'Café & Bakery': 'Food & Beverage', 'Bar & Restaurant': 'Food & Beverage', 'Quick Service': 'Food & Beverage',
    'Fashion & Luxury': 'Specialist Retail', 'Health & Beauty': 'Specialist Retail', 'Tech & Electronics': 'Specialist Retail', 'Jewellery & Watches': 'Specialist Retail', 'Toys & Gifts': 'Specialist Retail',
    'News & Convenience': 'Convenience', 'Lounge': 'Lounges', 'Parking': 'Parking & Mobility', 'Car Rental': 'Parking & Mobility',
    'Currency Exchange': 'Services', 'Advertising': 'Advertising'
  };
  var GROUP_COLORS = [['Duty Free', '#3987e5'], ['Food & Beverage', '#d95926'], ['Specialist Retail', '#199e70'], ['Convenience', '#c98500'], ['Lounges', '#d55181'], ['Parking & Mobility', '#008300'], ['Services', '#9085e9'], ['Advertising', '#e66767']];
  var RETAIL = { 'Duty Free': 1, 'Food & Beverage': 1, 'Specialist Retail': 1, 'Convenience': 1, 'Services': 1 };
  var RETENANT = ['Café & Bakery', 'Bar & Restaurant', 'Quick Service', 'News & Convenience', 'Health & Beauty', 'Fashion & Luxury', 'Jewellery & Watches', 'Toys & Gifts', 'Tech & Electronics', 'Duty Free', 'Currency Exchange'];
  var DEFAULT_RATE = { 'Duty Free': 0.36, 'Fashion & Luxury': 0.16, 'Health & Beauty': 0.17, 'Tech & Electronics': 0.12, 'News & Convenience': 0.20, 'Café & Bakery': 0.15, 'Bar & Restaurant': 0.15, 'Quick Service': 0.13, 'Currency Exchange': 0.30, 'Jewellery & Watches': 0.16, 'Toys & Gifts': 0.17 };

  var NEUTRAL = '#2b4866';
  var DIV_POS = [NEUTRAL, '#2d6a9e', '#4f9fd4', '#8fd0f2', '#d9effa'];
  var DIV_NEG = [NEUTRAL, '#7f3446', '#c2414f', '#f87171', '#fca5a5'];
  var SEQ = ['#173b5f', '#245d8e', '#3f87bf', '#8fd0f2', '#d9effa'];
  var STATUS = { critical: '#f87171', serious: '#fb923c', warning: '#fbbf24', ok: NEUTRAL };

  var LENSES = [
    { key: 'profit', label: 'Profit', hint: 'Airport profit after space costs' },
    { key: 'sqm', label: 'Profit / m²', hint: 'Profit per square metre of space' },
    { key: 'spp', label: 'Spend / pax', hint: 'Tenant sales per passenger walking past' },
    { key: 'var', label: 'vs Budget', hint: 'Profit variance to budget' },
    { key: 'lease', label: 'Lease expiry', hint: 'Months until the lease ends' },
    { key: 'cat', label: 'Category', hint: 'What trades in each unit' }
  ];

  // ----------------------------------------------------------------- state
  var S = {
    units: [], byCode: {}, features: [], kpi: {}, gatePax: {}, gateBudget: {}, trend: null,
    lens: 'profit', period: 'ytd', scope: 'all', zone: null, selected: null, flow: false,
    view: { x: AIRPORT_VIEW.x, y: AIRPORT_VIEW.y, w: AIRPORT_VIEW.w, h: AIRPORT_VIEW.h }, aggs: [], mode: '3d', um: null, gm: null, aa: null, prof: null, assets: [], assetBy: {}, assetIdx: {}, akpi: {}, projects: [], selAsset: null, selProject: null, showProjects: false, pf: { types: {}, statuses: {}, month: null }, pspend: null, story: null, pfPlaying: false, stale: true, edits: [], baseline: null, busy: false,
    playing: false, ready: { units: false, features: false, kpis: false }, error: null, toast: null
  };
  var subs = [];
  var trendCode = null;
  var timers = [];
  var rafId = 0;
  var tooltip = null;
  var svg = null;
  var unitEls = {};
  var built = false;

  // ------------------------------------------------------------ formatting
  function money(v, opts) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    var C = CONFIG.currency, a = Math.abs(v), s = v < 0 ? '−' + C : (opts && opts.sign && v > 0 ? '+' + C : C);
    if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
    if (a >= 1e3) return s + (a / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k';
    return s + (a === 0 ? '0' : a.toFixed(a < 10 ? 2 : 0));
  }
  function num(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    var a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k';
    return Math.round(v).toString();
  }
  function pct(v, sign) {
    if (v === null || v === undefined || isNaN(v) || !isFinite(v)) return '—';
    var s = (v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0) + '%';
    return sign && v > 0 ? '+' + s : s.replace('-', '−');
  }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>'"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]; }); }
  function prop(item, name) {
    if (!item) return undefined;
    if (item[name] !== undefined) return item[name];
    if (item.properties && item.properties[name] !== undefined) return item.properties[name];
    if (item.values && item.values[name] !== undefined) return item.values[name];
    return undefined;
  }
  function lastLabel(path) {
    if (!Array.isArray(path)) return typeof path === 'string' ? path : null;
    for (var i = path.length - 1; i >= 0; i--) if (typeof path[i] === 'string') return path[i];
    return null;
  }
  function shape(s) { var p = String(s || '').split(',').map(Number); return { x: p[0] || 0, y: p[1] || 0, w: p[2] || 0, h: p[3] || 0 }; }
  function monthsUntil(iso) {
    if (!iso) return null;
    var d = new Date(iso + 'T00:00:00Z');
    if (isNaN(d)) return null;
    return (d.getUTCFullYear() - AS_OF.getUTCFullYear()) * 12 + (d.getUTCMonth() - AS_OF.getUTCMonth());
  }
  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00Z');
    return isNaN(d) ? '—' : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }

  // ---------------------------------------------------------------- colour
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function ramp(stops, t) {
    t = Math.max(0, Math.min(1, t));
    var f = t * (stops.length - 1), i = Math.floor(f), k = f - i;
    if (i >= stops.length - 1) return stops[stops.length - 1];
    var a = hexRgb(stops[i]), b = hexRgb(stops[i + 1]);
    return 'rgb(' + a.map(function (v, j) { return Math.round(v + (b[j] - v) * k); }).join(',') + ')';
  }
  function symlog(v, k) { return (v < 0 ? -1 : 1) * Math.log10(1 + Math.abs(v) / k); }
  function lum(c) {
    var m = c.match(/\d+/g), rgb = m && m.length >= 3 ? m.slice(0, 3).map(Number) : hexRgb(c);
    return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  }

  // -------------------------------------------------------------- derived
  function unitData(code) { return S.kpi[code] || null; }
  function periodObj() { return PERIODS.filter(function (p) { return p.key === S.period; })[0]; }
  function inScope(u) {
    if (!SCOPES[S.scope].test(u)) return false;
    if (S.zone && u.zone !== S.zone) return false;
    return true;
  }
  function scopeLabel() { return S.zone || SCOPES[S.scope].label; }
  function onMag(u, d) {
    if (!d || u.model !== 'Concession' || !u.mag) return false;
    var n = periodObj().months.length;
    return d.rate !== null && d.sales * d.rate < u.mag * n / 12 * 0.999;
  }
  function lensValue(u, lens) {
    var d = unitData(u.code);
    if (lens === 'lease') return monthsUntil(u.lease);
    if (lens === 'cat') return CAT_GROUP[u.category] || 'Services';
    if (!d) return null;
    if (lens === 'profit') return d.profit;
    if (lens === 'sqm') return u.area ? d.profit / u.area : null;
    if (lens === 'spp') return d.pax ? d.sales / d.pax : null;
    if (lens === 'var') return d.budget ? (d.profit - d.budget) / Math.abs(d.budget) : null;
    return null;
  }
  function domain(lens) {
    var vals = S.units.map(function (u) { return lensValue(u, lens); }).filter(function (v) { return v !== null && isFinite(v); });
    if (!vals.length) return { min: 0, max: 1 };
    var abs = vals.map(Math.abs).sort(function (a, b) { return a - b; });
    var sorted = vals.slice().sort(function (a, b) { return a - b; });
    return { maxAbs: abs[abs.length - 1], min: sorted[0], max: sorted[sorted.length - 1] };
  }
  var LENS_K = { profit: 8000, sqm: 15 };
  function colorFor(u, lens, dom) { return valueColor(lensValue(u, lens), lens, dom); }
  function valueColor(v, lens, dom) {
    if (lens === 'cat') { for (var i = 0; i < GROUP_COLORS.length; i++) if (GROUP_COLORS[i][0] === v) return GROUP_COLORS[i][1]; return NEUTRAL; }
    if (lens === 'lease') {
      if (v === null) return '#1f3a57';
      if (v === 'agg') return NEUTRAL;
      return v <= 6 ? STATUS.critical : v <= 12 ? STATUS.serious : v <= 24 ? STATUS.warning : STATUS.ok;
    }
    if (v === null || !isFinite(v)) return '#1f3a57';
    if (lens === 'profit' || lens === 'sqm') {
      var k = LENS_K[lens], t = symlog(v, k) / symlog(dom.maxAbs || 1, k);
      return t >= 0 ? ramp(DIV_POS, t) : ramp(DIV_NEG, -t);
    }
    if (lens === 'var') { var tv = Math.max(-1, Math.min(1, v / 0.4)); return tv >= 0 ? ramp(DIV_POS, tv) : ramp(DIV_NEG, -tv); }
    if (lens === 'spp') {
      var lo = Math.log10(Math.max(dom.min, 0.01)), hi = Math.log10(Math.max(dom.max, 0.02));
      return ramp(SEQ, (Math.log10(Math.max(v, 0.01)) - lo) / (hi - lo || 1));
    }
    return NEUTRAL;
  }
  function zoneAgg(zone, lens, by) {
    var a = { profit: 0, budget: 0, sales: 0, pax: 0, area: 0, n: 0, expiring: 0, groups: {} };
    S.units.forEach(function (u) {
      if ((by ? u[by] : u.zone) !== zone) return;
      var d = unitData(u.code); if (!d) return;
      a.n++; a.profit += d.profit; a.budget += d.budget; a.sales += d.sales; a.pax = Math.max(a.pax, d.pax); a.area += u.area;
      var ml = monthsUntil(u.lease); if (ml !== null && ml <= 12) a.expiring += Math.max(0, d.profit);
      var g = CAT_GROUP[u.category]; a.groups[g] = (a.groups[g] || 0) + d.sales;
    });
    if (!a.n) return { v: null, text: '' };
    if (lens === 'profit') return { v: a.profit, text: money(a.profit) };
    if (lens === 'sqm') return { v: a.area ? a.profit / a.area : null, text: a.area ? money(a.profit / a.area) + '/m²' : '—' };
    if (lens === 'spp') return { v: a.pax ? a.sales / a.pax : null, text: a.pax ? money(a.sales / a.pax) + ' per pax' : '—' };
    if (lens === 'var') { var vv = a.budget ? (a.profit - a.budget) / Math.abs(a.budget) : null; return { v: vv, text: pct(vv, true) + ' vs budget' }; }
    if (lens === 'lease') { var fr = a.profit > 0 ? a.expiring / a.profit : 0; return { v: fr >= 0.3 ? 3 : fr >= 0.15 ? 9 : fr > 0 ? 18 : 99, text: pct(fr) + ' of profit expiring' }; }
    var best = null; for (var k in a.groups) if (!best || a.groups[k] > a.groups[best]) best = k;
    return { v: best, text: best || '' };
  }
  function fmtLens(u, lens) {
    var v = lensValue(u, lens);
    if (lens === 'profit') return money(v);
    if (lens === 'sqm') return v === null ? '—' : money(v) + '/m²';
    if (lens === 'spp') return v === null ? '—' : money(v);
    if (lens === 'var') return pct(v, true);
    if (lens === 'lease') return v === null ? 'Airport-operated' : v <= 0 ? 'Expired' : v + ' months';
    if (lens === 'cat') return u.category;
    return '';
  }
  function totals(filter) {
    var t = { profit: 0, budget: 0, sales: 0, retail: 0, conc: 0, area: 0, areaProfit: 0, n: 0, loss: 0 };
    var groundOnly = S.scope === 'Ground';
    S.units.forEach(function (u) {
      if (!filter(u)) return;
      var d = unitData(u.code); if (!d) return;
      t.profit += d.profit; t.budget += d.budget; t.sales += d.sales; t.conc += d.conc + d.other; t.n++;
      if (RETAIL[CAT_GROUP[u.category]]) t.retail += d.sales;
      if (groundOnly || u.terminal !== 'Ground') { t.area += u.area; t.areaProfit += d.profit; }
      if (d.profit < 0) t.loss++;
    });
    return t;
  }
  function departingPax() {
    var s = 0, b = 0;
    var t = S.scope, z = S.zone;
    S.features.forEach(function (f) {
      if (f.type !== 'gate') return;
      if (t !== 'all' && t !== 'Ground' && t !== 'Landside' && f.terminal !== t) return;
      if (z && PIER_ZONES[z] && f.pier !== z) return;
      s += S.gatePax[f.label] || 0; b += S.gateBudget[f.label] || 0;
    });
    return { actual: s, budget: b };
  }

  // ------------------------------------------------------------------ CSS
  var css = [
    '.apm{--bg:#011326;--surface:#021b36;--raise:#04213f;--line:rgba(169,219,243,.14);--line2:rgba(169,219,243,.24);--ink:#eef4f9;--ink2:#9cb3c9;--muted:#62809d;--sign:#8fd0f2;--signInk:#012f60;--good:#34d399;--bad:#f87171;--navy:#012f60;--card:rgba(250,252,254,.97);--ltext:#0b2545;--ldim:#4a6683;--lfaint:#7f95aa;--lline:rgba(1,47,96,.11);--lsoft:#eef3f7;--amber:#f59e0b;--glass:rgba(2,27,54,.84);',
    'position:fixed;inset:0;display:flex;flex-direction:column;background:var(--bg);color:var(--ink);font:13px/1.4 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;color-scheme:dark;overflow:hidden}',
    '.apm *{box-sizing:border-box}',
    '.apm [hidden]{display:none!important}',
    '.apm button,.apm select,.apm input{font:inherit;color:inherit}',
    '.apm :focus-visible{outline:2px solid var(--sign);outline-offset:2px}',
    '.apm-top{display:flex;align-items:center;gap:10px;padding:10px max(16px,env(safe-area-inset-right,0px)) 10px max(16px,env(safe-area-inset-left,0px));border-bottom:1px solid var(--lline);background:var(--card);color:var(--ltext);flex-wrap:wrap;position:relative;z-index:10;color-scheme:light}',
    '.apm-brand{display:flex;align-items:center;gap:10px;min-width:0}',
    '.apm-mark{display:block;height:34px;width:54px;flex:none}',
    '.apm-div{width:1px;align-self:stretch;margin:2px 2px;background:var(--lline)}',
    '.apm-demo{font-size:9.5px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:#b45309;background:rgba(245,158,11,.08);border:1px solid rgba(217,119,6,.4);border-radius:999px;padding:1px 7px;margin-left:6px;vertical-align:2px;cursor:help}',
    '.apm-title{font-weight:700;font-size:13.5px;letter-spacing:-.01em;color:var(--navy);white-space:nowrap}',
    '.apm-sub{color:var(--ldim);font-size:10.5px;white-space:nowrap}',
    '.apm-tabs{display:flex;gap:2px;background:var(--lsoft);border-radius:9px;padding:2px;overflow-x:auto;max-width:100%}',
    '.apm-tab{background:none;border:0;padding:5px 10px;border-radius:7px;cursor:pointer;color:var(--ldim);font-size:12px;white-space:nowrap}',
    '.apm-tab:hover{color:var(--navy)}',
    '.apm-tab[aria-pressed=true]{background:var(--navy);color:#fff;font-weight:600}',
    '.apm-spacer{flex:1}',
    '.apm-period{display:flex;align-items:center;gap:6px}',
    '.apm-select{background:var(--raise);border:1px solid var(--line);border-radius:8px;padding:6px 8px;cursor:pointer}',
    '.apm-top .apm-select,.apm-top .apm-btn,.apm-top .apm-search input{background:var(--lsoft);border-color:transparent;color:var(--ltext)}',
    '.apm-top .apm-btn:hover,.apm-top .apm-select:hover{border-color:rgba(1,47,96,.25)}',
    '.apm-top .apm-btn.primary{background:var(--navy);border-color:var(--navy);color:#fff}',
    '.apm-top .apm-search input::placeholder{color:var(--lfaint)}',
    '.apm-top .apm-select{max-width:160px}.apm-top .apm-search input{width:168px}.apm-top{gap:8px}',
    '.apm-top :focus-visible{outline-color:var(--navy)}',
    '.apm-btn{background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:8px;padding:6px 10px;cursor:pointer;white-space:nowrap}',
    '.apm-btn:hover{border-color:var(--ink2)}',
    '.apm-btn.primary{background:var(--sign);color:var(--signInk);border-color:var(--sign);font-weight:650}',
    '.apm-btn:disabled{opacity:.5;cursor:default}',
    '.apm-search{position:relative}',
    '.apm-search input{background:var(--raise);border:1px solid var(--line);border-radius:8px;padding:6px 10px;width:190px}',
    '.apm-results{position:absolute;right:0;top:calc(100% + 4px);width:280px;background:#fbfdfe;color:var(--ltext);border:1px solid rgba(1,47,96,.08);border-radius:12px;box-shadow:0 10px 30px rgba(0,8,24,.38);z-index:20;overflow:hidden}',
    '.apm-results button{display:flex;justify-content:space-between;gap:8px;width:100%;text-align:left;background:none;border:0;padding:8px 10px;cursor:pointer}',
    '.apm-results button:hover{background:#eaf2f8}',
    '.apm-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-bottom:1px solid var(--lline);background:var(--card);color:var(--ltext);overflow-x:auto;position:relative;z-index:9;box-shadow:0 10px 30px rgba(0,8,24,.38)}',
    '.apm-kpi{padding:9px 16px;border-right:1px solid var(--lline);min-width:150px}',
    '.apm-kpi:last-child{border-right:0}',
    '.apm-kpi-l{color:var(--lfaint);font-size:10px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}',
    '.apm-kpi-v{font-size:19px;font-weight:650;letter-spacing:-.01em;margin-top:2px;white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--ltext)}',
    '.apm-kpi-d{font-size:11.5px;color:var(--ldim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.apm-kpis .up{color:#047857}.apm-kpis .dn{color:#dc2626}',
    '.apm-kpi-l{overflow:hidden;text-overflow:ellipsis}',
    '.up{color:var(--good)}.dn{color:var(--bad)}',
    '.apm-main{flex:1;display:flex;min-height:0}',
    '.apm-map{position:relative;flex:1;min-width:0;overflow:hidden;background:var(--bg)}',
    '.apm-map svg{display:block;width:100%;height:100%;cursor:grab;touch-action:none;user-select:none}',
    '.apm-map svg.drag{cursor:grabbing}',
    '.apm-float{position:absolute;display:flex;gap:6px;align-items:center;z-index:5}',
    '.apm-lens{top:12px;left:12px;flex-wrap:wrap;max-width:calc(100% - 24px)}',
    '.apm-seg{display:flex;background:var(--glass);border:1px solid var(--line);border-radius:10px;padding:2px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 12px 40px rgba(0,0,0,.35);overflow-x:auto;max-width:100%}',
    '.apm-seg button{background:none;border:0;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;color:var(--ink2);white-space:nowrap}',
    '.apm-seg button:hover{color:var(--ink)}',
    '.apm-seg button[aria-pressed=true]{background:rgba(143,208,242,.14);color:var(--ink);box-shadow:inset 0 0 0 1px rgba(143,208,242,.35)}',
    '.apm-crumbs{top:56px;left:12px;font-size:12px;color:var(--ink2);background:var(--glass);border:1px solid var(--line);border-radius:12px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);padding:4px 6px;max-width:calc(100% - 24px);overflow:hidden}',
    '.apm-crumbs button{background:none;border:0;cursor:pointer;color:var(--ink2);padding:2px 4px;border-radius:4px;white-space:nowrap}',
    '.apm-crumbs button:hover{color:var(--ink);background:var(--raise)}',
    '.apm-crumbs b{color:var(--ink);padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.apm-legend{left:12px;bottom:12px;flex-direction:column;align-items:stretch;background:var(--glass);border:1px solid var(--line);border-radius:12px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);padding:10px 12px;min-width:220px;gap:6px}',
    '.apm-legend-t{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}',
    '.apm-grad{height:10px;border-radius:3px}',
    '.apm-ticks{display:flex;justify-content:space-between;font-size:11px;color:var(--ink2);font-variant-numeric:tabular-nums}',
    '.apm-sw{display:grid;grid-template-columns:repeat(2,auto);gap:4px 14px;font-size:12px;color:var(--ink2)}',
    '.apm-sw span{display:flex;align-items:center;gap:6px;white-space:nowrap}',
    '.apm-sw i{width:10px;height:10px;border-radius:2px;display:inline-block;flex:none}',
    '.apm-zoom{right:12px;bottom:12px;flex-direction:column;gap:4px}',
    '.apm-zoom .apm-btn{width:34px;height:34px;padding:0;display:grid;place-items:center;font-size:16px;background:rgba(2,27,54,.92)}',
    '.apm-tools{top:12px;right:12px;flex-direction:column;align-items:flex-end}',
    '.apm-chip{display:flex;align-items:center;gap:8px;background:var(--glass);border:1px solid var(--line);border-radius:12px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);padding:6px 10px;font-size:12px;white-space:nowrap}',
    '.apm-chip.scn{border-color:rgba(245,158,11,.6);background:rgba(245,158,11,.1);color:#fcd34d}',
    '.apm-chip .dot{width:7px;height:7px;border-radius:50%;background:#f87171;box-shadow:0 0 0 3px rgba(248,113,113,.25)}',
    '.apm-chip.busy .dot{animation:apmPulse 0.8s ease-in-out infinite alternate}',
    '@keyframes apmPulse{from{opacity:.25}to{opacity:1}}',
    '.apm-month{position:absolute;right:64px;bottom:14px;font-size:42px;font-weight:800;letter-spacing:.02em;color:var(--sign);opacity:.9;pointer-events:none;z-index:4;text-shadow:0 2px 18px rgba(0,0,0,.6)}',
    '.apm-side{width:380px;flex:none;border-left:1px solid var(--line);background:var(--surface);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent}',
    '.apm-sec{padding:14px 16px;border-bottom:1px solid var(--line)}',
    '.apm-h{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 8px;font-weight:600}',
    '.apm-name{font-size:18px;font-weight:700;margin:0;text-wrap:balance}',
    '.apm-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
    '.apm-pill{font-size:11px;border:1px solid var(--line2);border-radius:999px;padding:2px 8px;color:var(--ink2);white-space:nowrap}',
    '.apm-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--sign);color:var(--signInk);border-color:var(--sign);font-weight:700}',
    '.apm-big{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}',
    '.apm-big b{font-size:30px;letter-spacing:-.02em}',
    '.apm-flag{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.035);border:1px solid var(--line);margin-top:6px;font-size:12px;color:var(--ink2)}',
    '.apm-flag i{flex:none;width:18px;height:18px;border-radius:5px;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:11px;color:#011326}',
    '.apm-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}',
    '.apm-grid div{min-width:0}',
    '.apm-grid small{display:block;color:var(--muted);font-size:11px}',
    '.apm-grid b{font-size:15px;font-variant-numeric:tabular-nums}',
    '.apm-list{display:flex;flex-direction:column;gap:2px}',
    '.apm-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;background:none;border:0;padding:6px 8px;margin:0 -8px;border-radius:6px;cursor:pointer;text-align:left;width:calc(100% + 16px)}',
    '.apm-row:hover{background:var(--raise)}',
    '.apm-row span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.apm-row small{color:var(--muted);margin-left:6px}',
    '.apm-row b{font-variant-numeric:tabular-nums}',
    '.apm-bar{height:4px;border-radius:2px;background:var(--line);grid-column:1/-1;overflow:hidden}',
    '.apm-bar i{display:block;height:100%;border-radius:2px}',
    '.apm-whatif{background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.4);border-radius:12px;padding:12px}',
    '.apm-whatif .apm-btn.primary{background:var(--amber);border-color:var(--amber);color:#1f1300}',
    '.apm-wih{color:#fbbf24}',
    '.apm-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}',
    '.apm-field label{font-size:12px;color:var(--ink2);display:flex;justify-content:space-between}',
    '.apm-field input[type=range]{width:100%;accent-color:#f59e0b}',
    '.apm-actions{display:flex;gap:8px;flex-wrap:wrap}',
    '.apm-note{font-size:12px;color:var(--muted);margin:8px 0 0}',
    '.apm-chart svg{display:block;width:100%;height:auto;overflow:visible}',
    '.apm-close{float:right;background:none;border:1px solid var(--line2);border-radius:6px;cursor:pointer;color:var(--ink2);padding:2px 8px}',
    '.apm-tip{position:fixed;z-index:50;pointer-events:none;background:rgba(2,24,48,.95);border:1px solid rgba(169,219,243,.14);color:#eef4f9;border-radius:12px;padding:10px 12px;font:12px/1.5 Inter,-apple-system,"Segoe UI",sans-serif;box-shadow:0 14px 36px rgba(0,0,0,.5);max-width:268px}',
    '.apm-tip b{font-size:13px}',
    '.apm-tip .k{color:#9cb3c9}',
    '.apm-state{position:absolute;inset:0;display:grid;place-items:center;color:var(--ink2);z-index:6;pointer-events:none}',
    '.apm-state div{background:rgba(2,27,54,.95);border:1px solid var(--line2);border-radius:10px;padding:14px 18px;max-width:340px;text-align:center}',
    '.apm-toast{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:8px 14px;border-radius:8px;font-weight:600;z-index:8;white-space:nowrap}',
    /* svg classes */
    '.u{transition:fill .45s ease;cursor:pointer}',
    '.u:hover{stroke:#fff;stroke-width:1.4}',
    '.stale .u{animation:apmPulse .7s ease-in-out infinite alternate}',
    '.dim{opacity:.22}',
    '.apm-gl{position:absolute;inset:0;display:block;cursor:grab;touch-action:none}',
    '.apm-ov{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2}',
    '.l3{position:absolute;left:0;top:0;white-space:nowrap;will-change:transform;margin:0;font-family:Inter,-apple-system,"Segoe UI",sans-serif}',
    '.l3.place{color:rgba(169,219,243,.55);font-size:15px;font-weight:600;translate:-50% -50%;text-shadow:0 1px 6px #000}',
    '.l3.road{color:rgba(169,219,243,.75);font-size:11px;font-weight:700;translate:-50% -50%;background:rgba(2,27,54,.85);padding:1px 6px;border-radius:4px}',
    '.l3.poi{color:#f0b6d2;font-size:12px;font-weight:600;translate:-50% -120%;text-shadow:0 1px 5px #000}',
    '.l3.term{color:#8fd0f2;font-size:13px;font-weight:800;letter-spacing:.14em;translate:-50% -140%;text-shadow:0 1px 8px #000}',
    '.l3.term.closed{color:rgba(238,244,249,.6);font-size:10px;letter-spacing:.1em;translate:-50% -50%}',
    '.l3.gate{color:#8fd0f2;font-size:10px;font-weight:800;translate:-50% -130%;text-shadow:0 1px 4px #000}',
    '.l3.unit{color:#fff;font-size:10px;font-weight:600;translate:-50% -115%;background:rgba(1,19,38,.72);padding:1px 5px;border-radius:4px;max-width:150px;overflow:hidden;text-overflow:ellipsis}',
    '.l3.unit.sel{background:#8fd0f2;color:#012f60;font-weight:800;z-index:3}',
    '.l3.park{color:#eef4f9;font-size:11px;font-weight:700;translate:-50% -115%;text-shadow:0 1px 5px #000}',
    '.l3.zone{display:flex;flex-direction:column;align-items:center;translate:-50% -50%;color:#fff;text-shadow:0 1px 6px #000;line-height:1.15}',
    '.l3.zone b{font-size:12px;letter-spacing:.04em}',
    '.l3.zone span{font-size:11px;font-weight:600;color:#e7edf4}',
    '.l3.zone.callout{background:rgba(2,27,54,.88);border:1px solid rgba(143,208,242,.55);border-radius:8px;padding:5px 10px;text-shadow:none;translate:-50% -100%}',
    '.l3.zone.callout b{font-size:12px;color:#8fd0f2;letter-spacing:.06em;text-transform:uppercase}',
    '.l3.zone.callout span{font-size:15px;font-weight:700;color:#fff}',
    '.apm-compass{position:absolute;right:12px;top:160px;z-index:5;background:none;border:0;padding:0;cursor:pointer;border-radius:50%}',
    '.apm-compass svg{display:block;transition:transform .1s linear}',
    '.apm-pfilter{top:96px;left:12px;flex-direction:column;align-items:stretch;gap:5px;background:rgba(2,27,54,.94);border:1px solid rgba(143,208,242,.45);border-radius:10px;padding:8px 10px;max-width:min(560px,calc(100% - 24px))}',
    '.apm-frow{display:flex;align-items:center;gap:4px;flex-wrap:wrap}',
    '.apm-flab{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);width:46px;flex:none}',
    '.apm-fchip{background:var(--raise);border:1px solid var(--line2);border-radius:999px;padding:3px 9px;font-size:11.5px;cursor:pointer;color:var(--ink2);display:inline-flex;align-items:center;gap:5px}',
    '.apm-fchip i{width:8px;height:8px;border-radius:2px;display:inline-block}',
    '.apm-fchip.on{background:var(--ink);color:var(--bg);border-color:var(--ink);font-weight:600}',
    '.apm-pfilter input[type=range]{flex:1;min-width:110px;accent-color:#8fd0f2}',
    '.apm-fmonth{font-size:12px;min-width:62px;font-variant-numeric:tabular-nums}',
    '.apm-fsum{font-size:12px;color:var(--ink2);border-top:1px solid var(--line);padding-top:6px}',
    '.apm-story{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:min(560px,calc(100% - 32px));background:rgba(2,27,54,.97);border:1px solid var(--sign);border-radius:12px;padding:14px 16px;z-index:9;box-shadow:0 18px 50px rgba(0,0,0,.55)}',
    '.apm-story h3{margin:2px 0 6px;font-size:18px;text-wrap:balance}',
    '.apm-story p{margin:0 0 12px;color:var(--ink2);font-size:14px;line-height:1.5}',
    '.apm-story p b{color:var(--ink)}',
    '.apm-story .apm-actions{align-items:center;justify-content:space-between}',
    '.apm-st-top{display:flex;justify-content:space-between;align-items:center}',
    '.apm-st-step{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--sign);font-weight:700}',
    '.apm-st-dots{display:flex;gap:5px}',
    '.apm-st-dots i{width:7px;height:7px;border-radius:50%;background:var(--line2)}',
    '.apm-st-dots i.on{background:var(--sign)}',
    '.apm-tools .apm-btn[aria-pressed=true]{background:var(--sign);color:var(--signInk);border-color:var(--sign);font-weight:700}',
    '.l3.proj{translate:-50% -100%;background:rgba(2,27,54,.92);border:1px solid;border-radius:7px;padding:3px 8px;font-size:11px;color:#eef4f9;line-height:1.3;text-align:center}',
    '.l3.proj b{display:block;font-size:11.5px}',
    '.projl{font-size:22px;font-weight:800;paint-order:stroke;stroke:#011326;stroke-width:5px;pointer-events:none}',
    '.apm-3donly{display:none!important}',
    '.apm.is3d .apm-3donly{display:grid!important}',
    '.u.in,.ul.in{transition:opacity .35s ease}',
    '.lod0 .u.in{opacity:0;pointer-events:none}',
    '.lod0 .ul.in,.lod0 .near{opacity:0}',
    '.near{transition:opacity .35s}',
    '.zagg{opacity:0;pointer-events:none;transition:opacity .35s ease,fill .45s ease;stroke:rgba(1,19,38,.9);stroke-width:2}',
    '.lod0 .zagg{opacity:.95;pointer-events:auto;cursor:zoom-in}',
    '.lod0 .zagg:hover{stroke:#8fd0f2;stroke-width:3}',
    '.lod0 .zagg.dim{opacity:.35}',
    '.zaggl{fill:#fff;font-weight:700;pointer-events:none;opacity:0;transition:opacity .35s}',
    '.zaggl.dk{fill:#011326}',
    '.zaggl .zv{font-weight:500;opacity:.9}',
    '.lod0 .zaggl{opacity:1}',
    '.place{fill:rgba(169,219,243,.42);font-size:58px;font-weight:600;letter-spacing:.02em;pointer-events:none}',
    '.roadl{fill:rgba(169,219,243,.6);font-size:34px;font-weight:700;pointer-events:none}',
    '.poil{fill:rgba(225,170,200,.85);font-size:30px;font-weight:600;pointer-events:none}',
    '.rwy{fill:rgba(240,244,248,.85);font-size:30px;font-weight:800;letter-spacing:.05em;pointer-events:none}',
    '.maplbl{fill:rgba(169,219,243,.45);font-weight:700;pointer-events:none}',
    '.tlabel{fill:#8fd0f2;font-size:34px;font-weight:800;letter-spacing:.12em;pointer-events:none}',
    '.place,.roadl,.poil,.tlabel{transition:opacity .35s}',
    '.lod1 .place,.lod1 .roadl{opacity:0}',
    '.lod2 .tlabel,.lod2 .poil{opacity:0}',
    '.ul{fill:#fff;font-size:5.4px;font-weight:600;pointer-events:none;opacity:0;transition:opacity .2s}',
    '.ul.dk{fill:#011326}',
    '.ul.huge,.lod1 .ul.big,.lod2 .ul{opacity:1}',
    '.gl{fill:#8fd0f2;font-size:9px;font-weight:800;letter-spacing:.04em;pointer-events:none}',
    '.zl{fill:rgba(238,244,249,.45);font-size:11px;font-weight:700;letter-spacing:.18em;pointer-events:none}',
    '.zh{fill:transparent;cursor:zoom-in}',
    '.zh:hover{fill:rgba(143,208,242,.05);stroke:rgba(143,208,242,.4);stroke-width:1}',
    '.flow{fill:none;stroke:#8fd0f2;stroke-linecap:round;stroke-dasharray:2 10;animation:apmFlow 1.1s linear infinite;opacity:.85;pointer-events:none}',
    '@keyframes apmFlow{to{stroke-dashoffset:-24}}',
    '@media (prefers-reduced-motion:reduce){.flow,.stale .u,.apm-chip.busy .dot{animation:none}.u{transition:none}}',
    '@media (max-width:820px){.apm-main{flex-direction:column}.apm-side{width:auto;height:46%;border-left:0;border-top:1px solid var(--line)}.apm-kpis{grid-template-columns:repeat(5,minmax(140px,1fr))}.apm-search input{width:140px}.apm-legend{min-width:0;padding:6px 8px}.apm-legend .apm-note{display:none}.apm-month{font-size:24px}.apm-kpi-v{font-size:18px}.apm-tools{top:auto;bottom:12px;right:56px}}'
  ].join('\n');

  var styleEl = document.createElement('style');
  styleEl.id = 'apm-style';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  root.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;overflow:hidden;';
  root.innerHTML = '';
  var app = document.createElement('div');
  app.className = 'apm';
  root.appendChild(app);

  // --------------------------------------------------------- shell markup
  function shellHtml() {
    var tabs = SCOPE_LIST.map(function (sc) { return sc[0]; }).map(function (k) {
      return '<button class=\'apm-tab\' data-act=\'scope\' data-v=\'' + k + '\' aria-pressed=\'false\'>' + esc(SCOPES[k].label) + '</button>';
    }).join('');
    var opts = PERIODS.map(function (p) { return '<option value=\'' + p.key + '\'>' + esc(p.label) + '</option>'; }).join('');
    var lens = LENSES.map(function (l) { return '<button data-act=\'lens\' data-v=\'' + l.key + '\' title=\'' + esc(l.hint) + '\' aria-pressed=\'false\'>' + esc(l.label) + '</button>'; }).join('');
    return '' +
      '<header class=\'apm-top\'>' +
        '<div class=\'apm-brand\'><span class=\'apm-mark\' title=\'MAG\'>' + MAG_LOGO + '</span><span class=\'apm-div\'></span><div><div class=\'apm-title\'>' + esc(CONFIG.title) + ' <span class=\'apm-demo\' title=\'Real layout and passenger scale. Unit-level sales, costs and profits are invented for demonstration.\'>' + esc(CONFIG.disclaimer) + '</span></div><div class=\'apm-sub\'>' + esc(CONFIG.subtitle) + '</div></div></div>' +
        '<nav class=\'apm-tabs\' aria-label=\'Area\'>' + tabs + '</nav>' +
        '<div class=\'apm-spacer\'></div>' +
        '<div class=\'apm-period\'><label for=\'apm-period\' class=\'apm-sub\' style=\'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)\'>Period</label><select id=\'apm-period\' class=\'apm-select\' data-act=\'period\'>' + opts + '</select>' +
        '<button class=\'apm-btn\' data-act=\'play\' id=\'apm-play\' title=\'Play Jan to Oct 2026 month by month\'>▶ Play</button><button class=\'apm-btn primary\' data-act=\'story\' title=\'A guided tour of the key stories\'>Tell the story</button></div>' +
        '<div class=\'apm-search\'><input id=\'apm-q\' type=\'search\' placeholder=\'Find a unit, asset or project\' autocomplete=\'off\' aria-label=\'Find a unit or tenant\'><div class=\'apm-results\' id=\'apm-results\' hidden></div></div>' +
      '</header>' +
      '<section class=\'apm-kpis\' id=\'apm-kpis\' aria-label=\'Headline figures\'></section>' +
      '<div class=\'apm-main\'>' +
        '<div class=\'apm-map\' id=\'apm-map\'>' +
          '<div class=\'apm-float apm-lens\'><div class=\'apm-seg\' role=\'group\' aria-label=\'Colour units by\'>' + lens + '</div></div>' +
          '<div class=\'apm-float apm-crumbs\' id=\'apm-crumbs\'></div>' +
          '<div class=\'apm-float apm-tools\'><div class=\'apm-seg\'><button data-act=\'mode\' id=\'apm-modebtn\' aria-pressed=\'true\'>3D</button></div><button class=\'apm-btn\' data-act=\'flow\' id=\'apm-flowbtn\' aria-pressed=\'false\'>Passenger flow</button><button class=\'apm-btn\' data-act=\'projects\' id=\'apm-projbtn\' aria-pressed=\'false\'>⚒ Capital projects</button><div id=\'apm-scn\'></div></div>' +
          '<div class=\'apm-float apm-legend\' id=\'apm-legend\'></div>' +
          '<div class=\'apm-float apm-zoom\'><button class=\'apm-btn apm-3donly\' data-act=\'rot\' data-v=\'-45\' aria-label=\'Rotate left\'>⟲</button><button class=\'apm-btn apm-3donly\' data-act=\'rot\' data-v=\'45\' aria-label=\'Rotate right\'>⟳</button><button class=\'apm-btn apm-3donly\' data-act=\'tilt\' aria-label=\'Toggle top-down view\'>⊤</button><button class=\'apm-btn\' data-act=\'zin\' aria-label=\'Zoom in\'>+</button><button class=\'apm-btn\' data-act=\'zout\' aria-label=\'Zoom out\'>−</button><button class=\'apm-btn\' data-act=\'zreset\' aria-label=\'Show whole airport\'>⤢</button></div>' +
          '<div class=\'apm-month\' id=\'apm-month\' hidden></div>' +
          '<div class=\'apm-float apm-pfilter\' id=\'apm-pfilter\' hidden></div>' +
          '<div class=\'apm-story\' id=\'apm-story\' role=\'dialog\' aria-label=\'Story\' hidden></div>' +
          '<div class=\'apm-state\' id=\'apm-state\'><div>Loading the airport model…</div></div>' +
        '</div>' +
        '<aside class=\'apm-side\' id=\'apm-side\' aria-live=\'polite\'></aside>' +
      '</div>';
  }
  app.innerHTML = shellHtml();
  var $ = function (id) { return document.getElementById(id); };

  // ------------------------------------------------------------ map build
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var PLANE = 'M0,-30 C3,-30 4,-24 4,-18 L4,-6 L28,6 L28,11 L4,4 L4,18 L11,24 L11,28 L0,25 L-11,28 L-11,24 L-4,18 L-4,4 L-28,11 L-28,6 L-4,-6 L-4,-18 C-4,-24 -3,-30 0,-30 Z';

  function buildMap() {
    S.aggs = [];
    var host = $('apm-map');
    if (svg) svg.remove();
    svg = el('svg', { viewBox: AIRPORT_VIEW.x + ' ' + AIRPORT_VIEW.y + ' ' + AIRPORT_VIEW.w + ' ' + AIRPORT_VIEW.h, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Airport map coloured by the selected measure. Zoom into a terminal to see individual units.' });
    host.insertBefore(svg, host.firstChild);
    var defs = el('defs', {}, svg);
    var pat = el('pattern', { id: 'apm-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    el('rect', { width: 6, height: 6, fill: '#0e2742' }, pat);
    el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#1f3d5c', 'stroke-width': 2 }, pat);
    var glow = el('filter', { id: 'apm-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: 3, result: 'b' }, glow);
    var mg = el('feMerge', {}, glow); el('feMergeNode', { in: 'b' }, mg); el('feMergeNode', { in: 'SourceGraphic' }, mg);

    var gBase = el('g', {}, svg), gBg = el('g', {}, svg), gZone = el('g', {}, svg), gUnits = el('g', { id: 'apm-units' }, svg);
    var gFlow = el('g', { id: 'apm-flow' }, svg), gGates = el('g', {}, svg), gLabels = el('g', {}, svg), gAgg = el('g', {}, svg), gMap = el('g', {}, svg), gSel = el('g', {}, svg);
    el('rect', { x: WORLD.x - 4000, y: WORLD.y - 4000, width: WORLD.w + 8000, height: WORLD.h + 8000, fill: BASE_COLORS.land }, gBase);
    var baseOrder = { airfield: 0, urban: 1, forest: 2, beige: 3, water: 4, apronbld: 5, paved: 6, roadfill: 7 };
    S.features.filter(function (f) { return f.type === 'base'; }).sort(function (a, b) { return (baseOrder[a.cls] || 0) - (baseOrder[b.cls] || 0); }).forEach(function (f) {
      el('path', { d: f.path, fill: BASE_COLORS[f.cls] || BASE_COLORS.land, 'fill-rule': 'evenodd' }, gBase);
    });
    var order = { runwayline: 1, walkway: 2, station: 2, terminal: 2, closed: 2, ghostpier: 3, zone: 3, pier: 3, security: 4, checkin: 4, holdroom: 4, stand: 5, gate: 6 };
    var feats = S.features.filter(function (f) { return f.type !== 'base'; }).sort(function (a, b) { return (order[a.type] || 0) - (order[b.type] || 0); });
    function txt(parent, x, y, s, cls, style, anchor) {
      var t = el('text', { x: x, y: y, class: cls, 'text-anchor': anchor || 'middle' }, parent);
      if (style) t.setAttribute('style', style);
      t.textContent = s;
      return t;
    }
    feats.forEach(function (f) {
      var r = f.box;
      switch (f.type) {
        case 'runwayline':
          var L = f.line, ang = Math.atan2(L[3] - L[1], L[2] - L[0]), deg = ang * 180 / Math.PI, ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
          el('line', { x1: L[0] + ux * 90, y1: L[1] + uy * 90, x2: L[2] - ux * 90, y2: L[3] - uy * 90, stroke: 'rgba(230,236,244,.55)', 'stroke-width': 2.4, 'stroke-dasharray': '30 22' }, gBg);
          [[L[0], L[1], 1], [L[2], L[3], -1]].forEach(function (e) {
            for (var i = -3; i <= 3; i++) {
              if (!i) continue;
              var ox = e[0] + nx * i * 4.2 + ux * e[2] * 8, oy = e[1] + ny * i * 4.2 + uy * e[2] * 8;
              el('line', { x1: ox, y1: oy, x2: ox + ux * e[2] * 26, y2: oy + uy * e[2] * 26, stroke: 'rgba(230,236,244,.6)', 'stroke-width': 2.4 }, gBg);
            }
          });
          var ends = (f.ends || '').split('|');
          txt(gMap, L[0] + ux * 60, L[1] + uy * 60, ends[0] || '', 'rwy', null).setAttribute('transform', 'rotate(' + (deg + 90) + ' ' + (L[0] + ux * 60) + ' ' + (L[1] + uy * 60) + ')');
          txt(gMap, L[2] - ux * 60, L[3] - uy * 60, ends[1] || '', 'rwy', null).setAttribute('transform', 'rotate(' + (deg - 90) + ' ' + (L[2] - ux * 60) + ' ' + (L[3] - uy * 60) + ')');
          var mx = (L[0] + L[2]) / 2 - nx * 30, my = (L[1] + L[3]) / 2 - ny * 30;
          txt(gMap, mx, my, f.label, 'maplbl', 'font-size:30px;letter-spacing:.14em').setAttribute('transform', 'rotate(' + deg + ' ' + mx + ' ' + my + ')');
          break;
        case 'place': txt(gMap, f.labelX, f.labelY, f.label, 'place', null); break;
        case 'roadlabel': txt(gMap, f.labelX, f.labelY, f.label, 'roadl', null); break;
        case 'poi':
          var hotel = /hotel|radisson/i.test(f.name || '');
          el('circle', { cx: r.x, cy: r.y, r: 9, fill: hotel ? '#d55181' : '#62809d', stroke: '#011326', 'stroke-width': 2 }, gMap);
          txt(gMap, r.x + 14, r.y + 6, f.label, 'poil', null, 'start');
          break;
        case 'terminal': el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 10, fill: '#12304f', stroke: 'rgba(255,255,255,.18)', 'stroke-width': 1.5 }, gBg); break;
        case 'closed': el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 10, fill: 'url(#apm-hatch)', stroke: 'rgba(255,255,255,.2)', 'stroke-dasharray': '6 5', 'stroke-width': 1.5 }, gBg); break;
        case 'ghostpier': el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 8, fill: 'none', stroke: 'rgba(255,255,255,.2)', 'stroke-dasharray': '6 5', 'stroke-width': 1.5 }, gBg); break;
        case 'station': el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 10, fill: '#173556', stroke: 'rgba(255,255,255,.18)', 'stroke-width': 1.5 }, gBg); break;
        case 'walkway': el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 3, fill: '#24486c', stroke: 'rgba(255,255,255,.12)' }, gBg); break;
        case 'pier':
          el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 8, fill: '#12304f', stroke: 'rgba(255,255,255,.18)', 'stroke-width': 1.5 }, gBg);
          if (r.w > r.h) el('rect', { x: r.x + 4, y: r.y + 52, width: r.w - 8, height: r.h - 104, fill: '#16314f' }, gBg);
          else el('rect', { x: r.x + r.w / 2 - 15, y: r.y + 4, width: 30, height: r.h - 8, fill: '#16314f' }, gBg);
          break;
        case 'security':
          el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 3, fill: '#0e2742', stroke: 'rgba(255,255,255,.08)' }, gBg);
          var vert = r.h > r.w, nl = Math.max(3, Math.floor((vert ? r.h : r.w) / 30));
          for (var s = 0; s < nl; s++) {
            var p0 = 10 + s * ((vert ? r.h : r.w) - 20) / (nl - 1);
            if (vert) el('line', { x1: r.x + 4, x2: r.x + r.w - 4, y1: r.y + p0, y2: r.y + p0, stroke: '#24425f', 'stroke-width': 3 }, gBg);
            else el('line', { y1: r.y + 4, y2: r.y + r.h - 4, x1: r.x + p0, x2: r.x + p0, stroke: '#24425f', 'stroke-width': 3 }, gBg);
          }
          break;
        case 'checkin': el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 3, fill: '#1a3a5c', stroke: 'rgba(255,255,255,.06)' }, gBg); break;
        case 'holdroom': el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 2, fill: 'url(#apm-hatch)' }, gBg); break;
        case 'stand':
          var cx = r.x + r.w / 2, cy = r.y + r.h / 2, sc = r.w / 64;
          el('path', { d: PLANE, fill: '#1f3d5c', stroke: '#2b4a6b', 'stroke-width': 1 / sc, transform: 'translate(' + cx + ',' + cy + ') rotate(' + (f.heading || 0) + ') scale(' + sc + ')' }, gBg);
          break;
        case 'gate':
          if (f.closed) { el('circle', { cx: r.x, cy: r.y, r: 2.5, fill: '#3a5878' }, gGates); break; }
          el('circle', { cx: r.x, cy: r.y, r: 3, fill: '#8fd0f2' }, gGates);
          var gx = r.x, gy = r.y + 3, anc = 'middle';
          if (f.side === 'L') { gx = r.x + 6; anc = 'start'; } else if (f.side === 'R') { gx = r.x - 6; anc = 'end'; } else if (f.side === 'T') { gy = r.y + 13; } else if (f.side === 'B') { gy = r.y - 6; }
          txt(gLabels, gx, gy, f.label, 'gl near', null, anc);
          break;
        case 'compass':
          var cg = el('g', { transform: 'translate(' + (r.x + r.w / 2) + ',' + (r.y + r.h / 2) + ') rotate(' + (f.heading || 0) + ') scale(2.4)' }, gMap);
          el('circle', { r: 17, fill: 'rgba(1,19,38,.6)', stroke: 'rgba(255,255,255,.25)' }, cg);
          el('path', { d: 'M0,-14 L6,8 L0,4 L-6,8 Z', fill: '#cfd6df' }, cg);
          txt(cg, 0, -21, 'N', 'zl', 'font-size:10px;fill:#cfd6df;letter-spacing:0');
          break;
      }
      if (f.zone && (f.type === 'zone' || f.type === 'pier' || f.type === 'station' || f.type === 'walkway')) {
        var z = el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 6, class: 'zh', 'data-zone': f.zone }, gZone);
        el('title', {}, z).textContent = 'Zoom into ' + f.zone;
        var ag = el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: f.type === 'walkway' ? 3 : 8, class: 'zagg', 'data-zone': f.zone, fill: NEUTRAL }, gAgg);
        var lab = null;
        if (f.type !== 'walkway') {
          var fs = Math.max(13, Math.min(30, r.w / 6, r.h / 3.2));
          lab = el('text', { x: r.x + r.w / 2, y: r.y + r.h / 2, class: 'zaggl far', 'text-anchor': 'middle', style: 'font-size:' + fs + 'px' }, gAgg);
          var t1 = el('tspan', { x: r.x + r.w / 2, dy: '-0.15em' }, lab); t1.textContent = f.zone.replace(/^T[23] /, '');
          var t2 = el('tspan', { x: r.x + r.w / 2, dy: '1.15em', class: 'zv' }, lab); t2.textContent = '';
        }
        S.aggs.push({ zone: f.zone, rect: ag, label: lab });
      }
      if (f.label && ['gate', 'stand', 'runwayline', 'place', 'roadlabel', 'poi'].indexOf(f.type) < 0) {
        if (f.type === 'zone' && f.labelX === null) return;
        var lx = f.labelX !== null ? f.labelX : r.x + r.w / 2;
        var ly = f.labelY !== null ? f.labelY : r.y + r.h / 2 + 3;
        if (f.far) { txt(gMap, lx, ly, f.label, 'tlabel', null); return; }
        var t = txt(gLabels, lx, ly, f.label, 'zl near', f.small ? 'font-size:7.5px;letter-spacing:.14em;fill:rgba(238,244,249,.4)' : null);
        if (f.sub) txt(gLabels, lx, ly + 11, f.sub, 'zl near', 'font-size:7px;letter-spacing:.12em;fill:rgba(238,244,249,.4)');
        return t;
      }
    });

    SCOPE_LIST.forEach(function (sc) {
      if (sc[0] === 'all') { SCOPES.all.box = AIRPORT_VIEW; return; }
      var bx = null;
      var add = function (b) { if (!b || !b.w) return; if (!bx) bx = { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h }; else { bx.x0 = Math.min(bx.x0, b.x); bx.y0 = Math.min(bx.y0, b.y); bx.x1 = Math.max(bx.x1, b.x + b.w); bx.y1 = Math.max(bx.y1, b.y + b.h); } };
      S.units.forEach(function (u) { if (u.terminal === sc[0]) add(u.box); });
      S.features.forEach(function (f) { if (f.terminal === sc[0] && f.type !== 'gate') add(f.box); });
      if (bx) SCOPES[sc[0]].box = { x: bx.x0 - 40, y: bx.y0 - 40, w: bx.x1 - bx.x0 + 80, h: bx.y1 - bx.y0 + 80 };
    });
    unitEls = {};
    S.units.forEach(function (u) {
      var r = u.box, inside = u.terminal !== 'Ground';
      var rect = el('rect', { x: r.x + 0.8, y: r.y + 0.8, width: Math.max(r.w - 1.6, 1), height: Math.max(r.h - 1.6, 1), rx: 2.5, class: 'u' + (inside ? ' in' : ''), fill: NEUTRAL, stroke: '#011326', 'stroke-width': 1, 'data-code': u.code, tabindex: 0, role: 'button', 'aria-label': u.name }, gUnits);
      var big = r.w * r.h > 2500, huge = !inside;
      var label = el('text', { x: r.x + r.w / 2, y: r.y + r.h / 2 + 2, class: 'ul' + (big ? ' big' : '') + (huge ? ' huge' : '') + (inside ? ' in' : ''), 'text-anchor': 'middle' }, gLabels);
      var fsz = huge ? Math.min(22, Math.max(9, r.w / 10)) : big ? Math.min(10, Math.max(6, r.w / 14)) : 5.4;
      var maxChars = Math.floor(r.w / (fsz * 0.56));
      label.textContent = u.name.length > maxChars ? u.name.slice(0, Math.max(3, maxChars - 1)) + '…' : u.name;
      if (huge || big) label.setAttribute('style', 'font-size:' + fsz + 'px');
      unitEls[u.code] = { rect: rect, label: label };
    });
    el('rect', { id: 'apm-selbox', x: 0, y: 0, width: 0, height: 0, rx: 3, fill: 'none', stroke: '#8fd0f2', 'stroke-width': 2.4, filter: 'url(#apm-glow)', visibility: 'hidden', 'pointer-events': 'none' }, gSel);
    built = true;
    applyView();
  }

  /*@BASEMAP@*/
  // Basemap traced from a map tile, delta-encoded (see build.js); decoded to SVG path strings.
  var APM_BASEMAP = (function () {
    if (typeof APM_BASEMAP_ENC === 'undefined') return { paths: [] };
    var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    return { paths: APM_BASEMAP_ENC.split('\n').map(function (line) {
      var eq = line.indexOf('='), type = line.slice(0, eq), d = '';
      line.slice(eq + 1).split('|').forEach(function (ring) {
        var c = ring.indexOf(':'), p = ring.slice(0, c).split(',').map(Number), x = p[0], y = p[1], s = ring.slice(c + 1), i = 0;
        d += 'M' + x + ',' + y;
        while (i < s.length) {
          if (s.charAt(i) === '~') { var j = s.indexOf('~', i + 1), q = s.slice(i + 1, j).split(','); x += Number(q[0]); y += Number(q[1]); i = j + 1; }
          else { x += A.indexOf(s.charAt(i)) - 32; y += A.indexOf(s.charAt(i + 1)) - 32; i += 2; }
          d += 'L' + x + ',' + y;
        }
        d += 'Z';
      });
      return { type: type, d: d };
    }) };
  })();
  /*@MAP3D@*/
  var M3 = null;
  function is3D() { return !!M3 && S.mode === '3d'; }
  function setMode(m) {
    S.mode = m;
    if (m === '3d' && !M3) { try { M3 = createMap3D($('apm-map')); if (M3) M3.build(); } catch (err) { console.error(err); M3 = null; } if (!M3) { S.mode = '2d'; toast('3D needs WebGL, which is not available here. Showing the 2D map.'); } }
    if (M3) M3.setVisible(S.mode === '3d');
    if (svg) svg.style.display = S.mode === '3d' ? 'none' : '';
    renderAll();
  }

  // ------------------------------------------------------------- painting
  function paint() {
    if (!built) return;
    var dom = domain(S.lens);
    S.units.forEach(function (u) {
      var e = unitEls[u.code]; if (!e) return;
      var c = colorFor(u, S.lens, dom);
      e.rect.setAttribute('fill', c);
      e.label.setAttribute('class', e.label.getAttribute('class').replace(' dk', '') + (lum(c) > 0.55 ? ' dk' : ''));
      var dim = !inScope(u);
      e.rect.classList.toggle('dim', dim);
    });
    svg.classList.toggle('stale', S.stale);
    var sb = $('apm-selbox');
    var su = S.selected && S.byCode[S.selected];
    if (su) { sb.setAttribute('x', su.box.x - 1); sb.setAttribute('y', su.box.y - 1); sb.setAttribute('width', su.box.w + 2); sb.setAttribute('height', su.box.h + 2); sb.setAttribute('visibility', 'visible'); }
    else sb.setAttribute('visibility', 'hidden');
    var aggVals = S.aggs.map(function (g) { return zoneAgg(g.zone, S.lens); });
    var adom = { maxAbs: 0, min: Infinity, max: -Infinity };
    aggVals.forEach(function (a) { if (typeof a.v === 'number' && isFinite(a.v)) { adom.maxAbs = Math.max(adom.maxAbs, Math.abs(a.v)); adom.min = Math.min(adom.min, a.v); adom.max = Math.max(adom.max, a.v); } });
    S.aggs.forEach(function (g, i) {
      var a = aggVals[i], c = a.v === null ? '#1f3a57' : valueColor(a.v, S.lens, adom);
      g.rect.setAttribute('fill', c);
      g.rect.classList.toggle('dim', S.zone ? g.zone !== S.zone : false);
      g.text = a.text;
      if (g.label) { g.label.lastChild.textContent = a.text; g.label.classList.toggle('dk', lum(c) > 0.55); }
    });
    paintFlow();
    paintProjects2D();
    if (M3) M3.paint();
    renderLegend(dom);
  }

  function paintProjects2D() {
    var g = $('apm-proj2d');
    if (!g) { g = el('g', { id: 'apm-proj2d' }, svg); }
    while (g.firstChild) g.removeChild(g.firstChild);
    if (!S.showProjects) return;
    S.projects.forEach(function (p) {
      if (!projVisible(p)) return;
      var c = PSTAT[p.status] || '#94a3b8', on = S.selProject === p.id, shp;
      if (p.line) shp = el('line', { x1: p.line[0], y1: p.line[1], x2: p.line[2], y2: p.line[3], stroke: c, 'stroke-width': 40, 'stroke-opacity': on ? 0.5 : 0.3, 'data-proj': p.id, style: 'cursor:pointer' }, g);
      else shp = el('rect', { x: p.box.x, y: p.box.y, width: p.box.w, height: p.box.h, rx: 4, fill: c, 'fill-opacity': on ? 0.4 : 0.22, stroke: c, 'stroke-width': on ? 4 : 2.5, 'stroke-dasharray': p.status === 'In delivery' ? '' : '10 6', 'data-proj': p.id, style: 'cursor:pointer' }, g);
      el('title', {}, shp).textContent = p.name + ' · ' + p.status + ' · ' + money(p.forecast);
      var cx = p.box.x + p.box.w / 2, cy = p.line ? p.box.y + p.box.h / 2 : p.box.y - 8;
      var t = el('text', { x: cx, y: cy, 'text-anchor': 'middle', class: 'projl', fill: c }, g); t.textContent = p.name;
    });
  }
  function paintFlow() {
    var g = $('apm-flow'); if (!g) return;
    while (g.firstChild) g.removeChild(g.firstChild);
    $('apm-flowbtn').setAttribute('aria-pressed', S.flow ? 'true' : 'false');
    if (!S.flow) return;
    var piers = {}, maxP = 1;
    S.features.forEach(function (f) {
      if (f.type !== 'gate') return;
      var p = piers[f.pier] = piers[f.pier] || { pax: 0, budget: 0 };
      p.pax += S.gatePax[f.label] || 0; p.budget += S.gateBudget[f.label] || 0;
    });
    for (var k in piers) maxP = Math.max(maxP, piers[k].pax);
    var maxGate = 1;
    S.features.forEach(function (f) { if (f.type === 'gate') maxGate = Math.max(maxGate, S.gatePax[f.label] || 0); });
    S.features.forEach(function (f) {
      if (f.type === 'pier') {
        var sec = S.features.filter(function (x) { return x.type === 'security' && x.terminal === f.terminal; })[0];
        if (!sec) return;
        var p = piers[f.zone] || { pax: 0 };
        var sx = sec.box.x + sec.box.w / 2, sy = sec.box.y + sec.box.h / 2, d;
        if (f.box.w > f.box.h) {
          var py = f.box.y + f.box.h / 2, west = f.box.x < sec.box.x;
          var rx = west ? f.box.x + f.box.w : f.box.x, tx = west ? f.box.x : f.box.x + f.box.w, dx = west ? -1 : 1;
          d = 'M' + sx + ',' + sy + ' C' + (sx + dx * 90) + ',' + sy + ' ' + (rx - dx * 90) + ',' + py + ' ' + (rx + dx * 6) + ',' + py + ' L' + (tx - dx * 14) + ',' + py;
        } else {
          var px = f.box.x + f.box.w / 2, down = f.box.y > sec.box.y;
          var root = down ? f.box.y : f.box.y + f.box.h, tip = down ? f.box.y + f.box.h : f.box.y, dir = down ? 1 : -1;
          d = 'M' + sx + ',' + sy + ' C' + sx + ',' + (sy + dir * 70) + ' ' + px + ',' + (root - dir * 70) + ' ' + px + ',' + (root + dir * 6) + ' L' + px + ',' + (tip - dir * 14);
        }
        el('path', { d: d, class: 'flow', 'stroke-width': 2 + 9 * p.pax / maxP, 'vector-effect': 'non-scaling-stroke' }, g);
      }
      if (f.type === 'gate') {
        var v = S.gatePax[f.label] || 0, b = S.gateBudget[f.label] || 0;
        if (f.closed && !v) return;
        var rad = 3 + 8 * Math.sqrt(v / maxGate);
        var c = el('circle', { cx: f.box.x, cy: f.box.y, r: rad, fill: b && v < b * 0.8 ? 'rgba(248,113,113,.35)' : 'rgba(143,208,242,.28)', stroke: b && v < b * 0.8 ? '#f87171' : '#8fd0f2', 'stroke-width': 1 }, g);
        var t = el('title', {}, c); t.textContent = 'Gate ' + f.label + ': ' + num(v) + ' departing pax (' + pct(b ? v / b - 1 : null, true) + ' vs budget)';
      }
    });
  }

  function renderLegend(dom) {
    var L = LENSES.filter(function (l) { return l.key === S.lens; })[0];
    var h = '<div class=\'apm-legend-t\'>' + esc(L.label) + ' · ' + esc(periodObj().label) + '</div>';
    if (S.lens === 'profit' || S.lens === 'sqm') {
      var m = dom.maxAbs || 1, suf = S.lens === 'sqm' ? '/m²' : '';
      h += '<div class=\'apm-grad\' style=\'background:linear-gradient(90deg,' + DIV_NEG.slice().reverse().join(',') + ',' + DIV_POS.slice(1).join(',') + ')\'></div>';
      h += '<div class=\'apm-ticks\'><span>' + money(-m) + suf + '</span><span>Loss · 0 · Profit</span><span>' + money(m) + suf + '</span></div>';
      h += '<div class=\'apm-note\' style=\'margin:0\'>Log scale so small units stay visible.</div>';
    } else if (S.lens === 'var') {
      h += '<div class=\'apm-grad\' style=\'background:linear-gradient(90deg,' + DIV_NEG.slice().reverse().join(',') + ',' + DIV_POS.slice(1).join(',') + ')\'></div>';
      h += '<div class=\'apm-ticks\'><span>−40% or worse</span><span>on budget</span><span>+40%</span></div>';
    } else if (S.lens === 'spp') {
      h += '<div class=\'apm-grad\' style=\'background:linear-gradient(90deg,' + SEQ.join(',') + ')\'></div>';
      h += '<div class=\'apm-ticks\'><span>' + money(dom.min) + '</span><span>per passenger walking past</span><span>' + money(dom.max) + '</span></div>';
    } else if (S.lens === 'lease') {
      h += '<div class=\'apm-sw\'><span><i style=\'background:' + STATUS.critical + '\'></i>≤ 6 months</span><span><i style=\'background:' + STATUS.serious + '\'></i>7–12 months</span><span><i style=\'background:' + STATUS.warning + '\'></i>13–24 months</span><span><i style=\'background:' + STATUS.ok + '\'></i>Over 24 months</span><span><i style=\'background:#1f3a57;outline:1px solid #2b4a6b\'></i>Airport-operated</span></div>';
    } else {
      h += '<div class=\'apm-sw\'>' + GROUP_COLORS.map(function (g) { return '<span><i style=\'background:' + g[1] + '\'></i>' + esc(g[0]) + '</span>'; }).join('') + '</div>';
    }
    if (S.showProjects) h += '<div class=\'apm-legend-t\' style=\'margin-top:4px\'>Capital projects</div><div class=\'apm-sw\'>' + PSTATUSES.map(function (x) { return '<span><i style=\'background:' + PSTAT[x] + '\'></i>' + esc(x) + '</span>'; }).join('') + '</div>';
    if (is3D()) h += '<div class=\'apm-note\' style=\'margin:0\'>Fly in to a terminal: tower height shows the size of the value.</div>';
    $('apm-legend').innerHTML = h;
  }

  // ------------------------------------------------------------ KPI strip
  function renderKpis() {
    var t = totals(inScope);
    var pax = departingPax();
    var vb = t.budget ? (t.profit - t.budget) / Math.abs(t.budget) : null;
    var spp = pax.actual ? t.retail / pax.actual : null;
    var tiles = [
      ['Commercial profit', money(t.profit), '<span class=\'' + (vb >= 0 ? 'up' : 'dn') + '\'>' + pct(vb, true) + '</span> vs budget ' + money(t.budget)],
      ['Airport income', money(t.conc), 'Concessions, services and operated revenue'],
      ['Tenant sales', money(t.sales), t.n + ' units · ' + t.loss + ' loss-making'],
      ['Retail spend per pax', spp === null ? '—' : money(spp), num(pax.actual) + ' departing pax (' + pct(pax.budget ? pax.actual / pax.budget - 1 : null, true) + ' vs budget)'],
      [S.scope === 'Ground' ? 'Profit per m²' : 'Terminal profit per m²', t.area ? money(t.areaProfit / t.area) : '—', num(t.area) + ' m² of ' + (S.scope === 'Ground' ? 'car parks and rental' : 'terminal space')]
    ];
    $('apm-kpis').innerHTML = tiles.map(function (k) {
      return '<div class=\'apm-kpi\'><div class=\'apm-kpi-l\'>' + esc(k[0]) + ' · ' + esc(scopeLabel()) + '</div><div class=\'apm-kpi-v\'>' + k[1] + '</div><div class=\'apm-kpi-d\'>' + k[2] + '</div></div>';
    }).join('');
  }

  // ---------------------------------------------------------- chrome bits
  function renderChrome() {
    app.querySelectorAll('[data-act=scope]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === S.scope && !S.zone ? 'true' : b.getAttribute('data-v') === S.scope ? 'true' : 'false'); });
    app.querySelectorAll('[data-act=lens]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === S.lens ? 'true' : 'false'); });
    $('apm-period').value = S.period;
    var mb = $('apm-modebtn'); if (mb) { mb.textContent = S.mode === '3d' ? '3D view' : '2D map'; mb.setAttribute('aria-pressed', S.mode === '3d' ? 'true' : 'false'); mb.title = S.mode === '3d' ? 'Switch to the flat 2D map' : 'Switch to the 3D view'; }
    app.classList.toggle('is3d', is3D());
    $('apm-play').textContent = S.playing ? '❚❚ Pause' : '▶ Play';
    var c = '<button data-act=\'crumb\' data-v=\'all\'>Airport</button>';
    if (S.scope !== 'all') c += ' / <button data-act=\'crumb\' data-v=\'' + S.scope + '\'>' + esc(SCOPES[S.scope].label) + '</button>';
    if (S.zone) c += ' / <button data-act=\'crumb\' data-v=\'zone\'>' + esc(S.zone) + '</button>';
    var su = S.selected && S.byCode[S.selected];
    if (su) c += ' / <b>' + esc(su.name) + '</b>';
    if (S.selAsset) c += ' / <b>' + esc(S.selAsset) + '</b>';
    if (S.selProject) { var sp = projById(S.selProject); if (sp) c += ' / <b>' + esc(sp.name) + '</b>'; }
    var pb = $('apm-projbtn'); if (pb) pb.setAttribute('aria-pressed', S.showProjects ? 'true' : 'false');
    renderPFilter(); renderStory();
    $('apm-crumbs').innerHTML = c;
    var scn = '';
    if (S.edits.length || S.busy) {
      var cur = totals(function () { return true; }).profit;
      var delta = S.baseline !== null && S.baselinePeriod === S.period ? cur - S.baseline : null;
      scn = '<div class=\'apm-chip scn' + (S.busy || S.stale ? ' busy' : '') + '\'><span class=\'dot\'></span>' +
        (S.busy || S.stale ? 'Pigment is recalculating…' : 'Scenario: ' + S.edits.length + ' change' + (S.edits.length === 1 ? '' : 's') + (delta === null ? '' : ' · <b class=\'' + (delta >= 0 ? 'up' : 'dn') + '\'>' + money(delta, { sign: true }) + '</b> profit')) +
        (S.edits.length && !S.busy ? ' <button class=\'apm-btn\' data-act=\'reset\' style=\'padding:2px 8px\'>Undo all</button>' : '') + '</div>';
    }
    $('apm-scn').innerHTML = scn;
    var st = $('apm-state');
    if (S.error) { st.hidden = false; st.innerHTML = '<div><b>Could not load data.</b><br>' + esc(S.error) + '<br><small>Check the Frame bindings in Pigment.</small></div>'; }
    else if (!built || !S.ready.kpis) { st.hidden = false; st.innerHTML = '<div>Loading the airport model…</div>'; }
    else st.hidden = true;
    var mo = $('apm-month');
    var p = periodObj();
    mo.hidden = !(S.playing || p.months.length === 1);
    mo.textContent = p.months.length === 1 ? p.months[0].toUpperCase() : '';
  }

  // ------------------------------------------------------------ side panel
  function rowBtn(u, value, extra, barPct, barColor) {
    return '<button class=\'apm-row\' data-act=\'select\' data-v=\'' + esc(u.code) + '\'><span>' + esc(u.name) + '<small>' + esc(extra) + '</small></span><b>' + value + '</b>' +
      (barPct !== undefined ? '<div class=\'apm-bar\'><i style=\'width:' + Math.max(2, Math.min(100, barPct)) + '%;background:' + barColor + '\'></i></div>' : '') + '</button>';
  }

  function renderInsights() {
    var list = S.units.filter(inScope).filter(function (u) { return unitData(u.code); });
    var by = function (f) { return list.slice().sort(function (a, b) { return f(b) - f(a); }); };
    var P = function (u) { return unitData(u.code).profit; };
    var top = by(P).slice(0, 5);
    var maxTop = top.length ? Math.abs(P(top[0])) : 1;
    var losers = by(function (u) { return -P(u); }).filter(function (u) { return P(u) < 0; }).slice(0, 5);
    var mags = list.filter(function (u) { return onMag(u, unitData(u.code)); });
    var expiring = list.filter(function (u) { var m = monthsUntil(u.lease); return m !== null && m <= 12; });
    var atRisk = 0;
    var nM = periodObj().months.length;
    expiring.forEach(function (u) { atRisk += unitData(u.code).profit * 12 / nM; });
    // zone variance
    var zones = {};
    list.forEach(function (u) { var d = unitData(u.code), z = zones[u.zone] = zones[u.zone] || { p: 0, b: 0 }; z.p += d.profit; z.b += d.budget; });
    var zl = Object.keys(zones).map(function (k) { return { k: k, v: zones[k].b ? (zones[k].p - zones[k].b) / Math.abs(zones[k].b) : 0, d: zones[k].p - zones[k].b }; }).sort(function (a, b) { return a.v - b.v; });

    var h = '<div class=\'apm-sec\'><h2 class=\'apm-h\'>Insights · ' + esc(scopeLabel()) + ' · ' + esc(periodObj().label) + '</h2>' +
      '<p class=\'apm-note\' style=\'margin:0\'>Click any unit on the map, or a row below, to drill in. Click a pier or zone to zoom.</p></div>';

    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Variance to budget by zone</h3><div class=\'apm-list\'>' + zl.map(function (z) {
      var w = Math.min(100, Math.abs(z.v) * 250);
      return '<button class=\'apm-row\' data-act=\'zone\' data-v=\'' + esc(z.k) + '\'><span>' + esc(z.k) + '<small>' + money(z.d, { sign: true }) + '</small></span><b class=\'' + (z.v >= 0 ? 'up' : 'dn') + '\'>' + pct(z.v, true) + '</b><div class=\'apm-bar\'><i style=\'width:' + Math.max(2, w) + '%;background:' + (z.v >= 0 ? '#4f9fd4' : '#f87171') + '\'></i></div></button>';
    }).join('') + '</div></div>';

    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Biggest profit pools</h3><div class=\'apm-list\'>' +
      top.map(function (u) { return rowBtn(u, money(P(u)), u.zone, Math.abs(P(u)) / maxTop * 100, '#4f9fd4'); }).join('') + '</div></div>';

    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Loss-making units (' + list.filter(function (u) { return P(u) < 0; }).length + ')</h3><div class=\'apm-list\'>' +
      (losers.length ? losers.map(function (u) { return rowBtn(u, money(P(u)), u.category); }).join('') : '<p class=\'apm-note\' style=\'margin:0\'>No loss-making units in this area.</p>') + '</div></div>';

    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Watch list</h3>' +
      '<div class=\'apm-flag\'><i style=\'background:' + STATUS.serious + '\'>!</i><div><b>' + expiring.length + (expiring.length === 1 ? ' lease ends' : ' leases end') + ' within 12 months</b><br>' + money(atRisk) + ' of annualised profit to renew or re-let. <button class=\'apm-btn\' data-act=\'lens\' data-v=\'lease\' style=\'padding:1px 8px;margin-top:4px\'>Show on map</button></div></div>' +
      '<div class=\'apm-flag\'><i style=\'background:' + STATUS.warning + '\'>' + CONFIG.currency + '</i><div><b>' + mags.length + ' tenant' + (mags.length === 1 ? '' : 's') + ' paying only the minimum guarantee</b><br>' +
      (mags.length ? mags.slice(0, 3).map(function (u) { return '<button class=\'apm-btn\' data-act=\'select\' data-v=\'' + esc(u.code) + '\' style=\'padding:1px 8px;margin:4px 4px 0 0\'>' + esc(u.name) + '</button>'; }).join('') : 'All tenants are trading above their guarantee.') + '</div></div></div>';
    if (S.projects.length && !S.showProjects) { var pt = 0; S.projects.forEach(function (p) { pt += p.forecast; }); h += '<div class=\'apm-sec\'><div class=\'apm-flag\' style=\'margin:0\'><i style=\'background:#fab219\'>⚒</i><div><b>' + S.projects.length + ' capital projects · ' + money(pt) + '</b><br>Upcoming works, costs and timelines. <button class=\'apm-btn\' data-act=\'projects\' style=\'padding:1px 8px;margin-top:4px\'>Show on map</button></div></div></div>'; }
    if (S.showProjects) h = h.replace('<div class=\'apm-sec\'><h3 class=\'apm-h\'>Variance', programmeHtml() + '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Variance');
    h += '<div class=\'apm-sec\'><p class=\'apm-note\' style=\'margin:0\'>Layout is a schematic of the real terminal arrangement. Passenger totals are set to public scale; every unit-level sales, cost and profit figure is invented for this demo.</p></div>';
    $('apm-side').innerHTML = h;
  }

  function trendSvg(t) {
    if (!t) return '<p class=\'apm-note\'>Loading monthly trend…</p>';
    var W = 340, H = 150, padL = 44, padR = 6, padT = 10, padB = 22;
    var vals = t.profit.concat(t.budget).filter(function (v) { return v !== null; });
    var max = Math.max.apply(null, vals.concat([0])), min = Math.min.apply(null, vals.concat([0]));
    if (max === min) max = min + 1;
    var span = max - min; max += span * 0.06; if (min < 0) min -= span * 0.06;
    var y = function (v) { return padT + (max - v) / (max - min) * (H - padT - padB); };
    var bw = (W - padL - padR) / 12;
    var s = '<svg viewBox=\'0 0 ' + W + ' ' + H + '\' role=\'img\' aria-label=\'Monthly profit against budget\'>';
    s += '<defs><pattern id=\'apm-fc\' width=\'4\' height=\'4\' patternUnits=\'userSpaceOnUse\' patternTransform=\'rotate(45)\'><rect width=\'4\' height=\'4\' fill=\'#174470\'/><line x1=\'0\' y1=\'0\' x2=\'0\' y2=\'4\' stroke=\'#6fbbe6\' stroke-width=\'1.5\'/></pattern></defs>';
    var ticks = [max, (max + min) / 2, min];
    if (min < 0 && max > 0) ticks = [max, 0, min];
    ticks.forEach(function (v) { s += '<line x1=\'' + padL + '\' x2=\'' + (W - padR) + '\' y1=\'' + y(v) + '\' y2=\'' + y(v) + '\' stroke=\'rgba(255,255,255,' + (v === 0 ? '.25' : '.07') + ')\'/><text x=\'' + (padL - 6) + '\' y=\'' + (y(v) + 3) + '\' fill=\'#62809d\' font-size=\'9\' text-anchor=\'end\'>' + money(v) + '</text>'; });
    t.profit.forEach(function (v, i) {
      if (v === null) return;
      var x = padL + i * bw + 3, top = y(Math.max(v, 0)), bot = y(Math.min(v, 0));
      var fill = i > LAST_ACTUAL ? 'url(#apm-fc)' : (v >= 0 ? '#4f9fd4' : '#f87171');
      s += '<rect x=\'' + x + '\' y=\'' + top + '\' width=\'' + (bw - 6) + '\' height=\'' + Math.max(1, bot - top) + '\' rx=\'2\' fill=\'' + fill + '\'/>';
    });
    var pts = t.budget.map(function (v, i) { return (padL + i * bw + bw / 2) + ',' + y(v || 0); }).join(' ');
    s += '<polyline points=\'' + pts + '\' fill=\'none\' stroke=\'#fbbf24\' stroke-width=\'2\' stroke-dasharray=\'4 3\' stroke-linejoin=\'round\'/>';
    t.budget.forEach(function (v, i) { s += '<circle cx=\'' + (padL + i * bw + bw / 2) + '\' cy=\'' + y(v || 0) + '\' r=\'2.5\' fill=\'#fbbf24\' stroke=\'#021b36\' stroke-width=\'1\'/>'; });
    MONTHS.forEach(function (m, i) {
      s += '<text x=\'' + (padL + i * bw + bw / 2) + '\' y=\'' + (H - 6) + '\' fill=\'' + (i > LAST_ACTUAL ? '#3a5878' : '#62809d') + '\' font-size=\'9\' text-anchor=\'middle\'>' + m[0] + '</text>';
      s += '<rect class=\'apm-hit\' data-m=\'' + i + '\' x=\'' + (padL + i * bw) + '\' y=\'' + padT + '\' width=\'' + bw + '\' height=\'' + (H - padT - padB) + '\' fill=\'transparent\'/>';
    });
    return s + '</svg>';
  }

  function waterfall(d) {
    var items = [['Concession / operating income', d.conc, 1], ['Service charge recovery', d.other, 1], ['Direct costs', -d.direct, 0], ['Space cost (security, cleaning, utilities)', -d.alloc, 0]];
    var max = Math.max(d.conc + d.other, d.direct + d.alloc, Math.abs(d.profit), 1);
    var h = '<div class=\'apm-list\'>';
    items.forEach(function (it) {
      if (!it[1]) return;
      h += '<div class=\'apm-row\' style=\'cursor:default\'><span>' + esc(it[0]) + '</span><b>' + money(it[1], { sign: true }) + '</b><div class=\'apm-bar\'><i style=\'width:' + Math.abs(it[1]) / max * 100 + '%;background:' + (it[2] ? '#4f9fd4' : '#7f3446') + '\'></i></div></div>';
    });
    h += '<div class=\'apm-row\' style=\'cursor:default;border-top:1px solid rgba(255,255,255,.1);border-radius:0;padding-top:8px\'><span><b>Airport profit</b></span><b class=\'' + (d.profit >= 0 ? 'up' : 'dn') + '\'>' + money(d.profit) + '</b></div>';
    return h + '</div>';
  }

  function explain(u, d) {
    var out = [];
    var n = periodObj().months.length;
    if (d.profit < 0) out.push([STATUS.critical, '−', '<b>Loss-making.</b> Space costs of ' + money(d.alloc) + ' outweigh income of ' + money(d.conc + d.other) + '.']);
    if (onMag(u, d)) out.push([STATUS.warning, CONFIG.currency, '<b>Paying the minimum guarantee.</b> Sales of ' + money(d.sales) + ' earn ' + money(d.sales * d.rate) + ' at ' + pct(d.rate) + ', below the ' + money(u.mag * n / 12) + ' guarantee. Tenant may ask to renegotiate.']);
    var vb = d.budget ? (d.profit - d.budget) / Math.abs(d.budget) : 0;
    var pv = d.bpax ? d.pax / d.bpax - 1 : 0;
    if (vb < -0.12) out.push([STATUS.serious, '↓', '<b>' + pct(vb, true) + ' vs budget.</b> ' + (pv < -0.1 ? 'Passengers walking past are down ' + pct(-pv) + ' on budget' + (u.gate ? ' (nearest gate ' + esc(u.gate) + ')' : '') + '.' : 'Spend per passenger is below plan.')]);
    if (vb > 0.12) out.push(['#4f9fd4', '↑', '<b>' + pct(vb, true) + ' vs budget.</b> ' + (pv > 0.1 ? 'Passengers walking past are up ' + pct(pv) + ' on budget.' : 'Trading ahead of plan.')]);
    var ml = monthsUntil(u.lease);
    if (ml !== null && ml <= 12) out.push([STATUS.serious, '⏱', '<b>Lease ends ' + fmtDate(u.lease) + '</b> (' + Math.max(ml, 0) + ' months). ' + money(d.profit * 12 / n) + ' of annual profit to secure.']);
    // rank on profit / m2 within group
    var grp = CAT_GROUP[u.category];
    var peers = S.units.filter(function (x) { return CAT_GROUP[x.category] === grp && unitData(x.code); }).sort(function (a, b) { return unitData(b.code).profit / b.area - unitData(a.code).profit / a.area; });
    var rank = peers.indexOf(u) + 1;
    if (peers.length > 2) out.push(['#9085e9', '#', 'Ranks <b>' + rank + ' of ' + peers.length + '</b> in ' + esc(grp) + ' on profit per m².']);
    return out.map(function (f) { return '<div class=\'apm-flag\'><i style=\'background:' + f[0] + '\'>' + f[1] + '</i><div>' + f[2] + '</div></div>'; }).join('');
  }

  function renderDetail() {
    var u = S.byCode[S.selected];
    var d = unitData(u.code);
    if (!d) { $('apm-side').innerHTML = '<div class=\'apm-sec\'>Loading…</div>'; return; }
    var vb = d.budget ? (d.profit - d.budget) / Math.abs(d.budget) : null;
    var h = '<div class=\'apm-sec\'><button class=\'apm-close\' data-act=\'deselect\' aria-label=\'Close unit details\'>✕</button>' +
      '<h2 class=\'apm-name\'>' + esc(u.name) + '</h2>' +
      '<div class=\'apm-meta\'><span class=\'apm-pill apm-code\'>' + esc(u.code) + '</span><span class=\'apm-pill\'>' + esc(u.category) + '</span><span class=\'apm-pill\'>' + esc(u.zone) + '</span><span class=\'apm-pill\'>' + num(u.area) + ' m²</span>' + (u.gate ? '<span class=\'apm-pill\'>Gate ' + esc(u.gate) + '</span>' : '') + '</div>' +
      '<p class=\'apm-note\'>' + esc(u.tenant) + ' · ' + esc(u.model) + (u.lease ? ' · lease to ' + fmtDate(u.lease) : '') + '</p></div>';
    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Airport profit · ' + esc(periodObj().label) + '</h3><div class=\'apm-big\'><b class=\'' + (d.profit >= 0 ? '' : 'dn') + '\'>' + money(d.profit) + '</b><span class=\'' + (vb >= 0 ? 'up' : 'dn') + '\'>' + pct(vb, true) + ' vs budget (' + money(d.budget) + ')</span></div>' + explain(u, d) + '</div>';
    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Profit bridge</h3>' + waterfall(d) + '</div>';
    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Trading</h3><div class=\'apm-grid\'>' +
      '<div><small>Tenant sales</small><b>' + money(d.sales) + '</b></div>' +
      '<div><small>Transactions</small><b>' + num(d.tx) + '</b></div>' +
      '<div><small>Passengers walking past</small><b>' + num(d.pax) + '</b></div>' +
      '<div><small>Conversion</small><b>' + pct(d.pax ? d.tx / d.pax : null) + '</b></div>' +
      '<div><small>Spend per passenger</small><b>' + (d.pax ? money(d.sales / d.pax) : '—') + '</b></div>' +
      '<div><small>Profit per m²</small><b>' + money(d.profit / u.area) + '</b></div>' +
      '<div><small>Revenue share</small><b>' + (d.rate === null || d.rate === undefined ? 'n/a' : pct(d.rate)) + '</b></div>' +
      '<div><small>Minimum guarantee</small><b>' + (u.mag ? money(u.mag) + '/yr' : 'n/a') + '</b></div></div></div>';
    h += '<div class=\'apm-sec apm-chart\'><h3 class=\'apm-h\'>2026 profit by month <span style=\'text-transform:none;letter-spacing:0;color:#9cb3c9\'>· bars actual, hatched forecast, <span style=\'color:#fbbf24\'>line budget</span></span></h3><div id=\'apm-trend\'>' + trendSvg(S.trend && S.trend.code === u.code ? S.trend : null) + '</div></div>';
    if (u.model === 'Airport-operated') {
      h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>What if</h3><p class=\'apm-note\' style=\'margin:0\'>This unit is run by the airport. Model tariffs and staffing in the operational planning app; this map picks up the result.</p></div>';
    } else {
      var rate = d.rate || 0;
      var opts = RETENANT.map(function (c) { return '<option' + (c === u.category ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
      h += '<div class=\'apm-sec\'><h3 class=\'apm-h apm-wih\'>⚡ What if · writes to Pigment</h3><div class=\'apm-whatif\'>' +
        '<div class=\'apm-field\'><label for=\'apm-rate\'><span>Revenue share to airport</span><b id=\'apm-rate-v\'>' + pct(rate) + '</b></label><input id=\'apm-rate\' type=\'range\' min=\'0.05\' max=\'0.45\' step=\'0.01\' value=\'' + rate + '\'></div>' +
        (u.model === 'Concession' ? '<div class=\'apm-field\'><label for=\'apm-cat\'><span>Re-let the unit as</span></label><select id=\'apm-cat\' class=\'apm-select\'>' + opts + '</select></div>' : '') +
        '<div class=\'apm-actions\'><button class=\'apm-btn primary\' data-act=\'apply\'' + (S.busy ? ' disabled' : '') + '>Apply and recalculate</button></div>' +
        '<p class=\'apm-note\'>Updates the Revenue Share metric and the Unit list in Pigment. The whole map recalculates.</p></div></div>';
    }
    $('apm-side').innerHTML = h;
  }

  // ======================================================= ASSETS & PROJECTS
  var AC = { aero: 'Aero Revenue', comm: 'Commercial Revenue', prop: 'Property & Other Revenue', staff: 'Staff Costs', maint: 'Maintenance', util: 'Utilities', other: 'Other Opex', dep: 'Depreciation', ebitda: 'EBITDA', op: 'Operating Profit', bebitda: 'Budget EBITDA', pax: 'Passengers', mov: 'Movements', utl: 'Utilisation', avail: 'Availability', sla: 'Service Level', cond: 'Condition Score' };
  var PSTAT = { 'In delivery': '#fab219', 'Approved': '#c084fc', 'Design': '#2dd4bf', 'Proposed': '#94a3b8', 'Complete': '#4fb3ff' };
  var PTYPES = ['Asset renewal', 'Capacity', 'Commercial', 'Sustainability', 'Enabling'];
  var PSTATUSES = ['In delivery', 'Approved', 'Design', 'Proposed'];
  var PM0 = 2024, NOW_YM = (2026 - PM0) * 12 + 9.9;
  function ym(s) { var p = String(s || '').split('-'); return (Number(p[0]) - PM0) * 12 + (Number(p[1]) - 1); }
  function ymLabel(i) { var y = PM0 + Math.floor(i / 12), m = Math.round(i % 12); return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] + ' ' + y; }
  function parseProject(id, o) {
    var phases = String(o.phases || '').split('|').filter(Boolean).map(function (s) { var q = s.split(':'); return { name: q[0], s: ym(q[1]), e: ym(q[2]) + 1 }; });
    var line = String(o.line || ''), shp = String(o.shape || '');
    var p = {
      id: id, name: o.name, type: o.type, status: o.status, sponsor: o.sponsor || '',
      box: shp ? shape(shp) : null, line: line ? line.split(',').map(Number) : null, asset: o.asset || '',
      budget: Number(o.budget) || 0, forecast: Number(o.forecast) || 0, spent: Number(o.spent) || 0, pct: Number(o.pct) || 0,
      phases: phases, affected: String(o.affected || '').split(',').filter(Boolean), revImpact: Number(o.risk) || 0,
      benefits: o.benefits || '', risks: o.risks || '', desc: o.desc || ''
    };
    p.s = phases.length ? phases[0].s : 0; p.e = phases.length ? phases[phases.length - 1].e : 0;
    if (!p.box && p.line) { var L = p.line; p.box = { x: Math.min(L[0], L[2]), y: Math.min(L[1], L[3]), w: Math.abs(L[2] - L[0]), h: Math.abs(L[3] - L[1]) }; }
    return p;
  }
  function projVisible(p) {
    if (!S.showProjects) return false;
    if (Object.keys(S.pf.types).length && !S.pf.types[p.type]) return false;
    if (Object.keys(S.pf.statuses).length && !S.pf.statuses[p.status]) return false;
    if (S.pf.month !== null && !(p.s <= S.pf.month && S.pf.month < p.e)) return false;
    return true;
  }
  function phaseAt(p, t) { for (var i = 0; i < p.phases.length; i++) if (p.phases[i].s <= t && t < p.phases[i].e) return p.phases[i].name; return t < p.s ? 'Not started' : 'Complete'; }
  function assetData(id) { return S.akpi[id] || null; }
  function assetByName(id) { return S.assetBy[id] || null; }
  function assetBox(id) {
    var b0 = null;
    S.features.forEach(function (f) {
      if (f.asset !== id) return;
      var b = f.type === 'runwayline' ? { x: Math.min(f.line[0], f.line[2]), y: Math.min(f.line[1], f.line[3]), w: Math.abs(f.line[2] - f.line[0]), h: Math.abs(f.line[3] - f.line[1]) } : f.type === 'poi' ? { x: f.box.x - 60, y: f.box.y - 60, w: 120, h: 120 } : f.type === 'gate' ? { x: f.box.x - 30, y: f.box.y - 30, w: 60, h: 60 } : f.box;
      if (!b0) b0 = { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h }; else { b0.x0 = Math.min(b0.x0, b.x); b0.y0 = Math.min(b0.y0, b.y); b0.x1 = Math.max(b0.x1, b.x + b.w); b0.y1 = Math.max(b0.y1, b.y + b.h); }
    });
    return b0 ? { x: b0.x0, y: b0.y0, w: b0.x1 - b0.x0, h: b0.y1 - b0.y0 } : null;
  }
  function clearSel() { S.selected = null; S.selAsset = null; S.selProject = null; }
  function flyBox(b, min) { var w = Math.max(b.w * 1.6, min || 420), h = Math.max(b.h * 1.6, w * 0.55); animateTo({ x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w: w, h: h }); }
  function selectAsset(id, fly) {
    var a = assetByName(id); if (!a) return;
    clearSel(); S.selAsset = id;
    if (fly) { var b = assetBox(id); if (b) flyBox(b, a.type === 'Aircraft stand' ? 360 : 480); }
    S.trend = assetTrend(id);
    renderAll();
  }
  function selectProject(id, fly) {
    var p = S.projects.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    clearSel(); S.selProject = id;
    if (!S.showProjects) S.showProjects = true;
    if (!projVisible(p)) { S.pf.types = {}; S.pf.statuses = {}; S.pf.month = null; }
    if (fly && p.box) flyBox(p.box, p.line ? 1600 : 520);
    S.pspend = projectSpend(p);
    renderAll();
  }
  function programmeTotals() {
    var t = { n: 0, budget: 0, forecast: 0, spent: 0, risk: 0, live: 0 };
    S.projects.forEach(function (p) { if (!projVisible(p)) return; t.n++; t.budget += p.budget; t.forecast += p.forecast; t.spent += p.spent; t.risk += p.revImpact; if (p.status === 'In delivery') t.live++; });
    return t;
  }

  // ---------------------------------------------------------------- panels
  function pill(text, color) { return '<span class=\'apm-pill\' style=\'border-color:' + color + ';color:' + color + '\'>' + esc(text) + '</span>'; }
  function tile(label, value, state) { return '<div><small>' + esc(label) + '</small><b' + (state ? ' class=\'' + state + '\'' : '') + '>' + value + '</b></div>'; }
  function ganttSvg(list, opts) {
    opts = opts || {};
    var W = 340, rowH = opts.rowH || 18, padL = opts.padL || 0, top = 18, H = top + list.length * rowH + 6;
    var t0 = (2025 - PM0) * 12, t1 = (2030 - PM0) * 12, X = function (t) { return padL + (Math.max(t0, Math.min(t1, t)) - t0) / (t1 - t0) * (W - padL - 4); };
    var s = '<svg viewBox=\'0 0 ' + W + ' ' + H + '\' role=\'img\' aria-label=\'Project timeline\'>';
    for (var y = 2025; y <= 2029; y++) { var x = X((y - PM0) * 12); s += '<line x1=\'' + x + '\' x2=\'' + x + '\' y1=\'12\' y2=\'' + H + '\' stroke=\'rgba(255,255,255,.07)\'/><text x=\'' + (x + 3) + '\' y=\'10\' fill=\'#62809d\' font-size=\'9\'>' + y + '</text>'; }
    list.forEach(function (r, i) {
      var y0 = top + i * rowH;
      if (r.label) s += '<text x=\'' + (padL - 6) + '\' y=\'' + (y0 + rowH / 2 + 3) + '\' fill=\'#9cb3c9\' font-size=\'9.5\' text-anchor=\'end\'>' + esc(r.label) + '</text>';
      r.bars.forEach(function (b) { s += '<rect x=\'' + X(b.s) + '\' y=\'' + (y0 + 3) + '\' width=\'' + Math.max(2, X(b.e) - X(b.s)) + '\' height=\'' + (rowH - 6) + '\' rx=\'3\' fill=\'' + b.c + '\'' + (r.id ? ' data-act=\'proj\' data-v=\'' + esc(r.id) + '\' style=\'cursor:pointer\'' : '') + '><title>' + esc(b.t || '') + '</title></rect>'; });
    });
    var nx = X(NOW_YM); s += '<line x1=\'' + nx + '\' x2=\'' + nx + '\' y1=\'12\' y2=\'' + H + '\' stroke=\'#8fd0f2\' stroke-width=\'1.5\'/><text x=\'' + (nx + 3) + '\' y=\'' + (H - 2) + '\' fill=\'#8fd0f2\' font-size=\'8.5\'>today</text>';
    if (S.pf.month !== null) { var mx = X(S.pf.month + 0.5); s += '<line x1=\'' + mx + '\' x2=\'' + mx + '\' y1=\'12\' y2=\'' + H + '\' stroke=\'#eef4f9\' stroke-dasharray=\'3 3\'/>'; }
    return s + '</svg>';
  }
  var PHASE_C = { 'Design': '#2dd4bf', 'Procurement': '#c084fc', 'Construction': '#fab219', 'Commissioning': '#4fb3ff' };
  function scurveSvg(sp) {
    if (!sp) return '<p class=\'apm-note\'>Loading spend profile…</p>';
    var W = 340, H = 140, padL = 44, padB = 18, padT = 8, n = sp.plan.length;
    var max = 1; ['plan', 'act', 'fc'].forEach(function (k) { sp[k].forEach(function (v) { if (v !== null) max = Math.max(max, v); }); });
    var t0 = 12, t1 = n - 1, X = function (i) { return padL + (i - t0) / (t1 - t0) * (W - padL - 4); }, Y = function (v) { return padT + (1 - v / max) * (H - padT - padB); };
    var s = '<svg viewBox=\'0 0 ' + W + ' ' + H + '\' role=\'img\' aria-label=\'Cumulative spend: planned, actual and forecast\'>';
    [0, max / 2, max].forEach(function (v) { s += '<line x1=\'' + padL + '\' x2=\'' + (W - 4) + '\' y1=\'' + Y(v) + '\' y2=\'' + Y(v) + '\' stroke=\'rgba(255,255,255,.07)\'/><text x=\'' + (padL - 5) + '\' y=\'' + (Y(v) + 3) + '\' fill=\'#62809d\' font-size=\'9\' text-anchor=\'end\'>' + money(v) + '</text>'; });
    for (var y = 2025; y <= 2029; y++) { var xx = X((y - PM0) * 12); s += '<text x=\'' + xx + '\' y=\'' + (H - 5) + '\' fill=\'#62809d\' font-size=\'9\' text-anchor=\'middle\'>' + y + '</text>'; }
    var path = function (arr, from) { var d = ''; arr.forEach(function (v, i) { if (v === null || i < from) return; d += (d ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); }); return d; };
    s += '<path d=\'' + path(sp.plan, t0) + '\' fill=\'none\' stroke=\'#62809d\' stroke-width=\'1.5\' stroke-dasharray=\'4 3\'/>';
    s += '<path d=\'' + path(sp.fc, t0) + '\' fill=\'none\' stroke=\'#fab219\' stroke-width=\'2\' stroke-dasharray=\'5 3\'/>';
    s += '<path d=\'' + path(sp.act, t0) + '\' fill=\'none\' stroke=\'#fab219\' stroke-width=\'2.5\'/>';
    var nx = X(Math.floor(NOW_YM)); s += '<line x1=\'' + nx + '\' x2=\'' + nx + '\' y1=\'' + padT + '\' y2=\'' + (H - padB) + '\' stroke=\'rgba(143,208,242,.5)\'/>';
    return s + '</svg><p class=\'apm-note\' style=\'margin:4px 0 0\'><span style=\'color:#62809d\'>- - planned</span> · <span style=\'color:#fab219\'>— actual</span> · <span style=\'color:#fab219\'>- - forecast</span></p>';
  }
  var ASSET_KPI_LABEL = {
    pax: { 'Transport interchange': 'Rail and tram passengers', 'Walkway': 'Footfall', 'Security': 'Passengers screened', _: 'Departing passengers' },
    mov: { 'Cargo': 'Cargo tonnes', _: 'Aircraft movements' },
    utl: { 'Hotel': 'Room occupancy', 'Cargo': 'Warehouse occupancy', _: 'Utilisation' },
    avail: { _: 'Availability' }, sla: { _: 'Security queue under 15 min' }, cond: { 'Runway': 'Pavement condition', _: 'Condition score' }
  };
  function assetFlags(a, d) {
    var out = [];
    var proj = S.projects.filter(function (p) { return p.asset === a.id || (a.type === 'Aircraft stand' && p.asset === a.pier && /air-bridge/i.test(p.name) && /P1·(7|8|9|10)$/.test(a.id)); });
    if (d.avail !== null && d.avail < 0.9) out.push([STATUS.critical, '!', '<b>Availability ' + pct(d.avail) + '.</b> ' + (proj.length ? 'Out of service for ' + esc(proj[0].name) + '.' : 'Below the 95% target.')]);
    if (d.sla !== null && d.sla < 0.9) out.push([STATUS.serious, '⏱', '<b>Only ' + pct(d.sla) + ' of passengers clear security within 15 minutes</b>, against a 95% target. Queues grew after Terminal 1 closed.']);
    if (d.cond !== null && d.cond < 3) out.push([STATUS.serious, '⚒', '<b>Condition ' + d.cond.toFixed(1) + ' / 5.</b> ' + (proj.length ? esc(proj[0].name) + ' is ' + proj[0].status.toLowerCase() + '.' : 'Renewal needed.')]);
    var vb = d.bebitda ? (d.ebitda - d.bebitda) / Math.abs(d.bebitda) : null;
    if (vb !== null && Math.abs(vb) > 0.06) out.push([vb > 0 ? '#4f9fd4' : STATUS.serious, vb > 0 ? '↑' : '↓', '<b>EBITDA ' + pct(vb, true) + ' vs budget.</b>' + (a.terminal === 'T2' && vb > 0 ? ' More passengers moved here from Terminal 1 than planned.' : a.terminal === 'T3' && vb < 0 ? ' Fewer passengers moved here from Terminal 1 than planned.' : '')]);
    return { flags: out.map(function (f) { return '<div class=\'apm-flag\'><i style=\'background:' + f[0] + '\'>' + f[1] + '</i><div>' + f[2] + '</div></div>'; }).join(''), proj: proj };
  }
  function renderAsset() {
    var a = assetByName(S.selAsset), d = assetData(S.selAsset);
    if (!a || !d) { $('apm-side').innerHTML = '<div class=\'apm-sec\'><p class=\'apm-note\'>Loading asset…</p></div>'; return; }
    var rev = d.aero + d.comm + d.prop, opex = d.staff + d.maint + d.util + d.other, vb = d.bebitda ? (d.ebitda - d.bebitda) / Math.abs(d.bebitda) : null;
    var h = '<div class=\'apm-sec\'><button class=\'apm-close\' data-act=\'deselect\' aria-label=\'Close asset details\'>✕</button><h2 class=\'apm-name\'>' + esc(a.id) + '</h2>' +
      '<div class=\'apm-meta\'><span class=\'apm-pill apm-code\'>ASSET</span><span class=\'apm-pill\'>' + esc(a.type) + '</span>' + (a.terminal && a.terminal !== 'Landside' && a.terminal !== 'Airfield' ? '<span class=\'apm-pill\'>' + esc(a.terminal) + '</span>' : '') + '</div>' +
      (a.facts ? '<p class=\'apm-note\'>' + a.facts.split(' | ').map(esc).join(' · ') + '</p>' : '') + '</div>';
    var tiles = [];
    ['pax', 'mov', 'utl', 'avail', 'sla', 'cond'].forEach(function (k) {
      var v = d[k]; if (v === null || v === undefined) return;
      var lab = ASSET_KPI_LABEL[k][a.type] || ASSET_KPI_LABEL[k]._;
      var txt = k === 'pax' || k === 'mov' ? num(v) : k === 'cond' ? (a.type === 'Runway' ? Math.round(v * 20) + ' / 100' : v.toFixed(1) + ' / 5') : pct(v);
      var st = (k === 'avail' && v < 0.9) || (k === 'sla' && v < 0.9) || (k === 'cond' && v < 3) ? 'dn' : '';
      tiles.push(tile(lab, txt, st));
    });
    var fl = assetFlags(a, d);
    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Operations · ' + esc(periodObj().label) + '</h3><div class=\'apm-grid\'>' + tiles.join('') + '</div>' + fl.flags + '</div>';
    var row = function (l, v, strong, cls) { return '<div class=\'apm-row\' style=\'cursor:default\'><span>' + (strong ? '<b>' + l + '</b>' : l) + '</span><b' + (cls ? ' class=\'' + cls + '\'' : '') + '>' + money(v) + '</b></div>'; };
    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>P&amp;L · ' + esc(periodObj().label) + '</h3><div class=\'apm-list\'>' +
      (d.aero ? row('Aeronautical charges', d.aero) : '') + (d.comm ? row('Commercial income', d.comm) : '') + (d.prop ? row('Property and other income', d.prop) : '') + row('Total revenue', rev, true) +
      (d.staff ? row('Staff', -d.staff) : '') + (d.maint ? row('Maintenance', -d.maint) : '') + (d.util ? row('Utilities', -d.util) : '') + (d.other ? row('Other operating costs', -d.other) : '') + row('Operating costs', -opex, true) +
      '<div class=\'apm-row\' style=\'cursor:default;border-top:1px solid rgba(255,255,255,.1);border-radius:0;padding-top:8px\'><span><b>EBITDA</b> <small>' + (rev ? pct(d.ebitda / rev) + ' margin' : '') + '</small></span><b class=\'' + (d.ebitda >= 0 ? 'up' : 'dn') + '\'>' + money(d.ebitda) + '</b></div>' +
      (d.dep ? row('Depreciation', -d.dep) : '') + row('Operating profit', d.op, true, d.op >= 0 ? 'up' : 'dn') + '</div>' +
      (vb !== null ? '<p class=\'apm-note\'>EBITDA <span class=\'' + (vb >= 0 ? 'up' : 'dn') + '\'>' + pct(vb, true) + '</span> vs budget of ' + money(d.bebitda) + '.</p>' : '') + '</div>';
    h += '<div class=\'apm-sec apm-chart\'><h3 class=\'apm-h\'>2026 EBITDA by month <span style=\'text-transform:none;letter-spacing:0;color:#9cb3c9\'>· bars actual, <span style=\'color:#fbbf24\'>line budget</span></span></h3><div id=\'apm-trend\'>' + trendSvg(S.trend && S.trend.code === 'A:' + a.id ? S.trend : null) + '</div></div>';
    if (fl.proj.length) {
      h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Capital projects on this asset</h3><div class=\'apm-list\'>' + fl.proj.map(function (p) {
        return '<button class=\'apm-row\' data-act=\'proj\' data-v=\'' + esc(p.id) + '\'><span>' + esc(p.name) + '<small>' + esc(p.status) + ' · ' + ymLabel(p.e - 1) + '</small></span><b>' + money(p.forecast) + '</b></button>';
      }).join('') + '</div>' + ganttSvg(fl.proj.map(function (p) { return { id: p.id, bars: p.phases.map(function (ph) { return { s: ph.s, e: ph.e, c: PHASE_C[ph.name] || '#62809d', t: ph.name }; }) }; })) + '</div>';
    }
    if (a.type === 'Terminal' || a.type === 'Pier') {
      var inside = S.units.filter(function (u) { return a.type === 'Pier' ? u.zone === a.id : u.terminal === a.terminal; });
      var tp = 0; inside.forEach(function (u) { var x = unitData(u.code); if (x) tp += x.profit; });
      h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Commercial units inside</h3><p class=\'apm-note\' style=\'margin:0\'>' + inside.length + ' units earning ' + money(tp) + ' for the airport. ' +
        '<button class=\'apm-btn\' data-act=\'zone\' data-v=\'' + esc(a.type === 'Pier' ? a.id : a.terminal + ' Airside') + '\' style=\'padding:1px 8px\'>Show units</button></p></div>';
    }
    $('apm-side').innerHTML = h;
  }
  function renderProject() {
    var p = S.projects.filter(function (x) { return x.id === S.selProject; })[0];
    if (!p) { $('apm-side').innerHTML = ''; return; }
    var v = p.budget ? (p.forecast - p.budget) / p.budget : 0, c = PSTAT[p.status] || '#94a3b8';
    var h = '<div class=\'apm-sec\'><button class=\'apm-close\' data-act=\'deselect\' aria-label=\'Close project details\'>✕</button><h2 class=\'apm-name\'>' + esc(p.name) + '</h2>' +
      '<div class=\'apm-meta\'><span class=\'apm-pill apm-code\'>' + esc(p.id) + '</span>' + pill(p.status, c) + '<span class=\'apm-pill\'>' + esc(p.type) + '</span></div>' +
      '<p class=\'apm-note\'>' + esc(p.desc) + '</p><p class=\'apm-note\' style=\'margin-top:4px\'>Sponsor: ' + esc(p.sponsor) + (p.asset ? ' · Asset: <button class=\'apm-btn\' data-act=\'asset\' data-v=\'' + esc(p.asset) + '\' style=\'padding:0 6px\'>' + esc(p.asset) + '</button>' : '') + '</p></div>';
    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Cost and progress</h3><div class=\'apm-grid\'>' +
      tile('Approved budget', money(p.budget)) + tile('Forecast at completion', money(p.forecast) + ' <small class=\'' + (v > 0.005 ? 'dn' : v < -0.005 ? 'up' : '') + '\' style=\'display:inline\'>' + (Math.abs(v) > 0.005 ? pct(v, true) : 'on budget') + '</small>') +
      tile('Spent to date', money(p.spent)) + tile('Complete', pct(p.pct)) + '</div>' +
      '<div class=\'apm-bar\' style=\'margin-top:10px;height:6px\'><i style=\'width:' + Math.max(2, p.pct * 100) + '%;background:' + c + '\'></i></div>' +
      '<p class=\'apm-note\'>Now in <b>' + esc(phaseAt(p, NOW_YM)) + '</b> · ' + ymLabel(p.s) + ' to ' + ymLabel(p.e - 1) + '</p></div>';
    h += '<div class=\'apm-sec apm-chart\'><h3 class=\'apm-h\'>Timeline</h3>' + ganttSvg(p.phases.map(function (ph) { return { label: ph.name, bars: [{ s: ph.s, e: ph.e, c: PHASE_C[ph.name] || '#62809d', t: ph.name + ': ' + ymLabel(ph.s) + ' to ' + ymLabel(ph.e - 1) }] }; }), { padL: 86, rowH: 20 }) + '</div>';
    h += '<div class=\'apm-sec apm-chart\'><h3 class=\'apm-h\'>Cumulative spend</h3>' + scurveSvg(S.pspend && S.pspend.id === p.id ? S.pspend : null) + '</div>';
    var aff = p.affected.map(function (code) { return S.byCode[code]; }).filter(Boolean);
    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Commercial impact during works</h3>' +
      (aff.length ? '<div class=\'apm-list\'>' + aff.map(function (u) { var x = unitData(u.code); return rowBtn(u, x ? money(x.profit) : '—', u.category); }).join('') + '</div>' : '<p class=\'apm-note\' style=\'margin:0\'>No commercial units disrupted.</p>') +
      (p.revImpact ? '<div class=\'apm-flag\'><i style=\'background:' + STATUS.serious + '\'>£</i><div><b>' + money(p.revImpact) + ' of revenue at risk</b> while works are on site.</div></div>' : '') + '</div>';
    h += '<div class=\'apm-sec\'><h3 class=\'apm-h\'>Benefits</h3><p class=\'apm-note\' style=\'margin:0;color:#eef4f9\'>' + esc(p.benefits) + '</p><h3 class=\'apm-h\' style=\'margin-top:12px\'>Key risks</h3><p class=\'apm-note\' style=\'margin:0\'>' + esc(p.risks) + '</p></div>';
    $('apm-side').innerHTML = h;
  }
  function programmeHtml() {
    var t = programmeTotals(), vis = S.projects.filter(projVisible).sort(function (a, b) { return a.s - b.s; });
    var h = '<div class=\'apm-sec\'><h2 class=\'apm-h\'>Capital programme' + (S.pf.month !== null ? ' · active ' + ymLabel(S.pf.month) : '') + '</h2><div class=\'apm-grid\'>' +
      tile('Projects shown', t.n + ' <small style=\'display:inline\'>(' + t.live + ' on site)</small>') + tile('Forecast cost', money(t.forecast)) + tile('Spent to date', money(t.spent)) + tile('Revenue at risk', money(t.risk), t.risk ? 'dn' : '') + '</div></div>';
    h += '<div class=\'apm-sec apm-chart\'><h3 class=\'apm-h\'>Programme timeline</h3>' + (vis.length ? ganttSvg(vis.map(function (p) { return { id: p.id, label: p.name.length > 22 ? p.name.slice(0, 21) + '…' : p.name, bars: [{ s: p.s, e: p.e, c: PSTAT[p.status], t: p.name + ' · ' + p.status }] }; }), { padL: 118, rowH: 18 }) : '<p class=\'apm-note\'>No projects match the filters.</p>') + '</div>';
    h += '<div class=\'apm-sec\'><div class=\'apm-list\'>' + vis.map(function (p) {
      var v = p.budget ? (p.forecast - p.budget) / p.budget : 0;
      return '<button class=\'apm-row\' data-act=\'proj\' data-v=\'' + esc(p.id) + '\'><span><i style=\'display:inline-block;width:8px;height:8px;border-radius:2px;background:' + PSTAT[p.status] + ';margin-right:6px\'></i>' + esc(p.name) + '<small>' + esc(p.type) + ' · ' + ymLabel(p.e - 1) + '</small></span><b class=\'' + (v > 0.005 ? 'dn' : '') + '\'>' + money(p.forecast) + '</b></button>';
    }).join('') + '</div></div>';
    return h;
  }
  function renderPFilter() {
    var el = $('apm-pfilter'); if (!el) return;
    el.hidden = !S.showProjects;
    if (!S.showProjects) return;
    var chip = function (kind, v, on, color) { return '<button class=\'apm-fchip' + (on ? ' on' : '') + '\' data-act=\'pf\' data-k=\'' + kind + '\' data-v=\'' + esc(v) + '\' aria-pressed=\'' + on + '\'>' + (color ? '<i style=\'background:' + color + '\'></i>' : '') + esc(v) + '</button>'; };
    var t = programmeTotals();
    el.innerHTML = '<div class=\'apm-frow\'><span class=\'apm-flab\'>Type</span>' + PTYPES.map(function (x) { return chip('type', x, !!S.pf.types[x]); }).join('') + '</div>' +
      '<div class=\'apm-frow\'><span class=\'apm-flab\'>Status</span>' + PSTATUSES.map(function (x) { return chip('status', x, !!S.pf.statuses[x], PSTAT[x]); }).join('') + '</div>' +
      '<div class=\'apm-frow\'><span class=\'apm-flab\'>When</span><button class=\'apm-fchip' + (S.pf.month === null ? ' on' : '') + '\' data-act=\'pfwhen\' data-v=\'all\'>Any time</button><button class=\'apm-fchip' + (S.pf.month !== null && Math.abs(S.pf.month - Math.floor(NOW_YM)) < 1 ? ' on' : '') + '\' data-act=\'pfwhen\' data-v=\'now\'>On site now</button>' +
      '<input id=\'apm-pmonth\' type=\'range\' min=\'' + ((2025 - PM0) * 12) + '\' max=\'' + ((2029 - PM0) * 12 + 11) + '\' value=\'' + (S.pf.month === null ? Math.floor(NOW_YM) : S.pf.month) + '\' aria-label=\'Show projects active in month\'>' +
      '<b class=\'apm-fmonth\'>' + (S.pf.month === null ? 'All dates' : ymLabel(S.pf.month)) + '</b><button class=\'apm-btn\' data-act=\'pfplay\' style=\'padding:2px 8px\'>' + (S.pfPlaying ? '❚❚' : '▶') + '</button></div>' +
      '<div class=\'apm-fsum\'><b>' + t.n + '</b> projects · <b>' + money(t.forecast) + '</b> forecast · <b>' + money(t.spent) + '</b> spent · <b class=\'' + (t.risk ? 'dn' : '') + '\'>' + money(t.risk) + '</b> revenue at risk</div>';
  }

  // ----------------------------------------------------------- story mode
  function terminalVar(t) { var a = zoneAgg(t, 'var', 'terminal'); return a.v; }
  function projById(id) { return S.projects.filter(function (p) { return p.id === id; })[0]; }
  var STORY = [
    { title: 'Manchester Airport at a glance', run: function () { S.lens = 'profit'; S.showProjects = false; clearSel(); setScope('all'); },
      text: function () { var t = totals(function () { return true; }), px = departingPax(); return 'Year to date the airport\'s commercial estate has earned <b>' + money(t.profit) + '</b>, <b>' + pct(t.budget ? t.profit / t.budget - 1 : 0, true) + '</b> against budget, from <b>' + num(px.actual) + '</b> departing passengers. Every block on the map is a revenue zone.'; } },
    { title: 'Terminal 1 closes, and passengers move', run: function () { S.lens = 'var'; S.showProjects = false; clearSel(); setScope('all'); },
      text: function () { return 'Terminal 1 closed in March 2026. More of its passengers moved to <b>Terminal 2</b> than planned, which is running <b class=\'up\'>' + pct(terminalVar('T2'), true) + '</b> against budget. <b>Terminal 3</b> is <b class=\'dn\'>' + pct(terminalVar('T3'), true) + '</b>.'; } },
    { title: 'Terminal 3 security is under pressure', run: function () { S.lens = 'var'; S.showProjects = false; selectAsset('T3 Security', true); },
      text: function () { var d = assetData('T3 Security'), d2 = assetData('T2 Security'); return 'In Terminal 3 only <b class=\'dn\'>' + pct(d ? d.sla : null) + '</b> of passengers clear security within 15 minutes, against <b>' + pct(d2 ? d2.sla : null) + '</b> in Terminal 2. Every minute in a queue is a minute not spent in the shops.'; } },
    { title: 'The response: Terminal 3 extension phase 2', run: function () { S.pf = { types: {}, statuses: {}, month: null }; selectProject('PRJ-103', true); },
      text: function () { var p = projById('PRJ-103'); return p ? 'A <b>' + money(p.budget) + '</b> scheme converting part of the old Terminal 1. It is <b>' + pct(p.pct) + '</b> complete and forecast at <b class=\'up\'>' + money(p.forecast) + '</b>. It adds four security lanes and new shops from ' + ymLabel(p.e - 1) + '.' : ''; } },
    { title: 'Works on Pier 1 take stands out of action', run: function () { selectProject('PRJ-101', true); },
      text: function () { var p = projById('PRJ-101'), d = assetData('Pier 1'); return p ? 'Air-bridge replacement has cut Pier 1 stand availability to <b class=\'dn\'>' + pct(d ? d.avail : null) + '</b>, with <b>' + money(p.revImpact) + '</b> of revenue at risk. The forecast is <b class=\'dn\'>' + money(p.forecast) + '</b> against a budget of ' + money(p.budget) + '.' : ''; } },
    { title: 'A loss-maker, and its fix', run: function () { S.lens = 'profit'; S.showProjects = true; selectUnit('T2-L-08', true); },
      text: function () { var x = unitData('T2-L-08'), p = projById('PRJ-106'); return 'The T2 arrivals café is the airport\'s biggest loss-maker at <b class=\'dn\'>' + money(x ? x.profit : null) + '</b>. The <b>' + (p ? money(p.budget) : '') + ' landside food-court refit</b>, now in design, replaces it from ' + (p ? ymLabel(p.e - 1) : '') + '.'; } },
    { title: 'The runway needs renewal', run: function () { S.showProjects = true; selectAsset('Runway 05L/23R', true); },
      text: function () { var p = projById('PRJ-102'); return 'Runway 05L/23R pavement condition is <b class=\'dn\'>58 / 100</b>. A <b>' + (p ? money(p.budget) : '') + '</b> resurfacing is approved for night working between April and October 2027.'; } },
    { title: 'The whole capital programme', run: function () { S.pf = { types: {}, statuses: {}, month: null }; S.showProjects = true; clearSel(); S.lens = 'profit'; setScope('all'); },
      text: function () { var t = programmeTotals(); return '<b>' + t.n + '</b> projects worth <b>' + money(t.forecast) + '</b>, with <b>' + money(t.spent) + '</b> spent so far. Use the filters to see where each type of work is happening, or scrub the timeline to watch the sites come and go.'; } }
  ];
  function storyGo(i) {
    if (i < 0 || i >= STORY.length) { S.story = null; renderAll(); return; }
    S.story = i; STORY[i].run(); renderAll();
  }
  function renderStory() {
    var el = $('apm-story'); if (!el) return;
    if (S.story === null || S.story === undefined) { el.hidden = true; return; }
    var st = STORY[S.story];
    el.hidden = false;
    el.innerHTML = '<div class=\'apm-st-top\'><span class=\'apm-st-step\'>' + (S.story + 1) + ' / ' + STORY.length + '</span><button class=\'apm-close\' data-act=\'story-end\' aria-label=\'End the story\'>✕</button></div>' +
      '<h3>' + esc(st.title) + '</h3><p>' + st.text() + '</p><div class=\'apm-actions\'><button class=\'apm-btn\' data-act=\'story-prev\'' + (S.story ? '' : ' disabled') + '>Back</button>' +
      '<div class=\'apm-st-dots\'>' + STORY.map(function (x, i) { return '<i class=\'' + (i === S.story ? 'on' : '') + '\'></i>'; }).join('') + '</div>' +
      '<button class=\'apm-btn primary\' data-act=\'story-next\'>' + (S.story === STORY.length - 1 ? 'Finish' : 'Next') + '</button></div>';
  }

  function renderSide() {
    if (!S.ready.kpis) { $('apm-side').innerHTML = '<div class=\'apm-sec\'><p class=\'apm-note\'>Loading insights…</p></div>'; return; }
    if (S.selProject) renderProject();
    else if (S.selAsset) renderAsset();
    else if (S.selected && S.byCode[S.selected]) renderDetail(); else renderInsights();
  }

  function renderAll() { renderChrome(); renderKpis(); paint(); renderSide(); }
  var renderTimer = 0;
  function scheduleRender() { clearTimeout(renderTimer); renderTimer = setTimeout(renderAll, 16); }

  // ------------------------------------------------------------ view box
  function applyView() {
    if (!svg) return;
    var v = S.view;
    svg.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
    svg.classList.toggle('lod0', v.w > LOD_FAR);
    svg.classList.toggle('lod1', v.w < 1100);
    svg.classList.toggle('lod2', v.w < 620);
  }
  function animateTo(box, pad) {
    pad = pad === undefined ? 0 : pad;
    if (M3) M3.flyTo(box, pad);
    var target = { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 };
    var from = { x: S.view.x, y: S.view.y, w: S.view.w, h: S.view.h };
    var t0 = performance.now(), dur = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 520;
    cancelAnimationFrame(rafId);
    function step(now) {
      var k = dur ? Math.min(1, (now - t0) / dur) : 1;
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      ['x', 'y', 'w', 'h'].forEach(function (p) { S.view[p] = from[p] + (target[p] - from[p]) * e; });
      applyView();
      if (k < 1) rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }
  function svgPoint(cx, cy) {
    var r = svg.getBoundingClientRect();
    var s = Math.max(S.view.w / r.width, S.view.h / r.height);
    var ox = (r.width * s - S.view.w) / 2, oy = (r.height * s - S.view.h) / 2;
    return { x: S.view.x - ox + (cx - r.left) * s, y: S.view.y - oy + (cy - r.top) * s, s: s };
  }
  function zoomAt(cx, cy, f) {
    var p = svgPoint(cx, cy);
    var w = Math.max(160, Math.min(WORLD.w * 1.4, S.view.w * f)), k = w / S.view.w;
    S.view = { x: p.x - (p.x - S.view.x) * k, y: p.y - (p.y - S.view.y) * k, w: w, h: S.view.h * k };
    applyView();
  }

  // ---------------------------------------------------------- interactions
  function setScope(k) {
    S.scope = k; S.zone = null; S.selected = null;
    animateTo(SCOPES[k].box);
    renderAll();
  }
  function setZone(z) {
    var f = S.features.filter(function (x) { return x.zone === z && x.type !== 'base' && x.type !== 'walkway'; })[0] || S.features.filter(function (x) { return x.zone === z; })[0];
    var u = S.units.filter(function (x) { return x.zone === z; })[0];
    if (!f && !u) return;
    S.zone = z; S.selected = null;
    S.scope = f ? (f.terminal || 'all') : u.terminal;
    if (!SCOPES[S.scope]) S.scope = 'all';
    var b0 = null;
    var add = function (b) { if (!b0) b0 = { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h }; else { b0.x0 = Math.min(b0.x0, b.x); b0.y0 = Math.min(b0.y0, b.y); b0.x1 = Math.max(b0.x1, b.x + b.w); b0.y1 = Math.max(b0.y1, b.y + b.h); } };
    S.features.forEach(function (x) { if (x.zone === z && x.type !== 'base') add(x.box); });
    S.units.forEach(function (x) { if (x.zone === z) add(x.box); });
    var box = { x: b0.x0, y: b0.y0, w: b0.x1 - b0.x0, h: b0.y1 - b0.y0 };
    var minW = 420; if (box.w < minW) { box.x -= (minW - box.w) / 2; box.w = minW; }
    if (PIER_ZONES[z]) box = { x: box.x - 90, y: box.y - 40, w: box.w + 180, h: box.h + 60 };
    animateTo(box, 40);
    renderAll();
  }
  function selectUnit(code, fly) {
    var u = S.byCode[code]; if (!u) return;
    clearSel(); S.selected = code;
    if (!SCOPES[S.scope].test(u) || (S.zone && S.zone !== u.zone)) { S.scope = SCOPES[u.terminal] ? u.terminal : 'all'; S.zone = null; }
    if (fly) {
      var b = u.box, w = Math.max(b.w * 6, is3D() ? 560 : 360), h = w * 0.62;
      animateTo({ x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w: w, h: h });
    }
    S.trend = unitTrend(code);
    renderAll();
  }

  function setPeriod(key) {
    S.period = key;
    recompute();
    renderAll();
  }
  var playIdx = 0, playTimer = 0;
  function togglePlay() {
    S.playing = !S.playing;
    clearInterval(playTimer);
    if (S.playing) {
      playIdx = 0; setPeriod('m0');
      playTimer = setInterval(function () {
        playIdx++;
        if (playIdx > LAST_ACTUAL) { S.playing = false; clearInterval(playTimer); setPeriod('ytd'); return; }
        setPeriod('m' + playIdx);
      }, 1300);
    } else setPeriod('ytd');
    renderChrome();
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'apm-toast'; t.textContent = msg; t.setAttribute('role', 'status');
    $('apm-map').appendChild(t);
    timers.push(setTimeout(function () { t.remove(); }, 2600));
  }

  function totalProfit() { return totals(function () { return true; }).profit; }

  function applyWhatIf() {
    var u = S.byCode[S.selected]; if (!u || S.busy) return;
    var d = unitData(u.code);
    var rateEl = $('apm-rate'), catEl = $('apm-cat');
    var newRate = rateEl ? Math.round(Number(rateEl.value) * 100) / 100 : null;
    var newCat = catEl ? catEl.value : u.category;
    var writes = [];
    if (S.baseline === null) { S.baseline = totalProfit(); S.baselinePeriod = S.period; }
    if (newCat !== u.category) {
      S.edits.push({ code: u.code, kind: 'cat', from: u.category, to: newCat });
      writes.push(function () { return SDK.editValue('sCategory', { unitList: u.code }, newCat); });
      if (rateEl && Math.abs(newRate - (d.rate || 0)) < 0.001) newRate = DEFAULT_RATE[newCat] || newRate;
    }
    if (newRate !== null && Math.abs(newRate - (d.rate || 0)) >= 0.001) {
      S.edits.push({ code: u.code, kind: 'rate', from: d.rate, to: newRate });
      writes.push(function () { return SDK.editValue('sRate', { unitList: u.code }, newRate); });
    }
    if (!writes.length) { toast('Nothing changed. Move the slider or pick a new category.'); return; }
    runWrites(writes, 'Recalculated. Map, KPIs and insights updated.');
  }
  function resetEdits() {
    if (S.busy || !S.edits.length) return;
    var writes = S.edits.slice().reverse().map(function (e) {
      return function () {
        if (e.kind === 'cat') return SDK.editValue('sCategory', { unitList: e.code }, e.from);
        return SDK.editValue('sRate', { unitList: e.code }, e.from);
      };
    });
    S.edits = [];
    runWrites(writes, 'Scenario cleared. Back to the original plan.', function () { S.baseline = null; });
  }
  function runWrites(writes, msg, after) {
    S.busy = true; renderChrome(); renderSide();
    var chain = Promise.resolve();
    writes.forEach(function (w) { chain = chain.then(w); });
    chain.then(function () {
      S.busy = false; if (after) after(); S.pendingToast = msg; renderAll();
    }, function (err) {
      S.busy = false; toast('Write failed: ' + (err && err.message ? err.message : err)); renderAll();
    });
  }

  // tooltip
  function showTip(html, x, y) {
    if (!tooltip) { tooltip = document.createElement('div'); tooltip.className = 'apm-tip'; document.body.appendChild(tooltip); }
    tooltip.innerHTML = html; tooltip.hidden = false;
    var w = tooltip.offsetWidth, h = tooltip.offsetHeight;
    var left = x + 14, top = y + 14;
    if (left + w > window.innerWidth - 8) left = x - w - 14;
    if (top + h > window.innerHeight - 8) top = y - h - 14;
    tooltip.style.left = Math.max(8, left) + 'px'; tooltip.style.top = Math.max(8, top) + 'px';
  }
  function hideTip() { if (tooltip) tooltip.hidden = true; }
  function unitTip(u) {
    var d = unitData(u.code);
    var L = LENSES.filter(function (l) { return l.key === S.lens; })[0];
    return '<b>' + esc(u.name) + '</b><br><span class=\'k\'>' + esc(u.category) + ' · ' + esc(u.zone) + '</span><br>' +
      '<span class=\'k\'>' + esc(L.label) + ':</span> <b>' + fmtLens(u, S.lens) + '</b>' +
      (d && S.lens !== 'profit' ? '<br><span class=\'k\'>Profit:</span> ' + money(d.profit) : '') +
      (d ? '<br><span class=\'k\'>Sales:</span> ' + money(d.sales) : '');
  }

  // events (delegated once)
  var drag = null;
  function onClick(e) {
    var a = e.target.closest('[data-act]');
    if (!a || !app.contains(a)) return;
    var act = a.getAttribute('data-act'), v = a.getAttribute('data-v');
    if (act === 'scope') setScope(v);
    else if (act === 'lens') { S.lens = v; renderAll(); }
    else if (act === 'select') selectUnit(v, true);
    else if (act === 'deselect') { clearSel(); renderAll(); }
    else if (act === 'proj') selectProject(v, true);
    else if (act === 'asset') selectAsset(v, true);
    else if (act === 'projects') { S.showProjects = !S.showProjects; if (!S.showProjects) { S.selProject = null; stopPfPlay(); } renderAll(); }
    else if (act === 'pf') { var kind = a.getAttribute('data-k') === 'type' ? 'types' : 'statuses'; if (S.pf[kind][v]) delete S.pf[kind][v]; else S.pf[kind][v] = true; renderAll(); }
    else if (act === 'pfwhen') { stopPfPlay(); S.pf.month = v === 'all' ? null : Math.floor(NOW_YM); renderAll(); }
    else if (act === 'pfplay') { if (S.pfPlaying) stopPfPlay(); else startPfPlay(); renderAll(); }
    else if (act === 'story') storyGo(0);
    else if (act === 'story-next') storyGo(S.story + 1);
    else if (act === 'story-prev') storyGo(S.story - 1);
    else if (act === 'story-end') storyGo(-1);
    else if (act === 'zone') setZone(v);
    else if (act === 'crumb') { if (v === 'all') setScope('all'); else if (v === 'zone') { S.selected = null; setZone(S.zone); } else setScope(v); }
    else if (act === 'play') togglePlay();
    else if (act === 'flow') { S.flow = !S.flow; paint(); }
    else if (act === 'zin') { if (is3D()) M3.zoomBy(0.7); else { var r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 0.7); } }
    else if (act === 'zout') { if (is3D()) M3.zoomBy(1.4); else { var r2 = svg.getBoundingClientRect(); zoomAt(r2.left + r2.width / 2, r2.top + r2.height / 2, 1.4); } }
    else if (act === 'mode') setMode(S.mode === '3d' ? '2d' : '3d');
    else if (act === 'rot') { if (is3D()) M3.rotate(Number(v)); }
    else if (act === 'tilt') { if (is3D()) M3.tilt(); }
    else if (act === 'zreset') setScope('all');
    else if (act === 'apply') applyWhatIf();
    else if (act === 'reset') resetEdits();
  }
  var pfTimer = 0, pfInputT = 0;
  function renderPFilterSummary() { var el = app.querySelector('.apm-fsum'); if (!el) return; var t = programmeTotals(); el.innerHTML = '<b>' + t.n + '</b> projects · <b>' + money(t.forecast) + '</b> forecast · <b>' + money(t.spent) + '</b> spent · <b class=\'' + (t.risk ? 'dn' : '') + '\'>' + money(t.risk) + '</b> revenue at risk'; }
  function stopPfPlay() { S.pfPlaying = false; clearInterval(pfTimer); }
  function startPfPlay() {
    S.pfPlaying = true; S.pf.month = (2025 - PM0) * 12;
    clearInterval(pfTimer);
    pfTimer = setInterval(function () { S.pf.month += 2; if (S.pf.month > (2029 - PM0) * 12 + 11) { stopPfPlay(); S.pf.month = Math.floor(NOW_YM); } renderAll(); }, 700);
  }
  function onChange(e) {
    if (e.target.id === 'apm-period') { if (S.playing) { S.playing = false; clearInterval(playTimer); } setPeriod(e.target.value); }
  }
  function onInput(e) {
    if (e.target.id === 'apm-rate') { var o = $('apm-rate-v'); if (o) o.textContent = pct(Number(e.target.value)); }
    if (e.target.id === 'apm-q') search(e.target.value);
    if (e.target.id === 'apm-pmonth') { stopPfPlay(); S.pf.month = Number(e.target.value); var fm = app.querySelector('.apm-fmonth'); if (fm) fm.textContent = ymLabel(S.pf.month); clearTimeout(pfInputT); pfInputT = setTimeout(function () { paint(); renderSide(); renderPFilterSummary(); }, 60); }
  }
  function search(q) {
    var box = $('apm-results');
    q = (q || '').trim().toLowerCase();
    if (q.length < 2) { box.hidden = true; return; }
    var hits = [];
    S.projects.forEach(function (p) { if ((p.name + ' ' + p.id + ' ' + p.type).toLowerCase().indexOf(q) >= 0) hits.push(['proj', p.id, p.name, 'Project']); });
    S.assets.forEach(function (a) { if ((a.id + ' ' + a.type).toLowerCase().indexOf(q) >= 0) hits.push(['asset', a.id, a.id, a.type]); });
    S.units.forEach(function (u) { if ((u.name + ' ' + u.tenant + ' ' + u.code + ' ' + u.category).toLowerCase().indexOf(q) >= 0) hits.push(['unit', u.code, u.name, u.code]); });
    hits = hits.slice(0, 8);
    box.innerHTML = hits.length ? hits.map(function (h) { return '<button data-act=\'pick\' data-k=\'' + h[0] + '\' data-v=\'' + esc(h[1]) + '\'><span>' + esc(h[2]) + '</span><small style=\'color:#62809d\'>' + esc(h[3]) + '</small></button>'; }).join('') : '<div style=\'padding:8px 10px;color:#62809d\'>Nothing matches “' + esc(q) + '”.</div>';
    box.hidden = false;
  }
  function onPick(e) {
    var b = e.target.closest('[data-act=pick]'); if (!b) return;
    $('apm-results').hidden = true; $('apm-q').value = '';
    var k = b.getAttribute('data-k'), v = b.getAttribute('data-v');
    if (k === 'proj') selectProject(v, true); else if (k === 'asset') selectAsset(v, true); else selectUnit(v, true);
  }
  function onPointerDown(e) {
    if (!svg || !svg.contains(e.target)) return;
    drag = { x: e.clientX, y: e.clientY, vx: S.view.x, vy: S.view.y, moved: false, id: e.pointerId, target: e.target };
  }
  function onPointerMove(e) {
    if (drag && drag.id === e.pointerId) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; svg.classList.add('drag'); try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } cancelAnimationFrame(rafId); }
      if (drag.moved) {
        var s = svgPoint(0, 0).s;
        S.view.x = drag.vx - dx * s; S.view.y = drag.vy - dy * s; applyView(); hideTip(); return;
      }
    }
    var t = e.target;
    if (svg && svg.contains(t) && t.classList && t.classList.contains('u')) showTip(unitTip(S.byCode[t.getAttribute('data-code')]), e.clientX, e.clientY);
    else if (svg && svg.contains(t) && t.classList && t.classList.contains('zagg')) {
      var zn = t.getAttribute('data-zone'), ag = zoneAgg(zn, S.lens), ap = zoneAgg(zn, 'profit');
      showTip('<b>' + esc(zn) + '</b><br><span class=\'k\'>' + esc(LENSES.filter(function (l) { return l.key === S.lens; })[0].label) + ':</span> ' + esc(ag.text) + (S.lens !== 'profit' ? '<br><span class=\'k\'>Profit:</span> ' + ap.text : '') + '<br><span class=\'k\'>Click to zoom in</span>', e.clientX, e.clientY);
    }
    else if (t.classList && t.classList.contains('apm-hit') && S.trend) {
      var i = Number(t.getAttribute('data-m'));
      showTip('<b>' + MONTHS[i] + (i > LAST_ACTUAL ? ' · forecast' : '') + '</b><br><span class=\'k\'>' + (S.trend.kind === 'asset' ? 'EBITDA' : 'Profit') + ':</span> ' + money(S.trend.profit[i]) + '<br><span class=\'k\'>Budget:</span> ' + money(S.trend.budget[i]) + '<br><span class=\'k\'>' + (S.trend.kind === 'asset' ? 'Revenue' : 'Sales') + ':</span> ' + money(S.trend.sales[i]), e.clientX, e.clientY);
    } else hideTip();
  }
  function onPointerUp(e) {
    if (!drag || drag.id !== e.pointerId) return;
    var wasDrag = drag.moved, target = drag.target;
    svg.classList.remove('drag');
    drag = null;
    if (wasDrag) return;
    if (target.getAttribute && target.getAttribute('data-proj')) { selectProject(target.getAttribute('data-proj'), true); return; }
    if (target.classList.contains('u')) selectUnit(target.getAttribute('data-code'), false);
    else if (target.classList.contains('zh') || target.classList.contains('zagg')) setZone(target.getAttribute('data-zone'));
  }
  function onWheel(e) {
    if (!svg || !svg.contains(e.target)) return;
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, Math.pow(1.0015, e.deltaY));
  }
  function onKey(e) {
    if (S.story !== null && S.story !== undefined && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !/INPUT|SELECT/.test((e.target.tagName || ''))) { storyGo(S.story + (e.key === 'ArrowRight' ? 1 : -1)); return; }
    if (e.key === 'Escape') { if (S.story !== null && S.story !== undefined) { storyGo(-1); return; } if (S.selected || S.selAsset || S.selProject) { clearSel(); renderAll(); } $('apm-results').hidden = true; return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('u')) { e.preventDefault(); selectUnit(e.target.getAttribute('data-code'), true); }
  }
  function onFocusIn(e) { if (e.target.classList && e.target.classList.contains('u')) { var r = e.target.getBoundingClientRect(); showTip(unitTip(S.byCode[e.target.getAttribute('data-code')]), r.right, r.bottom); } }
  var resizeTimer = 0;
  function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { applyView(); if (M3) M3.resize(); renderSide(); }, 120); }

  app.addEventListener('click', onClick);
  app.addEventListener('click', onPick);
  app.addEventListener('change', onChange);
  app.addEventListener('input', onInput);
  app.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  app.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
  app.addEventListener('focusin', onFocusIn);
  app.addEventListener('mouseleave', hideTip);
  window.addEventListener('resize', onResize);
  var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
  if (ro) ro.observe(document.documentElement);

  // ------------------------------------------------------------- data in
  // Six Pigment data sources (see README). Rows arrive as
  // { labels: [...], values: [...] } in declaration order, 1,000 rows a window.
  var MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function cellTxt(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') { if (v.kind) return ''; var c = v.label != null ? v.label : v.name != null ? v.name : v.displayName != null ? v.displayName : v.value; return c == null ? '' : String(c); }
    return String(v);
  }
  function numCell(v) { return typeof v === 'number' && isFinite(v) ? v : (v === null || v === undefined || typeof v === 'object' || v === '' ? null : Number(v)); }
  function monthIndex(label) { var t = cellTxt(label); var i = MON3.indexOf(t.slice(0, 3)); return i; }
  function anyLoading(rows) {
    for (var i = 0; i < rows.length; i++) {
      var ls = rows[i].labels || [], vs = rows[i].values || [], j;
      for (j = 0; j < ls.length; j++) if (ls[j] && typeof ls[j] === 'object' && ls[j].kind === 'loading') return true;
      for (j = 0; j < vs.length; j++) if (vs[j] && typeof vs[j] === 'object' && vs[j].kind === 'loading') return true;
    }
    return false;
  }
  function onErr(err) { S.error = err && err.message ? err.message : String(err); renderChrome(); }
  var SRC = {}, RETRY = [2000, 5000, 10000, 20000, 40000], DATA = {};
  var SOURCE_LIST = ['objects', 'unitInputs', 'unitMonthly', 'gateMonthly', 'assetAnnual', 'profiles'];
  function openSource(name, attempt) {
    SRC[name] = { acc: [], requested: 0, sub: null };
    try {
      SRC[name].sub = SDK.subscribeToDataSource(name, {
        onData: function (d) { onSourceData(name, d); },
        onError: function (err) {
          var m = err && err.message ? err.message : String(err);
          if (/too many/i.test(m) && attempt < RETRY.length) { closeSource(name); timers.push(setTimeout(function () { openSource(name, attempt + 1); }, RETRY[attempt])); return; }
          onErr(err);
        },
        dynamicFilters: [],
        scroll: { offset: 0, numberOfRows: 1000 }
      });
      subs.push(SRC[name].sub);
    } catch (e) { onErr(e); }
  }
  function closeSource(name) { var s = SRC[name] && SRC[name].sub; try { if (typeof s === 'function') s(); else if (s && s.unsubscribe) s.unsubscribe(); } catch (e) { /* ignore */ } }
  function onSourceData(name, d) {
    var src = SRC[name];
    if (!src || !d || !d.rows) return;
    if (anyLoading(d.rows)) { if (name === 'unitMonthly' && S.ready.kpis) { S.stale = true; if (svg) svg.classList.add('stale'); renderChrome(); } return; }
    var off = d.rowOffset || 0;
    if (off === 0) { src.acc = []; src.requested = 0; }
    for (var i = 0; i < d.rows.length; i++) src.acc[off + i] = d.rows[i];
    var total = d.totalRowCount || (off + d.rows.length), loaded = off + d.rows.length;
    if (total > loaded && loaded > src.requested && src.sub && src.sub.updateScroll) { src.requested = loaded; src.sub.updateScroll({ offset: loaded, numberOfRows: 1000 }); return; }
    DATA[name] = src.acc.filter(function (x) { return !!x; });
    ingest(name);
  }

  function parseJSON(s) { try { return JSON.parse(s); } catch (e) { return null; } }
  function ingest(name) {
    var rows = DATA[name];
    if (name === 'objects') {
      var feats = [], assetsL = [], projs = [];
      (typeof APM_BASEMAP !== 'undefined' ? APM_BASEMAP.paths : []).forEach(function (p) { feats.push({ name: 'base', type: 'base', cls: p.type, path: p.d, box: { x: 0, y: 0, w: 0, h: 0 }, label: '', line: [] }); });
      rows.forEach(function (r) {
        var key = cellTxt(r.labels[0]), o = parseJSON(cellTxt(r.values[0]));
        if (!key || !o) return;
        var kind = key.slice(0, 2), id = key.slice(2);
        if (kind === 'F:') feats.push({
          name: id, type: o.t, box: shape(o.s), label: o.l || '', sub: o.sub || '', terminal: o.term || '', zone: o.z || '', pier: o.p || '', heading: Number(o.h) || 0, ends: o.e || '',
          closed: !!o.c, small: !!o.sm, far: !!o.f, cls: '', path: '', line: String(o.ln || '').split(',').map(Number),
          labelX: o.lx === undefined || o.lx === '' ? null : Number(o.lx), labelY: o.ly === undefined || o.ly === '' ? null : Number(o.ly), side: '', asset: o.a || ''
        });
        else if (kind === 'A:') assetsL.push({ id: id, type: o.type, terminal: o.term || '', pier: o.pier || '', gate: o.gate || '', facts: o.facts || '', prof: o.prof || 'Seasonal' });
        else if (kind === 'P:') projs.push(parseProject(id, o));
      });
      S.features = feats;
      var piers = {}; PIER_ZONES = {};
      S.features.forEach(function (f) { if (f.type === 'pier' || f.type === 'ghostpier') piers[f.zone || f.name] = f; if (f.type === 'pier') PIER_ZONES[f.zone] = f; });
      S.features.forEach(function (f) { var pp = piers[f.pier]; if (f.type !== 'gate' || !pp) return; if (pp.box.w > pp.box.h) f.side = f.box.y <= pp.box.y + 1 ? 'T' : 'B'; else f.side = f.box.x <= pp.box.x + 1 ? 'L' : 'R'; });
      S.assets = assetsL; S.assetBy = {}; S.assetIdx = {}; S.assets.forEach(function (a, i) { S.assetBy[a.id] = a; S.assetIdx[a.id] = i; });
      S.projects = projs.sort(function (a, b) { return a.s - b.s; });
      S.ready.features = true;
      if (M3) M3.refreshStatic();
    } else if (name === 'unitInputs') {
      S.units = rows.map(function (r) {
        var code = cellTxt(r.labels[0]), m = cellTxt(r.values[0]).split('|');
        var cat = cellTxt(r.values[2]) || m[8] || '';
        return { code: code, name: m[0] || code, tenant: cat !== m[8] ? 'Proposed ' + cat + ' tenant' : (m[1] || ''), terminal: m[2] || '', zone: m[3] || '', box: shape(m[4]), lease: m[5] || '', gate: m[6] || '',
          model: m[7] || 'Concession', origCategory: m[8] || cat, category: cat, rate: numCell(r.values[1]), area: numCell(r.values[3]) || 0, mag: numCell(r.values[4]) || 0 };
      }).filter(function (u) { return u.code && u.box.w > 0; });
      S.byCode = {}; S.units.forEach(function (u) { S.byCode[u.code] = u; });
      S.ready.units = true;
    } else if (name === 'unitMonthly') {
      var um = {};
      rows.forEach(function (r) {
        var code = cellTxt(r.labels[0]), mi = monthIndex(r.labels[1]); if (!code || mi < 0) return;
        var v = r.values, a = um[code] = um[code] || [];
        a[mi] = { sales: numCell(v[0]) || 0, conc: numCell(v[1]) || 0, other: numCell(v[2]) || 0, direct: numCell(v[3]) || 0, alloc: numCell(v[4]) || 0, profit: numCell(v[5]) || 0, budget: numCell(v[6]) || 0, tx: numCell(v[7]) || 0, pax: numCell(v[8]) || 0, bpax: numCell(v[9]) || 0 };
      });
      S.um = um; S.ready.kpis = true; S.stale = false; S.error = null;
    } else if (name === 'gateMonthly') {
      var gm = {};
      rows.forEach(function (r) { var g = cellTxt(r.labels[0]), mi = monthIndex(r.labels[1]); if (!g || mi < 0) return; (gm[g] = gm[g] || [])[mi] = [numCell(r.values[0]) || 0, numCell(r.values[1]) || 0]; });
      S.gm = gm;
    } else if (name === 'assetAnnual') {
      var aa = {};
      rows.forEach(function (r) { var id = cellTxt(r.labels[0]), line = cellTxt(r.labels[1]); if (!id || !line) return; (aa[id] = aa[id] || {})[line] = numCell(r.values[0]); });
      S.aa = aa;
    } else if (name === 'profiles') {
      var pr = {};
      rows.forEach(function (r) { var p = cellTxt(r.labels[0]), mi = monthIndex(r.labels[1]); if (!p || mi < 0) return; (pr[p] = pr[p] || [])[mi] = numCell(r.values[0]) || 0; });
      S.prof = pr;
    }
    recompute();
    if (S.selected) S.trend = unitTrend(S.selected); else if (S.selAsset) S.trend = assetTrend(S.selAsset);
    if (name === 'unitMonthly' && S.pendingToast && !S.busy) { toast(S.pendingToast); S.pendingToast = null; }
    if (name === 'unitMonthly' && S.edits.length === 0 && !S.busy) S.baseline = null;
    if ((name === 'assetAnnual' || name === 'profiles') && M3) M3.refreshStatic();
    maybeBuild(); scheduleRender();
  }

  // Period totals, trends and spend curves are worked out here from the monthly data.
  function periodIdx() { return periodObj().months.map(function (m) { return MONTHS.indexOf(m); }); }
  function recompute() {
    var idx = periodIdx(), kpi = {};
    S.units.forEach(function (u) {
      var arr = (S.um || {})[u.code]; if (!arr) return;
      var a = { sales: 0, conc: 0, other: 0, direct: 0, alloc: 0, profit: 0, budget: 0, tx: 0, pax: 0, bpax: 0, rate: u.rate };
      idx.forEach(function (i) { var x = arr[i]; if (!x) return; for (var k in x) a[k] += x[k]; });
      kpi[u.code] = a;
    });
    S.kpi = kpi;
    S.gatePax = {}; S.gateBudget = {};
    Object.keys(S.gm || {}).forEach(function (g) { var s = 0, b = 0; idx.forEach(function (i) { var x = S.gm[g][i]; if (x) { s += x[0]; b += x[1]; } }); S.gatePax[g] = s; S.gateBudget[g] = b; });
    var ak = {};
    S.assets.forEach(function (a) {
      var v = (S.aa || {})[a.id]; if (!v) return;
      var w = (S.prof || {})[a.prof] || [], share = 0; idx.forEach(function (i) { share += w[i] || 0; });
      var o = {};
      Object.keys(AC).forEach(function (k) { o[k] = null; });
      var flow = function (line) { var x = v[line]; return x === undefined || x === null ? 0 : x * share; };
      var lvl = function (line) { var x = v[line]; return x === undefined ? null : x; };
      o.aero = flow('Aero Revenue'); o.comm = flow('Commercial Revenue'); o.prop = flow('Property & Other Revenue'); o.staff = flow('Staff Costs'); o.maint = flow('Maintenance');
      o.util = flow('Utilities'); o.other = flow('Other Opex'); o.dep = flow('Depreciation'); o.bebitda = flow('Budget EBITDA');
      o.pax = v['Passengers'] === undefined ? null : flow('Passengers'); o.mov = v['Movements'] === undefined ? null : flow('Movements');
      o.utl = lvl('Utilisation'); o.avail = lvl('Availability'); o.sla = lvl('Service Level'); o.cond = lvl('Condition Score');
      o.ebitda = o.aero + o.comm + o.prop - o.staff - o.maint - o.util - o.other; o.op = o.ebitda - o.dep;
      ak[a.id] = o;
    });
    S.akpi = ak;
  }
  function unitTrend(code) {
    var arr = (S.um || {})[code] || [];
    return { code: code, profit: MONTHS.map(function (m, i) { return arr[i] ? arr[i].profit : null; }), budget: MONTHS.map(function (m, i) { return arr[i] ? arr[i].budget : null; }), sales: MONTHS.map(function (m, i) { return arr[i] ? arr[i].sales : null; }) };
  }
  function assetTrend(id) {
    var a = S.assetBy[id], v = (S.aa || {})[id] || {}, w = (S.prof || {})[a ? a.prof : 'Seasonal'] || [];
    var g = function (k) { return v[k] || 0; };
    var rev = g('Aero Revenue') + g('Commercial Revenue') + g('Property & Other Revenue'), cost = g('Staff Costs') + g('Maintenance') + g('Utilities') + g('Other Opex');
    return { code: 'A:' + id, kind: 'asset', profit: MONTHS.map(function (m, i) { return (rev - cost) * (w[i] || 0); }), budget: MONTHS.map(function (m, i) { return g('Budget EBITDA') * (w[i] || 0); }), sales: MONTHS.map(function (m, i) { return rev * (w[i] || 0); }) };
  }
  function projectSpend(p) {
    var t0 = (2024 - PM0) * 12, n = 72, sig = function (t) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }, now = Math.floor(NOW_YM);
    var plan = [], act = [], fc = [];
    for (var j = 0; j < n; j++) {
      var i = t0 + j;
      plan.push(p.budget * sig((i - p.s) / Math.max(1, p.e - 1 - p.s)));
      act.push(i <= now ? (i < p.s ? 0 : p.spent * sig((i - p.s) / Math.max(1, now - p.s))) : null);
      fc.push(i < now ? null : p.spent + (p.forecast - p.spent) * sig((i - now) / Math.max(1, p.e - 1 - now)));
    }
    return { id: p.id, plan: plan, act: act, fc: fc };
  }

  function maybeBuild() {
    if (S.ready.units && S.ready.features && !built) { buildMap(); if (S.mode === '3d') setMode('3d'); }
    if (built) scheduleRender();
  }
  SOURCE_LIST.forEach(function (n) { openSource(n, 0); });
  renderChrome();

  // ------------------------------------------------------------- cleanup
  root.__cleanup = function () {
    if (M3) { try { M3.destroy(); } catch (e) { /* ignore */ } M3 = null; }
    subs.forEach(function (s) { try { s.unsubscribe(); } catch (e) { /* ignore */ } });
    app.removeEventListener('click', onClick);
    app.removeEventListener('click', onPick);
    app.removeEventListener('change', onChange);
    app.removeEventListener('input', onInput);
    app.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    app.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
    app.removeEventListener('focusin', onFocusIn);
    app.removeEventListener('mouseleave', hideTip);
    window.removeEventListener('resize', onResize);
    if (ro) ro.disconnect();
    clearTimeout(renderTimer); clearTimeout(resizeTimer); clearInterval(playTimer); clearInterval(pfTimer); clearTimeout(pfInputT);
    timers.forEach(clearTimeout);
    cancelAnimationFrame(rafId);
    if (tooltip) tooltip.remove();
    if (styleEl) styleEl.remove();
    S.kpi = {}; S.units = []; S.features = [];
    root.innerHTML = '';
  };
})();
