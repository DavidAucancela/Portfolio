/* ============================================================
   SEC TERMINAL — Terminal interactiva del hero en modo .sec
   ============================================================ */

const BOOT_LINES = [
  { text: '[BOOT] Initializing secure shell...', type: 'muted',  delay: 0    },
  { text: '[AUTH] Authenticating jonathan_aucancela...', type: 'output', delay: 340  },
  { text: '[OK]   Access granted — clearance: ALPHA',   type: 'accent', delay: 700  },
  { text: '──────────────────────────────────────────',  type: 'dim',    delay: 1020 },
  { text: "Type 'help' for available commands.",         type: 'muted',  delay: 1120 },
];

const PROJECTS = [
  { file: 'mapcriminals.md',  name: 'MapCriminals',         desc: 'Threat intelligence & geo-visualization' },
  { file: 'securabank.md',    name: 'SecuraBank',           desc: 'Zero-trust banking security system'      },
  { file: 'conquito.md',      name: 'ConQuito Fundaciones', desc: 'Transparent fund management audit'       },
];

const PROJECT_DETAILS = {
  'securabank.md': [
    '# SecuraBank — Cybersecurity Hardening',
    'Stack:    Node.js, PostgreSQL, Docker, OWASP ZAP',
    'Role:     Lead security architect',
    '',
    'Threat model: Zero-trust perimeter, mTLS auth',
    'Achieved: 0 CVEs in prod, SOC2 Type II ready',
    'Pipeline: Penetration testing + SAST/DAST',
  ],
  'mapcriminals.md': [
    '# MapCriminals — Threat Intelligence Platform',
    'Stack:    Python, OSINT APIs, Leaflet.js, FastAPI',
    'Role:     Full-stack security developer',
    '',
    'Feeds:    12+ public threat intelligence sources',
    'Coverage: Real-time geo-clustering of incidents',
    'Score:    94.3% location confidence accuracy',
  ],
  'conquito.md': [
    '# ConQuito Fundaciones — Audit System',
    'Stack:    Laravel, MySQL, Vue.js, PDF generation',
    'Role:     Backend security & data integrity',
    '',
    'Controls: RBAC + audit logs + digital signatures',
    'Comply:   SRI + Contraloría General requirements',
    'Impact:   $2.3M in transparent fund tracking',
  ],
  'skills.md': [
    '# Skills — Security & Development',
    'Offensive:  OSINT, pentesting, SAST/DAST, OWASP Top 10',
    'Defensive:  Zero-trust design, RBAC, audit logging',
    'Stack:      Node.js, Python, Docker, Kali Linux',
    'Certs:      HackTheBox labs, practical writeups',
  ],
  'contact.md': [
    '# Contact',
    'Email:     jonathan_jd@outlook.com',
    'LinkedIn:  linkedin.com/in/jonathan-david-aucancela',
    "Hint:      try 'ping linkedin' for a direct link",
  ],
};

const COMMANDS = [
  'help', 'whoami', 'neofetch', 'history', 'whois',
  'ls', 'ls projects', 'ping linkedin', 'clear', 'exit',
  'nmap', 'patch ', 'quarantine ', 'block ',
];

/* Vectores del "sistema comprometido" (portfolio:secBreach, ver background.js
   SecField). 2 se resuelven con el comando técnico correcto, 1 (brute-force)
   con un minijuego de reflejos — ver _startReflexChallenge. */
const INTRUSION_VECTORS = [
  { id: 'backdoor',   port: '4444/tcp', service: 'backdoor', threat: 'reverse-shell activo',
    action: 'patch',      type: 'command', successMsg: '[OK] Backdoor parcheado — conexión reversa cerrada.' },
  { id: 'ransomware', port: '3389/tcp', service: 'rdp',      threat: 'payload de ransomware',
    action: 'quarantine', type: 'command', successMsg: '[OK] Payload aislado en cuarentena.' },
  { id: 'bruteforce', port: '22/tcp',   service: 'ssh',      threat: 'brute-force en curso',
    action: 'block',      type: 'reflex',  successMsg: '[OK] IP de origen bloqueada.' },
];

const CRED_POOL = ['admin:123456', 'admin:password', 'root:toor', 'admin:qwerty', 'admin:letmein', 'root:admin123'];

export const SecTerminal = (() => {
  let _booted  = false;
  let _history = [];
  let _histIdx = -1;
  const _sessionStart = Date.now();

  let _hackState   = null;   // { vectors: [...] } mientras el sistema está comprometido
  let _reflexMode  = false;  // false, o { vector, line } mientras el minijuego está activo
  let _reflexTimer = null;

  function _uptimeString() {
    const secs = Math.floor((Date.now() - _sessionStart) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  /* ── Public API ───────────────────────────────────── */
  function init() {
    const input    = document.getElementById('sec-terminal-input');
    const terminal = document.getElementById('sec-terminal');

    if (input) {
      input.addEventListener('keydown', _onKeyDown);
    }

    // Clic en cualquier parte de la terminal expandida → foco al input
    terminal?.addEventListener('click', () => {
      if (terminal.dataset.widgetState === 'expanded') input?.focus();
    });

    // Compuerta colapsada: click / Enter / Espacio (el <button> ya mapea
    // teclado a click) abre la terminal con la animación de intrusión.
    document.getElementById('sec-terminal-gate')
      ?.addEventListener('click', _enter);

    // Escuchar cambios de modo → siempre arranca colapsada
    window.addEventListener('portfolio:modeChange', e => {
      if (e.detail.mode === 'sec') _onEnterSec();
    });

    // Fallback: si la página carga ya en modo sec
    setTimeout(() => {
      if (document.body.getAttribute('data-theme') === 'sec') _onEnterSec();
    }, 120);

    // Sistema comprometido (integridad 0 en el fondo .sec) — ver background.js SecField
    window.addEventListener('portfolio:secBreach', _onBreach);
  }

  /* ── Sistema comprometido: apagón + investigación + remediación ────── */

  const HACKED_SELECTORS = [
    '#navbar', '#mode-bar', '.hero-content',
    '#about', '#projects', '#skills', '#contact', '.footer',
  ];

  function _onBreach() {
    _hackState = { vectors: INTRUSION_VECTORS.map(v => ({ ...v, resolved: false })) };
    document.body.classList.add('is-sec-hacked');
    HACKED_SELECTORS.forEach(sel => document.querySelector(sel)?.setAttribute('inert', ''));

    // _enter() dispara el boot async (setTimeouts escalonados, ~1.1s) la
    // primera vez que se abre — hay que esperar a que termine para no
    // imprimir la alerta ANTES que las líneas de boot.
    const bootPending = !_booted;
    _enter();
    const printBreach = () => {
      _printLine('[CRITICAL] INTEGRIDAD 0% — SISTEMA COMPROMETIDO', 'error');
      _printLine("Ejecutá 'nmap' para escanear los vectores de intrusión.", 'muted');
    };
    bootPending ? setTimeout(printBreach, 1300) : printBreach();
  }

  function _runNmap() {
    _printLine('Starting Nmap 7.94 ( https://nmap.org )', 'muted');
    if (!_hackState) {
      _printLine('No hay amenazas activas — sistema nominal.', 'muted');
      return;
    }
    const pending = _hackState.vectors.filter(v => !v.resolved).length;
    const summary = pending
      ? `${pending} vector(es) activo(s) — usá 'help' para ver comandos de remediación`
      : 'Todos los vectores resueltos.';
    // _printLines escalona cada línea 28ms — el resumen debe esperar a que
    // termine de imprimir la lista, si no aparece arriba de ella.
    _printLines(_hackState.vectors.map(v =>
      `${v.port.padEnd(10)}${v.service.padEnd(13)}${v.resolved ? '[RESUELTO] ' : ''}${v.threat}`
    ), 'output');
    setTimeout(() => _printLine(summary, 'accent'), _hackState.vectors.length * 28 + 30);
  }

  function _handleRemediation(cmd) {
    if (!_hackState) { _printLine('bash: sistema nominal — nada que remediar', 'muted'); return; }
    const [action, portArg] = cmd.split(' ');
    const vector = _hackState.vectors.find(v => v.port.startsWith(portArg) && !v.resolved);
    if (!vector) {
      _printLine(`error: puerto ${portArg || ''} no encontrado o ya resuelto — corré 'nmap'`, 'error');
      return;
    }
    if (vector.action !== action) {
      _printLine(`error: acción incorrecta para ${vector.port} — revisá el vector con 'nmap'`, 'error');
      return;
    }
    vector.type === 'reflex' ? _startReflexChallenge(vector) : _resolveVector(vector);
  }

  function _resolveVector(vector) {
    vector.resolved = true;
    _printLine(vector.successMsg, 'accent');
    if (_hackState.vectors.every(v => v.resolved)) _endHack();
  }

  /* Minijuego de reflejos: credenciales candidatas ciclando — hay que
     presionar Enter cuando aparece la marcada como válida. */
  function _startReflexChallenge(vector) {
    _printLine('> intentando credenciales de origen...', 'muted');

    const line = document.createElement('div');
    line.className = 'sec-terminal__line sec-terminal__line--dim';
    document.getElementById('sec-terminal-body')?.appendChild(line);

    let i = 0;
    const correctIdx = 2 + Math.floor(Math.random() * (CRED_POOL.length - 2));
    _reflexTimer = setInterval(() => {
      const idx = i % CRED_POOL.length;
      line.textContent = `  ${CRED_POOL[idx]}`;
      line.dataset.hit = idx === correctIdx ? '1' : '0';
      i++;
    }, 550);

    _reflexMode = { vector, line };
    document.getElementById('sec-terminal-input')?.focus();
  }

  function _onReflexKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.currentTarget.value = '';
    const { vector, line } = _reflexMode;
    if (line.dataset.hit === '1') {
      clearInterval(_reflexTimer);
      line.remove();
      _reflexMode = false;
      _resolveVector(vector);
    }
    // fallo: no pasa nada, el ciclo de credenciales sigue — el timing es la única penalidad
  }

  function _endHack() {
    _printLines(['[OK] Todos los vectores neutralizados.', '[SISTEMA RESTAURADO]'], 'accent');
    document.body.classList.remove('is-sec-hacked');
    HACKED_SELECTORS.forEach(sel => document.querySelector(sel)?.removeAttribute('inert'));
    _hackState = null;
    window.dispatchEvent(new CustomEvent('portfolio:secRepaired'));
  }

  /* ── Estados: compuerta ⇄ terminal ────────────────── */
  function _onEnterSec() {
    _collapse();
  }

  function _collapse() {
    const root = document.getElementById('sec-terminal');
    if (!root) return;
    root.dataset.widgetState = 'collapsed';
    document.getElementById('sec-terminal-gate')?.setAttribute('aria-expanded', 'false');
    _booted = false;
  }

  function _enter() {
    const root = document.getElementById('sec-terminal');
    if (!root || root.dataset.widgetState === 'expanded') return;
    root.dataset.widgetState = 'expanded';
    document.getElementById('sec-terminal-gate')?.setAttribute('aria-expanded', 'true');

    if (_booted) return;
    _booted = true;
    _runBoot();
    setTimeout(() => document.getElementById('sec-terminal-input')?.focus(), 700);
  }

  /**
   * Demo para el tour de JotAI: escribe `cmd` en el input real
   * carácter a carácter y lo ejecuta como si lo tecleara el usuario.
   */
  function demo(cmd) {
    const input = document.getElementById('sec-terminal-input');
    if (!input || !cmd) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const run = () => {
      input.value = '';
      _printLine(`jonathan@sec:~$ ${cmd}`, 'cmd');
      _history.unshift(cmd);
      _handleCommand(cmd.toLowerCase());
    };

    if (reduced) { run(); return; }

    let i = 0;
    const iv = setInterval(() => {
      if (i >= cmd.length) { clearInterval(iv); setTimeout(run, 350); return; }
      input.value = cmd.slice(0, ++i);
    }, 85);
  }

  /* ── Secuencia de arranque ────────────────────────── */
  function _runBoot() {
    const body = document.getElementById('sec-terminal-body');
    if (!body) return;
    body.innerHTML = '';

    BOOT_LINES.forEach(({ text, type, delay }) => {
      setTimeout(() => _printLine(text, type), delay);
    });
  }

  /* ── Render de líneas ─────────────────────────────── */
  function _printLine(text, type = 'output') {
    const body = document.getElementById('sec-terminal-body');
    if (!body) return;
    const line = document.createElement('div');
    line.className = `sec-terminal__line sec-terminal__line--${type}`;
    line.textContent = text;
    body.appendChild(line);
    requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
  }

  function _printLink(text, url, type = 'accent') {
    const body = document.getElementById('sec-terminal-body');
    if (!body) return;
    const line = document.createElement('div');
    line.className = `sec-terminal__line sec-terminal__line--${type}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = text;
    a.style.cssText = 'color:inherit; text-decoration:underline; text-underline-offset:3px; cursor:pointer;';
    line.appendChild(a);
    body.appendChild(line);
    requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
  }

  function _printLines(lines, type = 'output', baseDelay = 0) {
    lines.forEach((text, i) => {
      setTimeout(() => {
        if (text === '') { _printLine('​', 'dim'); return; }
        _printLine(text, type);
      }, baseDelay + i * 28);
    });
  }

  /* ── Teclado ──────────────────────────────────────── */
  function _onKeyDown(e) {
    if (_reflexMode) { _onReflexKeyDown(e); return; }

    const input = e.currentTarget;

    if (e.key === 'Enter') {
      const cmd = input.value.trim();
      input.value = '';
      _histIdx = -1;
      _printLine(`jonathan@sec:~$ ${cmd}`, 'cmd');
      if (cmd) {
        _history.unshift(cmd);
        _handleCommand(cmd.toLowerCase());
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (_histIdx < _history.length - 1) {
        _histIdx++;
        input.value = _history[_histIdx] || '';
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (_histIdx > 0) {
        _histIdx--;
        input.value = _history[_histIdx] || '';
      } else {
        _histIdx = -1;
        input.value = '';
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      _autocomplete(input);
    }
  }

  /* ── Autocompletado (Tab) ─────────────────────────── */
  function _autocomplete(input) {
    const val = input.value;

    if (val.startsWith('cat ')) {
      const partial = val.slice(4);
      const matches = Object.keys(PROJECT_DETAILS).filter(f => f.startsWith(partial));
      if (matches.length === 1) input.value = `cat ${matches[0]}`;
      return;
    }

    const matches = COMMANDS.filter(c => c.startsWith(val));
    if (matches.length === 1) {
      input.value = matches[0];
    } else if (matches.length > 1 && val) {
      _printLine(`jonathan@sec:~$ ${val}`, 'cmd');
      _printLine(matches.join('  '), 'muted');
    }
  }

  /* ── Dispatcher de comandos ───────────────────────── */
  function _handleCommand(cmd) {
    switch (true) {

      case cmd === 'help':
        _printLines([
          'Available commands:',
          '  whoami           — identity & clearance info',
          '  neofetch         — system summary (ASCII)',
          '  history          — show command history',
          '  whois            — lookup this session',
          '  ls               — list security projects',
          '  ls projects      — same as ls',
          '  cat <file>.md    — read project/skill/contact details',
          '  ping linkedin    — network reachability check',
          '  nmap             — scan active intrusion vectors',
          '  patch <port>     — remediate a backdoor vector',
          '  quarantine <port>— remediate a payload vector',
          '  block <port>     — remediate a brute-force vector',
          '  clear            — clear terminal output',
          '  exit             — terminate session',
          '',
          "Tip: press Tab to autocomplete commands and files.",
        ], 'muted');
        break;

      case cmd === 'whoami':
        _printLines([
          'jonathan_aucancela',
          '────────────────────────────────────',
          'Role:      Security Engineer & Developer',
          'Clearance: ALPHA (pentesting authorized)',
          'Skills:    Zero-trust · SAST/DAST · OSINT',
          'Stack:     Node.js · Python · Docker · Kali',
          'Contact:   jonathan_jd@outlook.com',
        ], 'output');
        break;

      case cmd === 'neofetch':
        _printLines([
          '     /\\      jonathan@sec',
          '    /  \\     ────────────────────',
          '   / /\\ \\    OS:      SecureShell v2.4',
          '  / ____ \\   Uptime:  ' + _uptimeString() + '',
          ' /_/    \\_\\  Shell:   bash 5.2',
          '             Clearance: ALPHA',
          '             Skills:  Zero-trust · OSINT · SAST/DAST',
        ], 'output');
        break;

      case cmd === 'history':
        if (_history.length <= 1) {
          _printLine('(no previous commands)', 'muted');
        } else {
          _printLines(
            _history.slice(1).map((c, i) => `  ${_history.length - 1 - i}  ${c}`),
            'output'
          );
        }
        break;

      case cmd === 'whois':
        _printLines([
          `session:  jonathan@sec — ${new Date().toLocaleTimeString('es-EC')}`,
          'origin:   this browser tab',
          'purpose:  portfolio demo terminal (read-only)',
        ], 'output');
        break;

      case cmd === 'ls' || cmd === 'ls projects':
        _printLines([
          'drwxr-xr-x  sec-projects/',
          ...PROJECTS.map(p =>
            `  -rw-r--r--  ${p.file.padEnd(22)} # ${p.desc}`
          ),
          '',
          `${PROJECTS.length} files — use 'cat <file>.md' to read`,
        ], 'output');
        break;

      case cmd.startsWith('cat '): {
        const file    = cmd.slice(4).trim();
        const details = PROJECT_DETAILS[file];
        if (details) {
          _printLines(details, 'output');
        } else {
          _printLine(`cat: ${file}: No such file or directory`, 'error');
          _printLine("Hint: try 'ls' to see available files.", 'muted');
        }
        break;
      }

      case cmd === 'ping linkedin':
        _pingLinkedin();
        break;

      case cmd === 'nmap':
        _runNmap();
        break;

      case cmd.startsWith('patch '):
      case cmd.startsWith('quarantine '):
      case cmd.startsWith('block '):
        _handleRemediation(cmd);
        break;

      case cmd === 'clear': {
        const body = document.getElementById('sec-terminal-body');
        if (body) body.innerHTML = '';
        break;
      }

      case cmd === 'exit':
        _printLines(['Closing secure session...', '[BYE]  Stay secure.'], 'muted');
        setTimeout(() => {
          const body = document.getElementById('sec-terminal-body');
          if (body) body.innerHTML = '';
          _collapse(); // vuelve a la compuerta "Click para acceder"
        }, 2200);
        break;

      default:
        _printLine(`bash: ${cmd}: command not found`, 'error');
        _printLine("Type 'help' to list available commands.", 'muted');
    }
  }

  /* ── Comando ping ─────────────────────────────────── */
  function _pingLinkedin() {
    _printLine('PING linkedin.com (104.244.42.193) 56 bytes of data.', 'muted');
    const rtt = [12, 14, 11, 13];
    rtt.forEach((ms, i) => {
      setTimeout(() => {
        _printLine(
          `64 bytes from linkedin: icmp_seq=${i + 1} ttl=55 time=${ms}.${Math.floor(Math.random() * 9)}ms`,
          'output'
        );
        if (i === rtt.length - 1) {
          setTimeout(() => {
            _printLine('─────────────────────────────────────', 'dim');
            _printLine(`4 packets: 0% loss, avg ${ms}ms`, 'output');
            _printLink(
              '→  linkedin.com/in/jonathan-david-aucancela',
              'https://www.linkedin.com/in/jonathan-david-aucancela/'
            );
          }, 220);
        }
      }, (i + 1) * 420);
    });
  }

  return { init, demo };
})();
