  // ===================================================================
  // 3D MAP: plain WebGL, no libraries (Pigment Frames cannot load CDNs).
  // Inlined into the Frame body by build.js, so it shares the Frame's scope
  // (S, colorFor, zoneAgg, selectUnit, setZone, showTip ...).
  // World axes: x = east, z = south (map y), y = up. 1 unit is about 1.3 m.
  // ===================================================================
  function createMap3D(host) {
    var canvas = document.createElement('canvas');
    canvas.className = 'apm-gl';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D airport map. Drag to pan, right-drag or Shift-drag to rotate and tilt, scroll to zoom. Use search or the insights list to open a unit.');
    var gl = null;
    try { gl = canvas.getContext('webgl', { antialias: true, alpha: false }) || canvas.getContext('experimental-webgl', { antialias: true, alpha: false }); } catch (e) { gl = null; }
    if (!gl) return null;
    host.insertBefore(canvas, host.firstChild);
    var overlay = document.createElement('div');
    overlay.className = 'apm-ov';
    host.insertBefore(overlay, canvas.nextSibling);
    var compass = document.createElement('button');
    compass.className = 'apm-compass'; compass.type = 'button'; compass.setAttribute('aria-label', 'Reset the view to north up');
    compass.innerHTML = '<svg viewBox=\'-20 -20 40 40\' width=\'40\' height=\'40\' aria-hidden=\'true\'><circle r=\'18\' fill=\'rgba(18,24,33,.9)\' stroke=\'rgba(255,255,255,.25)\'/><path d=\'M0,-13 L5,2 L0,0 L-5,2 Z\' fill=\'#ffc627\'/><path d=\'M0,13 L5,-2 L0,0 L-5,-2 Z\' fill=\'#5d6773\'/><text y=\'-15.5\' text-anchor=\'middle\' font-size=\'6\' font-weight=\'800\' fill=\'#eef1f4\'>N</text></svg>';
    host.appendChild(compass);
    function onCompass() { startTween({ tx: cam.tx, tz: cam.tz, dist: cam.dist, yaw: 0, pitch: cam.pitch }, 600); }
    compass.addEventListener('click', onCompass);
    var aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');

    var D2R = Math.PI / 180, FOV = 36 * D2R;
    var WALL = { terminal: 15, pier: 10, station: 18 };
    var FLOOR = 1.2;
    var cam = { tx: 2050, tz: 1700, dist: 4300, yaw: 0, pitch: 50 };
    var tween = null, dirty = true, raf = 0, lastRA = -1, cssW = 1, cssH = 1, dpr = 1;
    var VP = null, invVP = null, eye = [0, 0, 0];
    var meshes = {}, tex = {}, labels = [], pickFB = null, pickTex = null, pickDepth = null, pickW = 0, pickH = 0;
    var unitList = [], aggList = [];

    // ------------------------------------------------------------ math
    function persp(fovy, aspect, near, far) { var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far); return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]; }
    function lookAt(e, c) {
      var zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
      var xx = zz, xy = 0, xz = -zx; l = Math.hypot(xx, xz) || 1; xx /= l; xz /= l;
      var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
    }
    function mul(a, b) { var o = new Array(16); for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
    function inv(m) {
      var o = new Array(16);
      o[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
      o[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
      o[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
      o[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
      o[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
      o[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
      o[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
      o[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
      o[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
      o[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
      o[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
      o[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
      o[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
      o[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
      o[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
      o[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
      var det = m[0] * o[0] + m[1] * o[4] + m[2] * o[8] + m[3] * o[12];
      if (!det) return null;
      for (var i = 0; i < 16; i++) o[i] /= det;
      return o;
    }
    function xform(m, p) { var x = p[0], y = p[1], z = p[2]; return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]]; }
    function eyeOf(c) { var p = c.pitch * D2R, y = c.yaw * D2R; return [c.tx + c.dist * Math.cos(p) * Math.sin(y), c.dist * Math.sin(p), c.tz + c.dist * Math.cos(p) * Math.cos(y)]; }
    function matsFor(c) {
      var e = eyeOf(c), near = Math.max(2, c.dist * 0.02), far = c.dist * 5 + 12000;
      var vp = mul(persp(FOV, cssW / cssH, near, far), lookAt(e, [c.tx, 0, c.tz]));
      return { vp: vp, inv: inv(vp), eye: e };
    }
    function updateMats() { var m = matsFor(cam); VP = m.vp; invVP = m.inv; eye = m.eye; }
    function project(p) {
      var c = xform(VP, p);
      if (c[3] <= 0.0001) return null;
      return { x: (c[0] / c[3] * 0.5 + 0.5) * cssW, y: (1 - (c[1] / c[3] * 0.5 + 0.5)) * cssH, d: c[3] };
    }
    function groundAt(sx, sy, im) {
      im = im || invVP;
      var nx = sx / cssW * 2 - 1, ny = 1 - sy / cssH * 2;
      var a = xform(im, [nx, ny, -1]), b = xform(im, [nx, ny, 1]);
      a = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; b = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
      var dy = b[1] - a[1];
      if (Math.abs(dy) < 1e-6) return null;
      var t = -a[1] / dy;
      if (t < 0) return null;
      return [a[0] + (b[0] - a[0]) * t, 0, a[2] + (b[2] - a[2]) * t];
    }

    // ---------------------------------------------------------- shaders
    function prog(vs, fs) {
      function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
      var p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      var o = { p: p, a: {}, u: {} };
      for (var i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i < n; i++) { var a = gl.getActiveAttrib(p, i); o.a[a.name] = gl.getAttribLocation(p, a.name); }
      for (var j = 0, m = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); j < m; j++) { var u = gl.getActiveUniform(p, j); o.u[u.name] = gl.getUniformLocation(p, u.name); }
      return o;
    }
    var P_MESH = prog(
      'attribute vec3 aPos; attribute vec3 aNor; attribute vec4 aCol; uniform mat4 uVP; uniform vec3 uEye; varying vec3 vNor; varying vec4 vCol; varying float vDist; varying float vH;' +
      'void main(){ vNor=aNor; vCol=aCol; vDist=distance(aPos,uEye); vH=aPos.y; gl_Position=uVP*vec4(aPos,1.0); }',
      'precision mediump float; varying vec3 vNor; varying vec4 vCol; varying float vDist; varying float vH; uniform vec3 uLight; uniform vec3 uFog; uniform vec2 uFogR; uniform float uPick; uniform float uAlpha;' +
      'void main(){ if(uPick>0.5){ gl_FragColor=vCol; return; } vec3 n=normalize(vNor); float l=0.5+0.42*max(dot(n,uLight),0.0)+0.12*max(n.y,0.0); vec3 c=vCol.rgb*l; c+=vec3(0.035)*clamp(vH/40.0,0.0,1.0);' +
      ' float f=smoothstep(uFogR.x,uFogR.y,vDist); gl_FragColor=vec4(mix(c,uFog,f),vCol.a*uAlpha); }');
    var P_GROUND = prog(
      'attribute vec3 aPos; attribute vec2 aUV; uniform mat4 uVP; uniform vec3 uEye; varying vec2 vUV; varying float vDist; void main(){ vUV=aUV; vDist=distance(aPos,uEye); gl_Position=uVP*vec4(aPos,1.0); }',
      'precision mediump float; varying vec2 vUV; varying float vDist; uniform sampler2D uTex; uniform vec3 uFog; uniform vec2 uFogR; uniform float uPick;' +
      'void main(){ if(uPick>0.5){ gl_FragColor=vec4(0.0,0.0,0.0,1.0); return; } vec3 c=texture2D(uTex,vUV).rgb; float f=smoothstep(uFogR.x,uFogR.y,vDist); gl_FragColor=vec4(mix(c,uFog,f),1.0); }');
    var P_FLOW = prog(
      'attribute vec3 aPos; attribute vec2 aUV; attribute vec4 aCol; uniform mat4 uVP; varying vec2 vUV; varying vec4 vCol; void main(){ vUV=aUV; vCol=aCol; gl_Position=uVP*vec4(aPos,1.0); }',
      'precision mediump float; varying vec2 vUV; varying vec4 vCol; uniform float uTime;' +
      'void main(){ float d=fract(vUV.x/26.0-uTime*0.9); float e=1.0-abs(vUV.y*2.0-1.0); if(vUV.x>=0.0 && d>0.5) discard; gl_FragColor=vec4(vCol.rgb, vCol.a*smoothstep(0.0,0.35,e)); }');

    // ---------------------------------------------------- geometry builder
    function GB() { this.p = []; this.n = []; this.c = []; this.k = []; }
    GB.prototype.v = function (q, n, c, k) { this.p.push(q[0], q[1], q[2]); this.n.push(n[0], n[1], n[2]); this.c.push(c[0], c[1], c[2], c[3]); this.k.push(k[0], k[1], k[2], 1); };
    GB.prototype.quad = function (a, b, c, d, n, col, k) { this.v(a, n, col, k); this.v(b, n, col, k); this.v(c, n, col, k); this.v(a, n, col, k); this.v(c, n, col, k); this.v(d, n, col, k); };
    GB.prototype.box = function (x0, z0, x1, z1, y0, y1, col, k, topCol) {
      k = k || this.curK || [0, 0, 0];
      this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], topCol || col, k);
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, k);
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col, k);
      this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col, k);
      this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col, k);
    };
    // oriented box: centre (cx,cz), forward (fx,fz) unit vector, half-lengths along forward/right
    GB.prototype.obox = function (cx, cz, fx, fz, hf, hr, y0, y1, col) {
      var rx = -fz, rz = fx, P = function (a, b, y) { return [cx + fx * a + rx * b, y, cz + fz * a + rz * b]; }, k = this.curK || [0, 0, 0];
      this.quad(P(hf, -hr, y1), P(hf, hr, y1), P(-hf, hr, y1), P(-hf, -hr, y1), [0, 1, 0], col, k);
      this.quad(P(hf, -hr, y0), P(hf, hr, y0), P(hf, hr, y1), P(hf, -hr, y1), [fx, 0, fz], col, k);
      this.quad(P(-hf, hr, y0), P(-hf, -hr, y0), P(-hf, -hr, y1), P(-hf, hr, y1), [-fx, 0, -fz], col, k);
      this.quad(P(-hf, -hr, y0), P(hf, -hr, y0), P(hf, -hr, y1), P(-hf, -hr, y1), [-rx, 0, -rz], col, k);
      this.quad(P(hf, hr, y0), P(-hf, hr, y0), P(-hf, hr, y1), P(hf, hr, y1), [rx, 0, rz], col, k);
    };
    GB.prototype.wedge = function (cx, cz, fx, fz, pts, y0, y1, col) {
      // flat prism from a 2D outline given in (forward, right) coordinates
      var rx = -fz, rz = fx, k = this.curK || [0, 0, 0], self = this;
      var W = pts.map(function (q) { return [cx + fx * q[0] + rx * q[1], cz + fz * q[0] + rz * q[1]]; });
      for (var i = 1; i < W.length - 1; i++) {
        self.v([W[0][0], y1, W[0][1]], [0, 1, 0], col, k); self.v([W[i][0], y1, W[i][1]], [0, 1, 0], col, k); self.v([W[i + 1][0], y1, W[i + 1][1]], [0, 1, 0], col, k);
      }
      for (var j = 0; j < W.length; j++) {
        var a = W[j], b = W[(j + 1) % W.length], nx = b[1] - a[1], nz = -(b[0] - a[0]), l = Math.hypot(nx, nz) || 1;
        self.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [nx / l, 0, nz / l], col, k);
      }
    };
    function upload(name, gb, extra) {
      var m = meshes[name] || (meshes[name] = { b: {} });
      ['p', 'n', 'c', 'k'].forEach(function (key) {
        var b = m.b[key] || (m.b[key] = gl.createBuffer());
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gb[key]), gl.DYNAMIC_DRAW);
      });
      m.count = gb.p.length / 3;
      if (extra) for (var k in extra) m[k] = extra[k];
      return m;
    }
    function col(c, a) {
      if (!c) return [0.23, 0.25, 0.29, a === undefined ? 1 : a];
      var r, g, b;
      if (c.charAt(0) === '#') { var n = parseInt(c.slice(1), 16); r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255; }
      else { var m = c.match(/\d+/g); r = +m[0]; g = +m[1]; b = +m[2]; }
      return [r / 255, g / 255, b / 255, a === undefined ? 1 : a];
    }
    function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3]]; }
    function pickCol(id) { return [(id & 255) / 255, ((id >> 8) & 255) / 255, ((id >> 16) & 255) / 255]; }

    // ------------------------------------------------------- ground art
    function paintGround(ctx) {
      ctx.fillStyle = BASE_COLORS.land; ctx.fillRect(-500, -500, WORLD.w + 1000, WORLD.h + 1000);
      var order = { airfield: 0, urban: 1, forest: 2, beige: 3, water: 4, apronbld: 5, paved: 6, roadfill: 7 };
      var base = S.features.filter(function (f) { return f.type === 'base'; }).sort(function (a, b) { return (order[a.cls] || 0) - (order[b.cls] || 0); });
      base.forEach(function (f) {
        if (f.cls === 'roadfill') return;
        ctx.fillStyle = BASE_COLORS[f.cls] || BASE_COLORS.land;
        ctx.fill(new Path2D(f.path), 'evenodd');
      });
      // apron concrete around piers and terminals (airside)
      ctx.fillStyle = '#2a3341';
      S.features.forEach(function (f) {
        if (f.type !== 'pier' && f.type !== 'ghostpier' && f.type !== 'terminal' && f.type !== 'closed') return;
        var r = f.box, pad = f.type === 'pier' ? 78 : 26;
        roundRect(ctx, r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2, 18); ctx.fill();
      });
      base.forEach(function (f) {
        if (f.cls !== 'roadfill') return;
        ctx.fillStyle = '#0f151c'; ctx.lineWidth = 3; ctx.strokeStyle = '#0f151c';
        var p = new Path2D(f.path); ctx.stroke(p);
        ctx.fillStyle = BASE_COLORS.roadfill; ctx.fill(p, 'evenodd');
      });
      // stand markings: yellow lead-in line and stop bar
      ctx.strokeStyle = 'rgba(255,198,39,.75)'; ctx.lineWidth = 1.4;
      S.features.forEach(function (f) {
        if (f.type !== 'stand') return;
        var r = f.box, cx = r.x + r.w / 2, cy = r.y + r.h / 2, h = (f.heading || 0) * D2R, fx = Math.sin(h), fy = -Math.cos(h), L = r.w * 0.62;
        ctx.beginPath(); ctx.moveTo(cx - fx * L, cy - fy * L); ctx.lineTo(cx + fx * L * 0.55, cy + fy * L * 0.55); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + fx * L * 0.55 - fy * 7, cy + fy * L * 0.55 + fx * 7); ctx.lineTo(cx + fx * L * 0.55 + fy * 7, cy + fy * L * 0.55 - fx * 7); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.strokeRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6); ctx.strokeStyle = 'rgba(255,198,39,.75)';
      });
      // runway markings
      S.features.forEach(function (f) {
        if (f.type !== 'runwayline') return;
        var L = f.line, ang = Math.atan2(L[3] - L[1], L[2] - L[0]), len = Math.hypot(L[2] - L[0], L[3] - L[1]);
        ctx.save(); ctx.translate(L[0], L[1]); ctx.rotate(ang);
        ctx.fillStyle = '#3b4655'; ctx.fillRect(-6, -17, len + 12, 34);
        ctx.fillStyle = 'rgba(235,240,246,.9)';
        for (var x = 120; x < len - 120; x += 46) ctx.fillRect(x, -0.9, 26, 1.8);
        ctx.fillRect(0, -16.5, len, 0.9); ctx.fillRect(0, 15.6, len, 0.9);
        [6, len - 32].forEach(function (x0) { for (var i = -6; i <= 6; i++) { if (!i) continue; ctx.fillRect(x0, i * 2.3 - 0.8, 26, 1.4); } });
        [190, len - 214].forEach(function (x0) { ctx.fillRect(x0, -10, 24, 3); ctx.fillRect(x0, 7, 24, 3); });
        var ends = (f.ends || '').split('|');
        ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.save(); ctx.translate(54, 0); ctx.rotate(Math.PI / 2); ctx.fillText(ends[0] || '', 0, 0); ctx.restore();
        ctx.save(); ctx.translate(len - 54, 0); ctx.rotate(-Math.PI / 2); ctx.fillText(ends[1] || '', 0, 0); ctx.restore();
        ctx.restore();
      });
    }
    function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function makeTexture(region, size) {
      var cv = document.createElement('canvas');
      cv.width = cv.height = size;
      var ctx = cv.getContext('2d');
      var sx = size / region.w, sy = size / region.h;
      ctx.setTransform(sx, 0, 0, sy, -region.x * sx, -region.y * sy);
      paintGround(ctx);
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      return t;
    }
    function groundQuad(name, r, y, texture) {
      var g = { p: [], uv: [] };
      var x0 = r.x, z0 = r.y, x1 = r.x + r.w, z1 = r.y + r.h;
      g.p = [x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z0, x1, y, z1, x0, y, z1];
      g.uv = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];
      var m = meshes[name] || (meshes[name] = { b: {} });
      m.b.p = m.b.p || gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.b.p); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.p), gl.STATIC_DRAW);
      m.b.uv = m.b.uv || gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.b.uv); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.uv), gl.STATIC_DRAW);
      m.count = 6; m.tex = texture;
    }

    // ------------------------------------------------------ static scene
    var C = {
      floor: col('#1b2430'), wall: col('#33414f'), wallTop: col('#46566a'), slab: col('#222c38'), seat: col('#34404f'),
      desk: col('#3d4a5b'), closed: col('#262c34'), station: col('#2f3c4c'), stationTop: col('#3e4e62'), glass: col('#3a5872'),
      plane: col('#dfe5ec'), wing: col('#b9c2cd'), tail: col('#8d99a8'), engine: col('#7c8796'), hotel: col('#3a4250'), hotelTop: col('#4a5466'), shed: col('#2c3440')
    };
    function aircraft(gb, cx, cz, headingDeg, size) {
      var h = headingDeg * D2R, fx = Math.sin(h), fz = -Math.cos(h), L = size;
      var rx = -fz, rz = fx;
      gb.obox(cx, cz, fx, fz, L * 0.5, L * 0.065, 2.2, 2.2 + L * 0.13, C.plane);                       // fuselage
      gb.obox(cx + fx * L * 0.47, cz + fz * L * 0.47, fx, fz, L * 0.05, L * 0.04, 2.6, 2.2 + L * 0.11, C.plane); // nose taper
      gb.wedge(cx + fx * L * 0.02, cz + fz * L * 0.02, fx, fz, [[L * 0.12, L * 0.06], [-L * 0.1, L * 0.5], [-L * 0.2, L * 0.5], [-L * 0.08, L * 0.06]], 2.2 + L * 0.03, 2.2 + L * 0.05, C.wing);
      gb.wedge(cx + fx * L * 0.02, cz + fz * L * 0.02, fx, fz, [[L * 0.12, -L * 0.06], [-L * 0.08, -L * 0.06], [-L * 0.2, -L * 0.5], [-L * 0.1, -L * 0.5]], 2.2 + L * 0.03, 2.2 + L * 0.05, C.wing);
      gb.wedge(cx - fx * L * 0.4, cz - fz * L * 0.4, fx, fz, [[L * 0.05, L * 0.04], [-L * 0.06, L * 0.2], [-L * 0.11, L * 0.2], [-L * 0.06, L * 0.04]], 2.2 + L * 0.1, 2.2 + L * 0.115, C.wing);
      gb.wedge(cx - fx * L * 0.4, cz - fz * L * 0.4, fx, fz, [[L * 0.05, -L * 0.04], [-L * 0.06, -L * 0.04], [-L * 0.11, -L * 0.2], [-L * 0.06, -L * 0.2]], 2.2 + L * 0.1, 2.2 + L * 0.115, C.wing);
      gb.obox(cx - fx * L * 0.42, cz - fz * L * 0.42, fx, fz, L * 0.075, L * 0.012, 2.2 + L * 0.12, 2.2 + L * 0.3, C.tail); // fin
      [1, -1].forEach(function (s) { gb.obox(cx + fx * L * 0.04 + rx * s * L * 0.2, cz + fz * L * 0.04 + rz * s * L * 0.2, fx, fz, L * 0.06, L * 0.03, 2.2 - L * 0.01, 2.2 + L * 0.045, C.engine); });
    }
    function walls(gb, r, h) {
      var t = 2.6;
      gb.box(r.x, r.y, r.x + r.w, r.y + t, FLOOR, h, C.wall, null, C.wallTop);
      gb.box(r.x, r.y + r.h - t, r.x + r.w, r.y + r.h, FLOOR, h, C.wall, null, C.wallTop);
      gb.box(r.x, r.y, r.x + t, r.y + r.h, FLOOR, h, C.wall, null, C.wallTop);
      gb.box(r.x + r.w - t, r.y, r.x + r.w, r.y + r.h, FLOOR, h, C.wall, null, C.wallTop);
    }
    function buildStatic() {
      var gb = new GB(), po = new GB();
      S.features.forEach(function (f) {
        var r = f.box;
        gb.curK = f.asset && S.assetIdx[f.asset] !== undefined ? pickCol(10000 + S.assetIdx[f.asset]) : null;
        switch (f.type) {
          case 'terminal': gb.box(r.x, r.y, r.x + r.w, r.y + r.h, 0, FLOOR, C.floor); walls(gb, r, WALL.terminal); break;
          case 'pier':
            gb.box(r.x, r.y, r.x + r.w, r.y + r.h, 0, FLOOR, C.floor); walls(gb, r, WALL.pier);
            if (r.w > r.h) gb.box(r.x + 4, r.y + 54, r.x + r.w - 4, r.y + r.h - 54, FLOOR, FLOOR + 0.3, C.slab);
            else gb.box(r.x + r.w / 2 - 14, r.y + 4, r.x + r.w / 2 + 14, r.y + r.h - 4, FLOOR, FLOOR + 0.3, C.slab);
            break;
          case 'closed': gb.box(r.x, r.y, r.x + r.w, r.y + r.h, 0, 11, C.closed, null, col('#2c333c')); break;
          case 'ghostpier': gb.box(r.x, r.y, r.x + r.w, r.y + r.h, 0, 4, C.closed); break;
          case 'station': gb.box(r.x, r.y, r.x + r.w, r.y + r.h, 0, WALL.station, C.station, null, C.stationTop); gb.box(r.x + 8, r.y + 8, r.x + r.w - 8, r.y + r.h - 8, WALL.station, WALL.station + 2.5, C.glass); break;
          case 'walkway': gb.box(r.x, r.y, r.x + r.w, r.y + r.h, 9, 13, C.glass, null, col('#4b6a86')); break;
          case 'holdroom':
            gb.box(r.x, r.y, r.x + r.w, r.y + r.h, FLOOR, FLOOR + 0.25, C.slab);
            var horiz = r.w > r.h, n = 3;
            for (var i = 0; i < n; i++) {
              if (horiz) { var zz = r.y + (i + 1) * r.h / (n + 1); gb.box(r.x + 3, zz - 1.2, r.x + r.w - 3, zz + 1.2, FLOOR, FLOOR + 1.6, C.seat); }
              else { var xx = r.x + (i + 1) * r.w / (n + 1); gb.box(xx - 1.2, r.y + 3, xx + 1.2, r.y + r.h - 3, FLOOR, FLOOR + 1.6, C.seat); }
            }
            break;
          case 'checkin': gb.box(r.x + 2, r.y + 2, r.x + r.w - 2, r.y + r.h - 2, FLOOR, FLOOR + 3.5, C.desk); break;
          case 'security':
            var vert = r.h > r.w, nl = Math.max(3, Math.floor((vert ? r.h : r.w) / 26));
            for (var s = 0; s < nl; s++) {
              var q = 8 + s * ((vert ? r.h : r.w) - 16) / (nl - 1);
              if (vert) gb.box(r.x + 2, r.y + q - 1.5, r.x + r.w - 2, r.y + q + 1.5, FLOOR, FLOOR + 3, C.desk);
              else gb.box(r.x + q - 1.5, r.y + 2, r.x + q + 1.5, r.y + r.h - 2, FLOOR, FLOOR + 3, C.desk);
            }
            break;
          case 'stand': var sa = S.akpi[f.asset]; if (!(sa && sa.avail !== null && sa.avail < 0.8)) aircraft(gb, r.x + r.w / 2, r.y + r.h / 2, f.heading || 0, r.w * 0.82); else gb.box(r.x + r.w * 0.3, r.y + r.h * 0.3, r.x + r.w * 0.7, r.y + r.h * 0.7, 0, 0.6, col('#3a4553')); break;
          case 'runwayline': var L0 = f.line, ln = Math.hypot(L0[2] - L0[0], L0[3] - L0[1]); po.curK = gb.curK; po.obox((L0[0] + L0[2]) / 2, (L0[1] + L0[3]) / 2, (L0[2] - L0[0]) / ln, (L0[3] - L0[1]) / ln, ln / 2, 24, 0, 0.6, [0, 0, 0, 1]); break;
          case 'gate': if (!f.closed) gb.box(r.x - 1.5, r.y - 1.5, r.x + 1.5, r.y + 1.5, 0, 6, col('#ffc627')); break;
          case 'poi':
            if (/radisson/i.test(f.name)) gb.box(r.x - 28, r.y - 34, r.x + 28, r.y + 26, 0, 46, C.hotel, null, C.hotelTop);
            else if (/clayton/i.test(f.name)) gb.box(r.x - 26, r.y - 30, r.x + 30, r.y + 22, 0, 34, C.hotel, null, C.hotelTop);
            else if (/freight/i.test(f.name)) { gb.box(r.x - 80, r.y - 50, r.x + 40, r.y + 10, 0, 13, C.shed); gb.box(r.x - 60, r.y + 22, r.x + 70, r.y + 74, 0, 11, C.shed); }
            break;
        }
      });
      upload('static', gb);
      upload('pickonly', po);
    }

    // ----------------------------------------------------- dynamic scene
    function roofAlpha() { return Math.max(0, Math.min(1, (cam.dist - 1150) / 650)); }
    function heightT(u, dom) {
      var v = lensValue(u, S.lens);
      if (v === null || v === undefined) return 0.08;
      if (S.lens === 'profit' || S.lens === 'sqm') { var k = LENS_K[S.lens]; return Math.min(1, Math.abs(symlog(v, k)) / (symlog(dom.maxAbs || 1, k) || 1)); }
      if (S.lens === 'var') return Math.min(1, Math.abs(v) / 0.4);
      if (S.lens === 'spp') { var lo = Math.log10(Math.max(dom.min, 0.01)), hi = Math.log10(Math.max(dom.max, 0.02)); return Math.max(0.05, (Math.log10(Math.max(v, 0.01)) - lo) / (hi - lo || 1)); }
      if (S.lens === 'lease') return Math.max(0.08, Math.min(1, 1 - v / 36));
      var d = unitData(u.code); return d ? Math.min(1, Math.sqrt(d.sales / 3e7)) : 0.1;
    }
    function buildDynamic() {
      var ra = roofAlpha(), grow = 1 - ra, dom = domain(S.lens), gb = new GB(), sel = new GB();
      var grey = col('#2a313b');
      unitList = [];
      S.units.forEach(function (u, i) {
        var r = u.box, inside = u.terminal !== 'Ground', t = heightT(u, dom);
        var c = col(colorFor(u, S.lens, dom));
        if (!inScope(u)) c = mix(c, grey, 0.72);
        if (S.showProjects) c = mix(c, grey, 0.45);
        var y0 = inside ? FLOOR : 0, h;
        if (inside) h = 2.5 + t * 46 * grow;
        else if (/multi-storey/i.test(u.name)) h = 16 + t * 26;
        else h = 1.6 + t * 14;
        var id = i + 1;
        gb.box(r.x + 1.2, r.y + 1.2, r.x + r.w - 1.2, r.y + r.h - 1.2, y0, y0 + h, mix(c, [0, 0, 0, 1], 0.18), pickCol(id), c);
        unitList.push({ u: u, top: y0 + h });
        if (S.selected === u.code) {
          sel.box(r.x - 3, r.y - 3, r.x + r.w + 3, r.y + r.h + 3, y0, y0 + h + 4, [1, 0.78, 0.15, 0.32]);
          sel.box(r.x + r.w / 2 - 1, r.y + r.h / 2 - 1, r.x + r.w / 2 + 1, r.y + r.h / 2 + 1, y0 + h, y0 + h + 40, [1, 0.78, 0.15, 0.9]);
        }
      });
      if (S.selAsset) {
        S.features.forEach(function (f) {
          if (f.asset !== S.selAsset || f.type === 'gate') return;
          var r = f.box, Y = { terminal: WALL.terminal + 3, pier: WALL.pier + 3, closed: 14, station: WALL.station + 4, walkway: 15, stand: 12, security: 6, checkin: 6, holdroom: 4 }[f.type] || 10;
          if (f.type === 'runwayline') { var L1 = f.line, l1 = Math.hypot(L1[2] - L1[0], L1[3] - L1[1]); sel.obox((L1[0] + L1[2]) / 2, (L1[1] + L1[3]) / 2, (L1[2] - L1[0]) / l1, (L1[3] - L1[1]) / l1, l1 / 2 + 6, 26, 0.2, 5, [1, 0.78, 0.15, 0.4]); return; }
          if (f.type === 'poi') { sel.box(r.x - 40, r.y - 44, r.x + 40, r.y + 36, 0, 52, [1, 0.78, 0.15, 0.25]); return; }
          sel.box(r.x - 3, r.y - 3, r.x + r.w + 3, r.y + r.h + 3, 0, Y, [1, 0.78, 0.15, f.type === 'terminal' || f.type === 'pier' ? 0.14 : 0.3]);
        });
      }
      upload('units', gb);
      upload('sel', sel);
      buildProjects();
      // zone roofs coloured by zone total
      var vals = S.aggs.map(function (g) { return zoneAgg(g.zone, S.lens); });
      var adom = { maxAbs: 0, min: Infinity, max: -Infinity };
      vals.forEach(function (a) { if (typeof a.v === 'number' && isFinite(a.v)) { adom.maxAbs = Math.max(adom.maxAbs, Math.abs(a.v)); adom.min = Math.min(adom.min, a.v); adom.max = Math.max(adom.max, a.v); } });
      var rb = new GB();
      aggList = [];
      S.aggs.forEach(function (g, i) {
        var f = S.features.filter(function (x) { return x.zone === g.zone && (x.type === 'zone' || x.type === 'pier' || x.type === 'station'); });
        var c = vals[i].v === null ? grey : col(valueColor(vals[i].v, S.lens, adom));
        if (S.zone && S.zone !== g.zone) c = mix(c, grey, 0.6);
        f.forEach(function (ff) {
          var r = ff.box, h = ff.type === 'pier' ? WALL.pier : ff.type === 'station' ? WALL.station + 2.6 : WALL.terminal;
          rb.box(r.x + 1, r.y + 1, r.x + r.w - 1, r.y + r.h - 1, h, h + 2, c, pickCol(5000 + i));
          aggList.push({ zone: g.zone, x: r.x + r.w / 2, z: r.y + r.h / 2, y: h + 2, text: vals[i].text, w: r.w });
        });
      });
      upload('roofs', rb);
      buildFlow();
      dirty = true;
    }
    function buildProjects() {
      var tv = new GB(), cr = new GB();
      projList = [];
      if (S.showProjects) S.projects.forEach(function (p, i) {
        if (!projVisible(p)) return;
        var c = col(PSTAT[p.status] || '#94a3b8'), on = S.selProject === p.id, k = pickCol(20000 + i);
        var vol = [c[0], c[1], c[2], on ? 0.34 : 0.2], beam = [c[0], c[1], c[2], 0.95];
        tv.curK = k; cr.curK = k;
        var H = { 'In delivery': 30, 'Approved': 20, 'Design': 15, 'Proposed': 11 }[p.status] || 12;
        if (p.line) {
          var L = p.line, ln = Math.hypot(L[2] - L[0], L[3] - L[1]), fx = (L[2] - L[0]) / ln, fz = (L[3] - L[1]) / ln;
          tv.obox((L[0] + L[2]) / 2, (L[1] + L[3]) / 2, fx, fz, ln / 2, 34, 0.3, 4, vol);
          for (var d = 80; d < ln - 60; d += 140) cr.obox(L[0] + fx * d - fz * 30, L[1] + fz * d + fx * 30, fx, fz, 4, 4, 0, 7, beam);
          projList.push({ p: p, x: (L[0] + L[2]) / 2, z: (L[1] + L[3]) / 2, y: 12 });
          return;
        }
        var r = p.box, x0 = r.x, z0 = r.y, x1 = r.x + r.w, z1 = r.y + r.h, t = 1.4;
        tv.box(x0, z0, x1, z1, 0.2, H, vol);
        [[x0, z0, x1, z0 + t], [x0, z1 - t, x1, z1], [x0, z0, x0 + t, z1], [x1 - t, z0, x1, z1]].forEach(function (e) { tv.box(e[0], e[1], e[2], e[3], H - t, H, beam); tv.box(e[0], e[1], e[2], e[3], 0.2, 1.2, beam); });
        [[x0, z0], [x1 - t, z0], [x0, z1 - t], [x1 - t, z1 - t]].forEach(function (q) { tv.box(q[0], q[1], q[0] + t, q[1] + t, 0, H, beam); });
        if (p.status === 'In delivery') {
          var mx = x0 + Math.min(18, r.w * 0.2), mz = z0 + Math.min(18, r.h * 0.2), CH = 92, a = (i * 67 + 30) * D2R, jx = Math.cos(a), jz = Math.sin(a);
          var crane = col('#f2b01e');
          cr.box(mx - 2.6, mz - 2.6, mx + 2.6, mz + 2.6, 0, CH, crane);
          cr.obox(mx + jx * 34, mz + jz * 34, jx, jz, 38, 1.6, CH, CH + 3.2, crane);
          cr.obox(mx - jx * 12, mz - jz * 12, jx, jz, 12, 1.8, CH, CH + 2.6, crane);
          cr.obox(mx - jx * 20, mz - jz * 20, jx, jz, 4, 3, CH - 5, CH, col('#5d6773'));
          cr.box(mx - 2, mz - 2, mx + 2, mz + 2, CH + 3.2, CH + 9, crane);
          cr.obox(mx + jx * 52, mz + jz * 52, jx, jz, 0.4, 0.4, H + 6, CH, col('#cfd6df'));
          cr.box(mx + jx * 52 - 2, mz + jz * 52 - 2, mx + jx * 52 + 2, mz + jz * 52 + 2, H + 3, H + 6, col('#cfd6df'));
        }
        projList.push({ p: p, x: r.x + r.w / 2, z: r.y + r.h / 2, y: p.status === 'In delivery' ? 100 : H + 4 });
      });
      upload('proj', tv);
      upload('cranes', cr);
    }
    var projList = [];
    function buildFlow() {
      var g = { p: [], uv: [], c: [] };
      if (S.flow) {
        var piers = {}, maxP = 1, maxGate = 1;
        S.features.forEach(function (f) { if (f.type === 'gate') { var p = piers[f.pier] = piers[f.pier] || { pax: 0 }; p.pax += S.gatePax[f.label] || 0; maxGate = Math.max(maxGate, S.gatePax[f.label] || 0); } });
        for (var k in piers) maxP = Math.max(maxP, piers[k].pax);
        var ribbon = function (pts, w, c) {
          var acc = 0;
          for (var i = 0; i < pts.length - 1; i++) {
            var a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2, y = 20;
            var q = [[a[0] + nx, y, a[1] + nz, acc, 0], [b[0] + nx, y, b[1] + nz, acc + l, 0], [b[0] - nx, y, b[1] - nz, acc + l, 1], [a[0] - nx, y, a[1] - nz, acc, 1]];
            [0, 1, 2, 0, 2, 3].forEach(function (j) { g.p.push(q[j][0], q[j][1], q[j][2]); g.uv.push(q[j][3], q[j][4]); g.c.push(c[0], c[1], c[2], c[3]); });
            acc += l;
          }
        };
        var disc = function (cx, cz, rad, c) {
          for (var i = 0; i < 24; i++) {
            var a0 = i / 24 * Math.PI * 2, a1 = (i + 1) / 24 * Math.PI * 2;
            [[cx, cz, 1], [cx + Math.cos(a0) * rad, cz + Math.sin(a0) * rad, 0], [cx + Math.cos(a1) * rad, cz + Math.sin(a1) * rad, 0]].forEach(function (q) { g.p.push(q[0], 19, q[1]); g.uv.push(-1, q[2] * 0.5); g.c.push(c[0], c[1], c[2], c[3]); });
          }
        };
        S.features.forEach(function (f) {
          if (f.type === 'pier') {
            var sec = S.features.filter(function (x) { return x.type === 'security' && x.terminal === f.terminal; })[0];
            if (!sec) return;
            var p = piers[f.zone] || { pax: 0 }, sx = sec.box.x + sec.box.w / 2, sz = sec.box.y + sec.box.h / 2, r = f.box, pts;
            if (r.w > r.h) { var west = r.x < sec.box.x, rx = west ? r.x + r.w : r.x, tx = west ? r.x + 12 : r.x + r.w - 12, pz = r.y + r.h / 2; pts = [[sx, sz], [(sx + rx) / 2, sz], [(sx + rx) / 2, pz], [rx, pz], [tx, pz]]; }
            else { var down = r.y > sec.box.y, ry = down ? r.y : r.y + r.h, ty = down ? r.y + r.h - 12 : r.y + 12, px = r.x + r.w / 2; pts = [[sx, sz], [sx, (sz + ry) / 2], [px, (sz + ry) / 2], [px, ry], [px, ty]]; }
            ribbon(pts, 5 + 16 * p.pax / maxP, [1, 0.78, 0.15, 0.95]);
          }
          if (f.type === 'gate' && !f.closed) {
            var v = S.gatePax[f.label] || 0, b = S.gateBudget[f.label] || 0, low = b && v < b * 0.8;
            disc(f.box.x, f.box.y, 4 + 13 * Math.sqrt(v / maxGate), low ? [0.94, 0.42, 0.42, 0.45] : [1, 0.78, 0.15, 0.4]);
          }
        });
      }
      var m = meshes.flow || (meshes.flow = { b: {} });
      [['p', g.p], ['uv', g.uv], ['c', g.c]].forEach(function (e) { var b = m.b[e[0]] || (m.b[e[0]] = gl.createBuffer()); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(e[1]), gl.DYNAMIC_DRAW); });
      m.count = g.p.length / 3;
    }

    // ---------------------------------------------------------- drawing
    function bindAttr(prg, name, buf, size) { var loc = prg.a[name]; if (loc === undefined || loc < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); }
    function drawMesh(m, alpha, pick) {
      if (!m || !m.count) return;
      var p = P_MESH;
      bindAttr(p, 'aPos', m.b.p, 3); bindAttr(p, 'aNor', m.b.n, 3); bindAttr(p, 'aCol', pick ? m.b.k : m.b.c, 4);
      gl.uniform1f(p.u.uAlpha, alpha === undefined ? 1 : alpha);
      gl.drawArrays(gl.TRIANGLES, 0, m.count);
    }
    var MAXA = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    function resetAttribs() { for (var i = 0; i < Math.min(8, MAXA); i++) gl.disableVertexAttribArray(i); }
    function setCommon(p, pick) {
      resetAttribs();
      gl.useProgram(p.p);
      gl.uniformMatrix4fv(p.u.uVP, false, new Float32Array(VP));
      if (p.u.uEye) gl.uniform3fv(p.u.uEye, eye);
      if (p.u.uFog) gl.uniform3fv(p.u.uFog, [0.043, 0.058, 0.078]);
      if (p.u.uFogR) gl.uniform2fv(p.u.uFogR, [cam.dist * 1.6, cam.dist * 4.5 + 2500]);
      if (p.u.uPick) gl.uniform1f(p.u.uPick, pick ? 1 : 0);
      if (p.u.uLight) { var L = [-0.45, 0.85, 0.35], l = Math.hypot(L[0], L[1], L[2]); gl.uniform3fv(p.u.uLight, [L[0] / l, L[1] / l, L[2] / l]); }
    }
    function drawScene(pick, time) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(pick ? 0 : 0.043, pick ? 0 : 0.058, pick ? 0 : 0.078, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
      // ground
      setCommon(P_GROUND, pick);
      gl.uniform1i(P_GROUND.u.uTex, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      ['groundFar', 'groundAll', 'groundDetail'].forEach(function (n, i) {
        var m = meshes[n]; if (!m) return;
        gl.polygonOffset(-i, -i);
        gl.bindTexture(gl.TEXTURE_2D, m.tex);
        bindAttr(P_GROUND, 'aPos', m.b.p, 3); bindAttr(P_GROUND, 'aUV', m.b.uv, 2);
        if (P_GROUND.a.aCol !== undefined) gl.disableVertexAttribArray(P_GROUND.a.aCol);
        gl.drawArrays(gl.TRIANGLES, 0, m.count);
      });
      gl.disable(gl.POLYGON_OFFSET_FILL);
      // solids
      setCommon(P_MESH, pick);
      drawMesh(meshes.static, 1, pick);
      drawMesh(meshes.units, 1, pick);
      drawMesh(meshes.cranes, 1, pick);
      var ra = roofAlpha();
      if (pick) { drawMesh(meshes.pickonly, 1, true); if (ra > 0.5) drawMesh(meshes.roofs, 1, true); drawMesh(meshes.proj, 1, true); return; }
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      if (ra > 0.01) drawMesh(meshes.roofs, 0.94 * ra, false);
      drawMesh(meshes.proj, 1, false);
      drawMesh(meshes.sel, 1, false);
      gl.depthMask(true);
      if (S.flow && meshes.flow && meshes.flow.count) {
        gl.disable(gl.DEPTH_TEST);
        resetAttribs();
        gl.useProgram(P_FLOW.p);
        gl.uniformMatrix4fv(P_FLOW.u.uVP, false, new Float32Array(VP));
        gl.uniform1f(P_FLOW.u.uTime, time / 1000);
        bindAttr(P_FLOW, 'aPos', meshes.flow.b.p, 3); bindAttr(P_FLOW, 'aUV', meshes.flow.b.uv, 2); bindAttr(P_FLOW, 'aCol', meshes.flow.b.c, 4);
        gl.drawArrays(gl.TRIANGLES, 0, meshes.flow.count);
        gl.enable(gl.DEPTH_TEST);
      }
      gl.disable(gl.BLEND);
    }
    function pickAt(sx, sy) {
      var w = canvas.width, h = canvas.height;
      if (!pickFB || pickW !== w || pickH !== h) {
        if (pickFB) { gl.deleteFramebuffer(pickFB); gl.deleteTexture(pickTex); gl.deleteRenderbuffer(pickDepth); }
        pickFB = gl.createFramebuffer(); pickTex = gl.createTexture(); pickDepth = gl.createRenderbuffer();
        gl.bindTexture(gl.TEXTURE_2D, pickTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindRenderbuffer(gl.RENDERBUFFER, pickDepth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
        gl.bindFramebuffer(gl.FRAMEBUFFER, pickFB);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickTex, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, pickDepth);
        pickW = w; pickH = h;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, pickFB);
      drawScene(true, 0);
      var px = new Uint8Array(4);
      gl.readPixels(Math.floor(sx * dpr), Math.floor(h - sy * dpr - 1), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      dirty = true;
      var id = px[0] + (px[1] << 8) + (px[2] << 16);
      if (!id) return null;
      if (id >= 20000) { var pj = S.projects[id - 20000]; return pj ? { project: pj } : null; }
      if (id >= 10000) { var as = S.assets[id - 10000]; return as ? { asset: as } : null; }
      if (id >= 5000) { var a = S.aggs[id - 5000]; return a ? { zone: a.zone } : null; }
      var u = S.units[id - 1];
      return u ? { unit: u } : null;
    }

    // ----------------------------------------------------------- labels
    function addLabel(text, cls, x, y, z, show, extra) {
      var el = document.createElement('div');
      el.className = 'l3 ' + cls;
      if (extra && extra.html) el.innerHTML = extra.html; else el.textContent = text;
      overlay.appendChild(el);
      var L = { el: el, x: x, y: y, z: z, show: show, vis: false };
      if (extra) for (var k in extra) L[k] = extra[k];
      labels.push(L);
      return L;
    }
    function buildLabels() {
      overlay.innerHTML = ''; labels = [];
      S.features.forEach(function (f) {
        var r = f.box;
        if (f.type === 'place') addLabel(f.label, 'place', f.labelX, 0, f.labelY, function (d) { return d > 1500; });
        else if (f.type === 'roadlabel') addLabel(f.label, 'road', f.labelX, 0, f.labelY, function (d) { return d > 1300 && d < 6000; });
        else if (f.type === 'poi') addLabel(f.label, 'poi', r.x, /radisson/i.test(f.name) ? 48 : /clayton/i.test(f.name) ? 36 : 16, r.y, function (d) { return d < 3600; });
        else if (f.type === 'terminal' || f.type === 'closed') addLabel(f.label + (f.sub ? ' · ' + f.sub : ''), 'term' + (f.type === 'closed' ? ' closed' : ''), r.x + r.w / 2, f.type === 'closed' ? 14 : WALL.terminal + 4, r.y + (f.type === 'closed' ? r.h / 2 : 0), function (d) { return f.type === 'closed' ? d < 2600 : d > 700 && d < 2400; });
        else if (f.type === 'gate' && !f.closed) addLabel(f.label, 'gate', r.x, 7, r.y, function (d) { return d < 1000; });
      });
      S.units.forEach(function (u) {
        var r = u.box;
        addLabel(u.name, u.terminal === 'Ground' ? 'park' : 'unit', r.x + r.w / 2, 0, r.y + r.h / 2, null, { unit: u, w: r.w, h: r.h });
      });
    }
    function updateLabels() {
      var ra = roofAlpha();
      compass.firstChild.style.transform = 'rotate(' + cam.yaw.toFixed(1) + 'deg)';
      var tops = {};
      unitList.forEach(function (e) { tops[e.u.code] = e.top; });
      var zoneLabels = {};
      aggList.forEach(function (a) { var k = a.zone; if (!zoneLabels[k] || a.w > zoneLabels[k].w) zoneLabels[k] = a; });
      var placed = [];
      function place(p, w, h) {
        var r = { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - h / 2, y1: p.y + h / 2 };
        for (var i = 0; i < placed.length; i++) { var q = placed[i]; if (r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0) return false; }
        placed.push(r); return true;
      }
      function chip(cls, title, value, p, opacity) {
        var el = document.createElement('div');
        el.className = 'l3 zone ' + cls;
        el.style.opacity = opacity.toFixed(2);
        el.innerHTML = '<b>' + esc(title) + '</b><span>' + esc(value) + '</span>';
        el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
        overlay.appendChild(el);
      }
      var old = overlay.querySelectorAll('.l3.zone');
      for (var i = 0; i < old.length; i++) old[i].remove();
      // 1. area callouts (whole-airport view) or zone totals (mid range) take priority
      var oldp = overlay.querySelectorAll('.l3.proj');
      for (var j = 0; j < oldp.length; j++) oldp[j].remove();
      projList.slice().sort(function (a, b) { return (b.p.id === S.selProject) - (a.p.id === S.selProject) || b.p.forecast - a.p.forecast; }).forEach(function (q) {
        var p = project([q.x, q.y, q.z]);
        if (!p || p.x < 0 || p.y < 0 || p.x > cssW || p.y > cssH) return;
        var w = Math.max(q.p.name.length * 6.4, 120);
        if (!place({ x: p.x, y: p.y - 18 }, w, 36) && q.p.id !== S.selProject) return;
        var el = document.createElement('div');
        el.className = 'l3 proj';
        el.style.borderColor = PSTAT[q.p.status] || '#94a3b8';
        if (q.p.id === S.selProject) el.style.boxShadow = '0 0 0 2px ' + (PSTAT[q.p.status] || '#94a3b8');
        el.innerHTML = '<b>' + esc(q.p.name) + '</b>' + esc(q.p.status) + ' · ' + money(q.p.forecast) + ' · ' + ymLabel(q.p.e - 1);
        el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
        overlay.appendChild(el);
      });
      if (cam.dist >= 2300 && !S.showProjects) {
        [['T2', 'Terminal 2'], ['T3', 'Terminal 3'], ['Landside', 'Station & Skylink'], ['Ground', 'Car parks']].forEach(function (t) {
          var pts = S.units.filter(function (u) { return u.terminal === t[0]; });
          if (!pts.length) return;
          var cx = 0, cz = 0; pts.forEach(function (u) { cx += u.box.x + u.box.w / 2; cz += u.box.y + u.box.h / 2; }); cx /= pts.length; cz /= pts.length;
          if (t[0] === 'Ground') { cx = 3150; cz = 520; }
          var p = project([cx, 60, cz]);
          if (!p || p.x < 0 || p.y < 0 || p.x > cssW || p.y > cssH) return;
          var a = zoneAgg(t[0], S.lens, 'terminal');
          var cp = { x: p.x, y: p.y - 26 }, tries = 0;
          while (!place({ x: cp.x, y: cp.y - 22 }, Math.max(t[1].length * 8, 90) + 20, 50) && tries++ < 4) cp.y -= 54;
          chip('callout', t[1], a.text, cp, Math.min(1, (cam.dist - 2300) / 300));
        });
      } else if (ra > 0.35 && !S.showProjects) {
        Object.keys(zoneLabels).sort(function (a, b) { return zoneLabels[b].w - zoneLabels[a].w; }).forEach(function (k) {
          var a = zoneLabels[k], p = project([a.x, a.y, a.z]);
          if (!p || p.x < -60 || p.y < -30 || p.x > cssW + 60 || p.y > cssH + 30) return;
          if (!place(p, Math.max(k.length, a.text.length) * 7 + 12, 34)) return;
          chip('', k, a.text, p, Math.min(1, (ra - 0.35) / 0.4));
        });
      }
      // 2. everything else; unit and car-park names avoid overlaps
      var sorted = labels.slice().sort(function (a, b) { return (b.unit && S.selected === b.unit.code ? 1 : 0) - (a.unit && S.selected === a.unit.code ? 1 : 0); });
      sorted.forEach(function (L) {
        var show = true, p;
        if (L.unit) {
          var top = tops[L.unit.code] || 2, isSel = S.selected === L.unit.code;
          p = project([L.x, top + 1.5, L.z]);
          if (L.unit.terminal === 'Ground') show = cam.dist < 2100 || isSel;
          else if (ra > 0.4 && !isSel) show = false;
          else if (p && !isSel) { var p2 = project([L.x + L.w / 2, top, L.z]); show = !!p2 && Math.abs(p2.x - p.x) * 2 > 40; }
          if (show && p && !place({ x: p.x, y: p.y - 9 }, Math.min(150, L.unit.name.length * 6) + 10, 18) && !isSel) show = false;
          L.el.classList.toggle('sel', isSel);
        } else {
          p = project([L.x, L.y, L.z]);
          show = L.show(cam.dist);
        }
        if (!p || p.x < -80 || p.y < -40 || p.x > cssW + 80 || p.y > cssH + 40) show = false;
        if (show) { L.el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)'; if (!L.vis) { L.el.style.display = ''; L.vis = true; } }
        else if (L.el.style.display !== 'none') { L.el.style.display = 'none'; L.vis = false; }
      });
    }

    // ----------------------------------------------------------- camera
    function fitDist(box) {
      var aspect = cssW / cssH, t = Math.tan(FOV / 2);
      return Math.max(box.w / aspect, box.h * 1.25) / (2 * t) * 1.05;
    }
    var HERO = { tx: 2330, tz: 1180, dist: 2750, yaw: -22, pitch: 41 };
    function flyTo(box, pad, opts) {
      if (box === AIRPORT_VIEW) { startTween({ tx: HERO.tx, tz: HERO.tz, dist: HERO.dist, yaw: HERO.yaw, pitch: HERO.pitch }, 1300); return; }
      pad = pad || 0;
      var b = { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 };
      var to = { tx: b.x + b.w / 2, tz: b.y + b.h / 2 + b.h * 0.08, dist: Math.max(160, fitDist(b)), yaw: cam.yaw, pitch: (opts && opts.pitch) || (b.w > 2000 ? 50 : 54) };
      startTween(to, 1100);
    }
    function startTween(to, ms) {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      tween = { from: { tx: cam.tx, tz: cam.tz, dist: cam.dist, yaw: cam.yaw, pitch: cam.pitch }, to: to, t0: performance.now(), ms: reduce ? 1 : ms };
      dirty = true;
    }
    function stepTween(now) {
      if (!tween) return false;
      var k = Math.min(1, (now - tween.t0) / tween.ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      // fly out a little then in, for long moves
      var hop = Math.sin(k * Math.PI) * Math.min(1, Math.hypot(tween.to.tx - tween.from.tx, tween.to.tz - tween.from.tz) / 1500) * 0.35;
      ['tx', 'tz', 'yaw', 'pitch'].forEach(function (p) { cam[p] = tween.from[p] + (tween.to[p] - tween.from[p]) * e; });
      cam.dist = Math.exp(Math.log(tween.from.dist) + (Math.log(tween.to.dist) - Math.log(tween.from.dist)) * e) * (1 + hop);
      if (k >= 1) tween = null;
      return true;
    }
    function zoomBy(f, sx, sy) {
      updateMats();
      var p = sx === undefined ? [cam.tx, 0, cam.tz] : groundAt(sx, sy);
      var nd = Math.max(120, Math.min(9000, cam.dist * f)), k = nd / cam.dist;
      tween = null;
      if (p) { cam.tx = p[0] + (cam.tx - p[0]) * k; cam.tz = p[2] + (cam.tz - p[2]) * k; }
      cam.dist = nd;
      dirty = true;
    }

    // ------------------------------------------------------------ input
    var ptrs = {}, drag = null, hoverT = 0;
    function onDown(e) {
      canvas.setPointerCapture(e.pointerId);
      ptrs[e.pointerId] = { x: e.offsetX, y: e.offsetY };
      var n = Object.keys(ptrs).length;
      updateMats();
      tween = null;
      drag = { mode: n > 1 ? 'pinch' : (e.button === 2 || e.shiftKey || e.ctrlKey) ? 'rotate' : 'pan', x: e.offsetX, y: e.offsetY, moved: false, cam: { tx: cam.tx, tz: cam.tz, dist: cam.dist, yaw: cam.yaw, pitch: cam.pitch }, inv: invVP, g: groundAt(e.offsetX, e.offsetY) };
      if (n > 1) { var ks = Object.keys(ptrs), a = ptrs[ks[0]], b = ptrs[ks[1]]; drag.pd = Math.hypot(a.x - b.x, a.y - b.y); drag.pa = Math.atan2(b.y - a.y, b.x - a.x); }
      hideTip();
    }
    function onMove(e) {
      if (ptrs[e.pointerId]) ptrs[e.pointerId] = { x: e.offsetX, y: e.offsetY };
      if (drag) {
        var dx = e.offsetX - drag.x, dy = e.offsetY - drag.y;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        if (!drag.moved) return;
        if (drag.mode === 'pan' && drag.g) {
          var g = groundAt(e.offsetX, e.offsetY, drag.inv);
          if (g) { cam.tx = drag.cam.tx + (drag.g[0] - g[0]); cam.tz = drag.cam.tz + (drag.g[2] - g[2]); }
        } else if (drag.mode === 'rotate') {
          cam.yaw = drag.cam.yaw - dx * 0.3;
          cam.pitch = Math.max(18, Math.min(88, drag.cam.pitch + dy * 0.25));
        } else if (drag.mode === 'pinch') {
          var ks = Object.keys(ptrs);
          if (ks.length > 1) {
            var a = ptrs[ks[0]], b = ptrs[ks[1]], d = Math.hypot(a.x - b.x, a.y - b.y), an = Math.atan2(b.y - a.y, b.x - a.x);
            cam.dist = Math.max(120, Math.min(9000, drag.cam.dist * drag.pd / (d || 1)));
            cam.yaw = drag.cam.yaw - (an - drag.pa) * 180 / Math.PI;
          }
        }
        dirty = true;
        return;
      }
      var now = performance.now();
      if (now - hoverT < 50) return;
      hoverT = now;
      var hit = pickAt(e.offsetX, e.offsetY);
      canvas.style.cursor = hit ? 'pointer' : 'grab';
      var r = canvas.getBoundingClientRect();
      if (hit && hit.unit) showTip(unitTip(hit.unit), r.left + e.offsetX, r.top + e.offsetY);
      else if (hit && hit.project) { var pp = hit.project; showTip('<b>' + esc(pp.name) + '</b><br><span class=\'k\'>' + esc(pp.status) + ' · ' + esc(pp.type) + '</span><br><span class=\'k\'>Forecast:</span> ' + money(pp.forecast) + ' · ' + ymLabel(pp.s) + ' to ' + ymLabel(pp.e - 1) + '<br><span class=\'k\'>Click for costs and timeline</span>', r.left + e.offsetX, r.top + e.offsetY); }
      else if (hit && hit.asset) { var ad = assetData(hit.asset.id); showTip('<b>' + esc(hit.asset.id) + '</b><br><span class=\'k\'>' + esc(hit.asset.type) + '</span>' + (ad ? '<br><span class=\'k\'>EBITDA:</span> ' + money(ad.ebitda) + (ad.avail !== null ? '<br><span class=\'k\'>Availability:</span> ' + pct(ad.avail) : '') : '') + '<br><span class=\'k\'>Click for operations and P&amp;L</span>', r.left + e.offsetX, r.top + e.offsetY); }
      else if (hit && hit.zone) {
        var ag = zoneAgg(hit.zone, S.lens), ap = zoneAgg(hit.zone, 'profit');
        showTip('<b>' + esc(hit.zone) + '</b><br><span class=\'k\'>' + esc(LENSES.filter(function (l) { return l.key === S.lens; })[0].label) + ':</span> ' + esc(ag.text) + (S.lens !== 'profit' ? '<br><span class=\'k\'>Profit:</span> ' + esc(ap.text) : '') + '<br><span class=\'k\'>Click to fly in</span>', r.left + e.offsetX, r.top + e.offsetY);
      } else hideTip();
    }
    function onUp(e) {
      delete ptrs[e.pointerId];
      if (!drag) return;
      var d = drag; drag = null;
      if (Object.keys(ptrs).length) return;
      if (d.moved) return;
      var hit = pickAt(e.offsetX, e.offsetY);
      if (hit && hit.unit) selectUnit(hit.unit.code, true);
      else if (hit && hit.project) selectProject(hit.project.id, true);
      else if (hit && hit.asset) selectAsset(hit.asset.id, true);
      else if (hit && hit.zone) setZone(hit.zone);
    }
    function onWheel3(e) { e.preventDefault(); hideTip(); zoomBy(Math.pow(1.0018, e.deltaY), e.offsetX, e.offsetY); }
    function onCtx(e) { e.preventDefault(); }
    function onLeave() { hideTip(); }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel3, { passive: false });
    canvas.addEventListener('contextmenu', onCtx);
    canvas.addEventListener('pointerleave', onLeave);

    // ------------------------------------------------------------- loop
    function resize() {
      var r = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = Math.max(1, r.width); cssH = Math.max(1, r.height);
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
      dirty = true;
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (canvas.style.display === 'none') return;
      var moving = stepTween(now);
      var ra = roofAlpha();
      if (Math.abs(ra - lastRA) > 0.015 || (ra !== lastRA && (ra === 0 || ra === 1))) { lastRA = ra; buildDynamic(); }
      if (!dirty && !moving && !S.flow) return;
      dirty = false;
      updateMats();
      drawScene(false, now);
      updateLabels();
    }

    var api = {
      build: function () {
        resize();
        var max = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE));
        tex.all = makeTexture({ x: -200, y: -200, w: WORLD.w + 400, h: WORLD.h + 400 }, Math.min(2048, max));
        tex.detail = makeTexture({ x: 1440, y: -40, w: 2120, h: 1720 }, max);
        groundQuad('groundFar', { x: -9000, y: -9000, w: WORLD.w + 18000, h: WORLD.h + 18000 }, -0.6, tex.all);
        meshes.groundFar.tex = (function () { var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); var c = col(BASE_COLORS.land); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([c[0] * 255, c[1] * 255, c[2] * 255, 255])); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); return t; })();
        groundQuad('groundAll', { x: -200, y: -200, w: WORLD.w + 400, h: WORLD.h + 400 }, 0, tex.all);
        groundQuad('groundDetail', { x: 1440, y: -40, w: 2120, h: 1720 }, 0.05, tex.detail);
        buildStatic();
        buildLabels();
        var v = AIRPORT_VIEW;
        cam.tx = HERO.tx; cam.tz = HERO.tz; cam.dist = HERO.dist; cam.pitch = HERO.pitch; cam.yaw = HERO.yaw; void v;
        buildDynamic();
        if (!raf) raf = requestAnimationFrame(loop);
      },
      paint: function () { buildDynamic(); },
      refreshStatic: function () { buildStatic(); dirty = true; },
      flyTo: flyTo,
      zoomBy: function (f) { zoomBy(f); },
      rotate: function (deg) { startTween({ tx: cam.tx, tz: cam.tz, dist: cam.dist, yaw: cam.yaw + deg, pitch: cam.pitch }, 500); },
      tilt: function () { startTween({ tx: cam.tx, tz: cam.tz, dist: cam.dist, yaw: cam.pitch > 80 ? cam.yaw : 0, pitch: cam.pitch > 80 ? 52 : 88 }, 600); },
      resize: resize,
      setVisible: function (v) { canvas.style.display = v ? '' : 'none'; overlay.style.display = v ? '' : 'none'; compass.style.display = v ? '' : 'none'; dirty = true; },
      destroy: function () {
        cancelAnimationFrame(raf); raf = 0;
        canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
        canvas.removeEventListener('wheel', onWheel3); canvas.removeEventListener('contextmenu', onCtx); canvas.removeEventListener('pointerleave', onLeave);
        var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
        compass.removeEventListener('click', onCompass);
        canvas.remove(); overlay.remove(); compass.remove();
      }
    };
    return api;
  }
