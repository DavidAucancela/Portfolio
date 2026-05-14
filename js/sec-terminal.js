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
};

export const SecTerminal = (() => {
  let _booted  = false;
  let _history = [];
  let _histIdx = -1;

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
    }
  }

  /* ── Dispatcher de comandos ───────────────────────── */
  function _handleCommand(cmd) {
    switch (true) {

      case cmd === 'help':
        _printLines([
          'Available commands:',
          '  whoami           — identity & clearance info',
          '  ls               — list security projects',
          '  ls projects      — same as ls',
          '  cat <file>.md    — read project details',
          '  ping linkedin    — network reachability check',
          '  clear            — clear terminal output',
          '  exit             — terminate session',
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

  return { init };
})();
