const MEMBERS = ['Jaime', 'Balduque', 'Oscar', 'Edu', 'Javi', 'Victor', 'Marcos', 'Luis', 'Pablo'];
const GENERICS = ['BB', 'BC', 'EM', 'AMP', 'EX'];

const STATE = {
  users: JSON.parse(localStorage.getItem('dt_users') || '[]'),
  stats: JSON.parse(localStorage.getItem('dt_stats') || '{}'),
  history: JSON.parse(localStorage.getItem('dt_history') || '[]'),
  currentUser: null,
  authMode: 'login',
  presentMembers: [],
  genericsCount: { BB:0, BC:0, EM:0, AMP:0, EX:0 },
  currentTurn: {},   // { role: assigned_name }
  rolesGenerated: [] // order of roles
};

const app = {
  init() {
    lucide.createIcons();
    this.renderMembers();
    this.renderCounters();
    
    // Check if logged in in sessionStorage
    const current = sessionStorage.getItem('dt_current');
    if(current) {
        STATE.currentUser = current;
        this.showView('selection');
    } else {
        this.showView('auth');
    }
  },

  showView(viewId) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-' + viewId).classList.remove('hidden');
    
    // Top nav logic
    if(viewId !== 'auth') {
        document.getElementById('top-nav').classList.remove('hidden');
    } else {
        document.getElementById('top-nav').classList.add('hidden');
    }
    
    if (viewId === 'history') this.renderHistory();
  },

  switchAuth(mode) {
    STATE.authMode = mode;
    document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + mode).classList.add('active');
    
    if (mode === 'register') {
        document.getElementById('group-reg-pass').classList.remove('hidden');
    } else {
        document.getElementById('group-reg-pass').classList.add('hidden');
    }
    document.getElementById('error-msg').innerText = "";
  },

  submitAuth() {
    const nick = document.getElementById('auth-nick').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();
    const errorMsg = document.getElementById('error-msg');
    
    if(!nick || !pass) {
        errorMsg.innerText = "Rellena todos los campos";
        return;
    }

    if (STATE.authMode === 'register') {
        const regPass = document.getElementById('auth-reg-pass').value.trim();
        if (regPass !== 'JaimeMola') {
            errorMsg.innerText = "Contraseña de registro incorrecta.";
            return;
        }
        if (STATE.users.find(u => u.nick === nick)) {
            errorMsg.innerText = "Este nick ya existe.";
            return;
        }
        STATE.users.push({ nick, pass });
        localStorage.setItem('dt_users', JSON.stringify(STATE.users));
        STATE.currentUser = nick;
        sessionStorage.setItem('dt_current', nick);
        this.showView('selection');
    } else {
        const user = STATE.users.find(u => u.nick === nick && u.pass === pass);
        if (user) {
            STATE.currentUser = nick;
            sessionStorage.setItem('dt_current', nick);
            this.showView('selection');
        } else {
            errorMsg.innerText = "Credenciales incorrectas.";
        }
    }
  },

  logout() {
      STATE.currentUser = null;
      sessionStorage.removeItem('dt_current');
      this.showView('auth');
  },

  renderMembers() {
    const container = document.getElementById('members-container');
    container.innerHTML = '';
    MEMBERS.forEach(m => {
        const div = document.createElement('div');
        div.className = `member-toggle ${STATE.presentMembers.includes(m) ? 'active' : ''}`;
        div.innerText = m;
        div.onclick = () => {
            if (STATE.presentMembers.includes(m)) {
                STATE.presentMembers = STATE.presentMembers.filter(x => x !== m);
            } else {
                STATE.presentMembers.push(m);
            }
            this.renderMembers();
        };
        container.appendChild(div);
    });
  },

  renderCounters() {
      const container = document.getElementById('counters-container');
      container.innerHTML = '';
      GENERICS.forEach(g => {
          const div = document.createElement('div');
          div.className = 'counter-item';
          div.innerHTML = `
            <span class="counter-label">${g}</span>
            <div class="counter-controls">
                <button class="counter-btn" onclick="app.offsetCounter('${g}', -1)">-</button>
                <span>${STATE.genericsCount[g]}</span>
                <button class="counter-btn" onclick="app.offsetCounter('${g}', 1)">+</button>
            </div>
          `;
          container.appendChild(div);
      });
  },

  offsetCounter(g, amount) {
      STATE.genericsCount[g] += amount;
      if(STATE.genericsCount[g] < 0) STATE.genericsCount[g] = 0;
      this.renderCounters();
  },

  getStat(name, role) {
      if (!STATE.stats[name]) return 0;
      return STATE.stats[name][role] || 0;
  },

  generateTurn() {
      let availableNames = [...STATE.presentMembers];
      let availableGenerics = { ...STATE.genericsCount };
      let assignment = {};
      
      const totalBomberos = availableNames.length + Object.values(availableGenerics).reduce((a,b)=>a+b, 0);

      // Helper to assign a person to a role
      const setRole = (role, name) => {
          assignment[role] = name;
          // remove from available if it's a specific name
          if (availableNames.includes(name)) {
             availableNames = availableNames.filter(n => n !== name);
          } else if (GENERICS.includes(name)) {
              if(availableGenerics[name] > 0) availableGenerics[name]--;
          }
      };

      // 1. EM
      if (availableNames.includes('Pablo')) {
          setRole('EM', 'Pablo');
      } else {
          if (availableNames.length > 0) {
              availableNames.sort((a,b) => this.getStat(a, 'EM') - this.getStat(b, 'EM'));
              setRole('EM', availableNames[0]);
          } else if (availableGenerics.EM > 0) {
              setRole('EM', 'EM');
          } else {
              setRole('EM', 'VACÍO');
          }
      }

      // 2. BC1
      let candBC1 = availableNames.filter(n => n !== 'Balduque');
      if (candBC1.length > 0) {
          candBC1.sort((a,b) => this.getStat(a, 'BC1') - this.getStat(b, 'BC1'));
          setRole('BC1', candBC1[0]);
      } else if (availableGenerics.BC > 0) {
          setRole('BC1', 'BC');
      } else {
          setRole('BC1', 'VACÍO');
      }

      // 3. BC3
      if (availableGenerics.BC > 0) {
          setRole('BC3', 'BC');
      } else {
          let candBC3 = availableNames.filter(n => n !== 'Balduque');
          if (candBC3.length > 0) {
              candBC3.sort((a,b) => this.getStat(a, 'BC3') - this.getStat(b, 'BC3'));
              setRole('BC3', candBC3[0]);
          } else {
              setRole('BC3', 'VACÍO');
          }
      }

      // 4. BC2
      if (availableGenerics.BC > 0) {
          setRole('BC2', 'BC');
      } else {
          let candBC2 = availableNames.filter(n => n !== 'Balduque');
          if (candBC2.length > 0) {
              candBC2.sort((a,b) => this.getStat(a, 'BC2') - this.getStat(b, 'BC2'));
              setRole('BC2', candBC2[0]);
          } else {
              setRole('BC2', 'VACÍO');
          }
      }

      // BBs
      let bbNeeded = Math.max(5, totalBomberos - 4); // 4 positions are EM, BC1, BC2, BC3
      for (let i = 1; i <= bbNeeded; i++) {
          let roleName = 'BB' + i;
          if (availableNames.length > 0) {
              availableNames.sort((a,b) => this.getStat(a, roleName) - this.getStat(b, roleName));
              setRole(roleName, availableNames[0]);
          } else if (availableGenerics.BB > 0) {
              setRole(roleName, 'BB');
          } else if (availableGenerics.BC > 0) {
              setRole(roleName, 'BC');
          } else if (availableGenerics.AMP > 0) {
              setRole(roleName, 'AMP');
          } else if (availableGenerics.EX > 0) {
              setRole(roleName, 'EX');
          } else {
              setRole(roleName, 'VACÍO');
          }
      }

      // Save to state
      // Define correct display order
      const displayOrder = ['EM', 'BC1', 'BB1', 'BB2', 'BB3', 'BC2', 'BB4', 'BC3', 'BB5'];
      for(let i=6; i<=bbNeeded; i++) displayOrder.push('BB'+i);

      STATE.rolesGenerated = displayOrder;
      STATE.currentTurn = assignment;

      this.renderReview();
      this.showView('review');
  },

  renderReview() {
      const container = document.getElementById('positions-container');
      container.innerHTML = '';
      
      // All possible options for the dropdown
      const allOptions = [...STATE.presentMembers, ...GENERICS, 'VACÍO'];

      STATE.rolesGenerated.forEach(role => {
          const currentPerson = STATE.currentTurn[role] || 'VACÍO';

          const div = document.createElement('div');
          div.className = 'position-item';
          
          let selectHtml = `<select class="position-select" onchange="app.updateTurnRole('${role}', this.value)">`;
          allOptions.forEach(opt => {
              const selected = opt === currentPerson ? 'selected' : '';
              let mark = '';
              // Mark invalid assignments in red conceptually or show note? We just trust the select.
              selectHtml += `<option value="${opt}" ${selected}>${opt}</option>`;
          });
          selectHtml += `</select>`;

          div.innerHTML = `
              <span class="position-label">${role}</span>
              ${selectHtml}
          `;
          container.appendChild(div);
      });
  },

  updateTurnRole(role, newValue) {
      STATE.currentTurn[role] = newValue;
  },

  goBackToSelection() {
      this.showView('selection');
  },

  confirmTurn() {
      // Registrar históricos
      const date = new Date().toLocaleString('es-ES');
      const record = { date, positions: { ...STATE.currentTurn }, roles: [...STATE.rolesGenerated] };
      STATE.history.unshift(record); // Add to beginning
      localStorage.setItem('dt_history', JSON.stringify(STATE.history));

      // Actualizar stats solo de personal nominativo (integrantes fijos)
      for (const role of STATE.rolesGenerated) {
          const person = STATE.currentTurn[role];
          if (MEMBERS.includes(person)) {
              if (!STATE.stats[person]) STATE.stats[person] = {};
              if (!STATE.stats[person][role]) STATE.stats[person][role] = 0;
              STATE.stats[person][role]++;
          }
      }
      localStorage.setItem('dt_stats', JSON.stringify(STATE.stats));

      alert("Dotación confirmada y guardada.");
      this.showHistory();
  },

  showHistory() {
      this.showView('history');
  },

  closeHistory() {
      if(STATE.rolesGenerated.length > 0 && document.getElementById('positions-container').innerHTML !== '') {
          this.showView('review');
      } else {
          this.showView('selection');
      }
  },

  renderHistory() {
      const container = document.getElementById('history-list');
      container.innerHTML = '';
      
      if(STATE.history.length === 0) {
          container.innerHTML = '<p style="color:var(--text-muted);">No hay históricos guardados.</p>';
          return;
      }

      STATE.history.forEach(record => {
          const div = document.createElement('div');
          div.className = 'history-item';
          
          let posHtml = '';
          record.roles.forEach(role => {
              if(record.positions[role] && record.positions[role] !== 'VACÍO') {
                 posHtml += `<div><strong>${role}:</strong> ${record.positions[role]}</div>`;
              }
          });

          div.innerHTML = `
             <div class="history-date">${record.date}</div>
             <div class="history-positions">${posHtml}</div>
          `;
          container.appendChild(div);
      });
  }
};

window.onload = () => app.init();
