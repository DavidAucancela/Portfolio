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
];

export const SecTerminal = (() => {
  let _booted  = false;
  let _history = [];
  let _histIdx = -1;
  const _sessionStart = Date.now();

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

    // Clic en cualquier parte de la terminal → foco al input
    terminal?.addEventListener('click', () => input?.focus());

    // Escuchar cambios de modo
    window.addEventListener('portfolio:modeChange', e => {
      if (e.detail.mode === 'sec') _onEnterSec();
    });

    // Fallback: si la página carga ya en modo sec
    setTimeout(() => {
      if (document.body.getAttribute('data-theme') === 'sec' && !_booted) {
        _onEnterSec();
      }
    }, 120);
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

  /* ── Entrada al modo .sec ─────────────────────────── */
  function _onEnterSec() {
    if (!_booted) {
      _booted = true;
      _runBoot();
    }
    setTimeout(() => document.getElementById('sec-terminal-input')?.focus(), 1300);
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
          _booted = false;
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
