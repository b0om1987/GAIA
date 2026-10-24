function setThemeCookie(theme) {
  document.cookie = `gaia_theme=${theme}; path=/; max-age=31536000`;
}

const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    setThemeCookie(next);
    window.dispatchEvent(new Event("themechange"));
  });
}

function updateNavAuthState() {
  const token = sessionStorage.getItem('gaia_token');
  const navLogin = document.getElementById('navLogin');
  const navDash = document.getElementById('navDash');
  if (navLogin && navDash) {
    if (token) {
      navLogin.style.display = 'none';
      navDash.style.display = 'inline-flex';
    } else {
      navLogin.style.display = 'inline-flex';
      navDash.style.display = 'none';
    }
  }
}

updateNavAuthState();

const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
if (burger) {
  burger.addEventListener("click", () => navLinks.classList.toggle("open"));
}

document.querySelectorAll(".faq-question").forEach(btn => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".faq-item");
    const wasOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item").forEach(i => i.classList.remove("open"));
    if (!wasOpen) item.classList.add("open");
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      const stats = entry.target.querySelectorAll(".stat-number");
      stats.forEach(animateCounter);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

function animateCounter(el) {
  if (el.dataset.animated) return;
  el.dataset.animated = "true";
  const target = parseFloat(el.dataset.target);
  const suffix = el.dataset.suffix || "";
  const decimals = parseInt(el.dataset.decimals) || 0;
  const duration = 1200;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = target * eased;
    el.textContent = val.toFixed(decimals) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target.toFixed(decimals) + suffix;
  }
  requestAnimationFrame(tick);
}

(function initWebGL() {
  const canvas = document.getElementById("webgl-bg");
  if (!canvas) return;
  const gl = canvas.getContext("webgl");
  if (!gl) return;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener("resize", resize);

  const vsSource = `attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;
  const fsSource = `
    precision mediump float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uRes;
    uniform float uIsDark;
    float grid(vec2 uv, float scale) {
      vec2 g = abs(fract(uv * scale - 0.5) - 0.5) / fwidth(uv * scale);
      return 1.0 - min(min(g.x, g.y), 1.0);
    }
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      uv.x *= uRes.x / uRes.y;
      float t = uTime * 0.0001;
      vec2 offset = vec2(t * 30.0, t * 15.0);
      float g = grid(uv + offset, 40.0);
      vec3 baseColor = mix(vec3(0.93, 0.93, 0.93), vec3(0.08, 0.08, 0.08), uIsDark);
      vec3 gridColor = mix(vec3(0.82, 0.82, 0.82), vec3(0.16, 0.16, 0.16), uIsDark);
      vec3 col = mix(baseColor, gridColor, g * 0.5);
      float streakY = floor(uTime * 0.3);
      float streakRand = rand(vec2(streakY, 1.0));
      float streakPos = streakRand;
      float streakWidth = 0.003;
      float streakAge = fract(uTime * 0.3);
      float streakFade = 1.0 - streakAge;
      if (streakRand > 0.7) {
        float dy = abs(uv.y - streakPos);
        if (dy < streakWidth) {
          float intensity = (1.0 - dy / streakWidth) * streakFade;
          col = mix(col, vec3(0.55, 0.71, 0.24), intensity * 0.8);
        }
      }
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(program);
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(program, "uTime");
  const uRes = gl.getUniformLocation(program, "uRes");
  const uIsDark = gl.getUniformLocation(program, "uIsDark");

  function render() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark" ? 1.0 : 0.0;
    gl.uniform1f(uTime, performance.now());
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uIsDark, isDark);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
  render();
})();