const firebaseConfig = {
  apiKey: "AIzaSyBXn_Vn9Wwl2YueBgBywF1RzGOa3RoRJBk",
  authDomain: "turnazo-getafe.firebaseapp.com",
  databaseURL: "https://turnazo-getafe-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "turnazo-getafe",
  storageBucket: "turnazo-getafe.firebasestorage.app",
  messagingSenderId: "481890553407",
  appId: "1:481890553407:web:299c0c3e1da49f4988b28a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const DEFAULT_MEMBERS = ['Jaime', 'Balduque', 'Oscar', 'Edu', 'Javi', 'Victor', 'Marcos', 'Luis', 'Pablo'];
const GENERICS = ['BB', 'BC', 'EM'];

let STATE = {
  users: [],
  stats: {},
  history: [],
  members: null,
  currentUser: null,
  isMaster: false,
  authMode: 'login',
  presentMembers: [],
  genericsCount: { BB:0, BC:0, EM:0 },
  currentTurn: {},   
  rolesGenerated: [],
  connectedOnce: false
};


const app = {
  init() {
    lucide.createIcons();
    
    db.ref('turnazo').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        STATE.users = data.users || [];
        STATE.stats = data.stats || {};
        STATE.history = data.history || [];
        STATE.members = data.members || null;
        
        if (!STATE.members) {
            STATE.members = [...DEFAULT_MEMBERS];
            STATE.members.forEach(m => {
                if (!STATE.stats[m]) STATE.stats[m] = { absences: 0 };
            });
            this.saveAll();
        }

        document.getElementById('loading-overlay').classList.add('hidden');
        
        this.renderMembers();
        this.renderCounters();
        if(!document.getElementById('view-history').classList.contains('hidden')) {
            this.renderHistory();
            this.renderStats();
            this.renderCarapiedra();
        }
        if(!document.getElementById('modal-emisora').classList.contains('hidden')) {
            this.showEmisoraList();
        }
        if(!document.getElementById('modal-admin').classList.contains('hidden')) {
            this.renderAdminMembers();
        }

        if(!STATE.connectedOnce) {
            STATE.connectedOnce = true;
            if (STATE.users.length === 0) {
                document.getElementById('first-user-warning').classList.remove('hidden');
            } else {
                document.getElementById('first-user-warning').classList.add('hidden');
            }
            const current = sessionStorage.getItem('dt_current');
            if(current) {
                let u = STATE.users.find(x => x.nick === current);
                if(u) {
                    STATE.currentUser = current;
                    STATE.isMaster = !!u.isMaster;
                    this.showView('selection');
                } else {
                    this.showView('auth');
                }
            } else {
                this.showView('auth');
            }
        }
    });
  },

  showView(viewId) {
    document.querySelectorAll('section').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-' + viewId).classList.remove('hidden');
    
    if(viewId !== 'auth') {
        document.getElementById('top-nav').classList.remove('hidden');
        if(STATE.isMaster) {
            document.querySelectorAll('.btn-master').forEach(el => el.classList.remove('hidden'));
        }
    } else {
        document.getElementById('top-nav').classList.add('hidden');
    }
    
    if (viewId === 'history') {
        this.renderHistory();
        this.renderStats();
        this.renderCarapiedra();
    }
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
    
    if(!nick || !pass) return errorMsg.innerText = "Rellena todos los campos";

    if (STATE.authMode === 'register') {
        const regPass = document.getElementById('auth-reg-pass').value.trim();
        if (regPass !== 'JaimeMola') return errorMsg.innerText = "Contraseña maestra incorrecta.";
        if (STATE.users.find(u => u.nick === nick)) return errorMsg.innerText = "Este nick ya existe.";
        
        let isMaster = STATE.users.length === 0;
        STATE.users.push({ nick, pass, isMaster });
        this.saveAll();
        
        STATE.currentUser = nick;
        STATE.isMaster = isMaster;
        sessionStorage.setItem('dt_current', nick);
        this.showView('selection');
    } else {
        const user = STATE.users.find(u => u.nick === nick && u.pass === pass);
        if (user) {
            STATE.currentUser = nick;
            STATE.isMaster = !!user.isMaster;
            sessionStorage.setItem('dt_current', nick);
            this.showView('selection');
        } else {
            errorMsg.innerText = "Credenciales incorrectas.";
        }
    }
  },

  logout() {
      STATE.currentUser = null;
      STATE.isMaster = false;
      sessionStorage.removeItem('dt_current');
      this.showView('auth');
  },

  renderMembers() {
    const container = document.getElementById('members-container');
    container.innerHTML = '';
    STATE.presentMembers = STATE.presentMembers.filter(m => STATE.members.includes(m)); // Limpiar borrados
    
    STATE.members.forEach(m => {
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

      const setRole = (role, name) => {
          assignment[role] = name;
          if (availableNames.includes(name)) {
             availableNames = availableNames.filter(n => n !== name);
          } else if (GENERICS.includes(name)) {
              if(availableGenerics[name] > 0) availableGenerics[name]--;
          }
      };

      // 1. EM
      if (availableNames.includes('Pablo')) {
          setRole('EM', 'Pablo');
      } else if (availableGenerics.EM > 0) {
          setRole('EM', 'EM');
      } else {
          if (availableNames.length > 0) {
              availableNames.sort((a,b) => this.getStat(a, 'EM') - this.getStat(b, 'EM'));
              setRole('EM', availableNames[0]);
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
      let bbNeeded = Math.max(5, totalBomberos - 4); 
      for (let i = 1; i <= bbNeeded; i++) {
          let roleName = 'BB' + i;
          if (availableNames.length > 0) {
              availableNames.sort((a,b) => this.getStat(a, roleName) - this.getStat(b, roleName));
              setRole(roleName, availableNames[0]);
          } else if (availableGenerics.BB > 0) {
              setRole(roleName, 'BB');
          } else if (availableGenerics.BC > 0) {
              setRole(roleName, 'BC');
          } else {
              setRole(roleName, 'VACÍO');
          }
      }

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
      const allOptions = [...STATE.members, ...GENERICS, 'VACÍO'];

      STATE.rolesGenerated.forEach(role => {
          const currentPerson = STATE.currentTurn[role] || 'VACÍO';
          const div = document.createElement('div');
          div.className = 'position-item';
          
          let selectHtml = `<select class="position-select" onchange="app.updateTurnRole('${role}', this.value)">`;
          allOptions.forEach(opt => {
              const selected = opt === currentPerson ? 'selected' : '';
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
      const date = new Date().toLocaleString('es-ES');
      const record = { id: Date.now().toString(), date, positions: { ...STATE.currentTurn }, roles: [...STATE.rolesGenerated] };
      STATE.history.unshift(record); 
      
      const assignedPeople = Object.values(STATE.currentTurn);

      // Actualizar stats operativos
      for (const role of STATE.rolesGenerated) {
          const person = STATE.currentTurn[role];
          if (STATE.members.includes(person)) {
              if (!STATE.stats[person]) STATE.stats[person] = { absences: 0 };
              if (!STATE.stats[person][role]) STATE.stats[person][role] = 0;
              STATE.stats[person][role]++;
          }
      }

      // Sumar faltas Carapiedra (a los miembros de STATE.members que NO están en la dotación)
      STATE.members.forEach(m => {
          if (!assignedPeople.includes(m)) {
              if (!STATE.stats[m]) STATE.stats[m] = { absences: 0 };
              if (STATE.stats[m].absences === undefined) STATE.stats[m].absences = 0;
              STATE.stats[m].absences++;
          }
      });

      this.saveAll();
      alert("Dotación confirmada y guardada.");
      this.showHistory();
  },

  saveAll() {
      db.ref('turnazo').set({
          users: STATE.users,
          stats: STATE.stats,
          history: STATE.history,
          members: STATE.members
      }).catch(err => {
          console.error("Firebase sync error: ", err);
      });
  },

  // HISTORY & STATS VIEWS
  switchHistoryTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
  },

  showHistory() { this.showView('history'); },
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
      if(STATE.history.length === 0) return container.innerHTML = '<p style="color:var(--text-muted);">No hay históricos.</p>';

      STATE.history.forEach(record => {
          const div = document.createElement('div');
          div.className = 'history-item';
          
          let posHtml = '';
          record.roles.forEach(role => {
              if(record.positions[role] && record.positions[role] !== 'VACÍO') {
                 posHtml += `<div><strong>${role}:</strong> ${record.positions[role]}</div>`;
              }
          });

          // Solo master puede eliminar día de guardia por ahora
          let delBtn = STATE.isMaster ? `<button class="btn-delete" onclick="app.deleteHistoryRecord('${record.id}')">Borrar</button>` : '';

          div.innerHTML = `
             ${delBtn}
             <div class="history-date">${record.date}</div>
             <div class="history-positions">${posHtml}</div>
          `;
          container.appendChild(div);
      });
  },

  deleteHistoryRecord(id) {
     if(confirm("¿Seguro que quieres borrar este registro? Sus estadísticas y faltas generadas se restarán automáticamente.")) {
         let record = STATE.history.find(h => h.id === id);
         if(record) {
             // Restar las posiciones
             record.roles.forEach(role => {
                 let person = record.positions[role];
                 if(STATE.stats[person] && STATE.stats[person][role] > 0) {
                     STATE.stats[person][role]--;
                 }
             });
             // Restar las faltas de Carapiedra al personal que no trabajó
             const assignedPeople = Object.values(record.positions);
             STATE.members.forEach(m => {
                 if(!assignedPeople.includes(m) && STATE.stats[m] && STATE.stats[m].absences > 0) {
                     STATE.stats[m].absences--;
                 }
             });
         }
         STATE.history = STATE.history.filter(h => h.id !== id);
         this.saveAll();
         this.renderHistory();
         this.renderStats();
         this.renderCarapiedra();
     }
  },

  renderStats() {
      const container = document.getElementById('stats-table-container');
      
      // Encontrar todos los roles existentes
      let allRoles = new Set();
      STATE.members.forEach(m => {
          Object.keys(STATE.stats[m] || {}).forEach(k => {
              if(k !== 'absences') allRoles.add(k);
          });
      });
      let rolesArr = Array.from(allRoles).sort();

      let table = `<table><thead><tr><th>Nombre</th><th>Totales</th>`;
      rolesArr.forEach(r => table += `<th>${r}</th>`);
      table += `</tr></thead><tbody>`;

      STATE.members.forEach(m => {
          const st = STATE.stats[m] || {absences:0};
          let total = 0;
          rolesArr.forEach(r => total += (st[r] || 0));
          
          table += `<tr>
            <td><strong>${m}</strong></td>
            <td>${total}</td>`;
          
          rolesArr.forEach(r => {
             let count = st[r] || 0;
             let perc = total > 0 ? Math.round((count / total) * 100) : 0;
             table += `<td>${count} <span style="color:gray;font-size:0.8em">(${perc}%)</span></td>`;
          });
          table += `</tr>`;
      });
      table += `</tbody></table>`;
      container.innerHTML = table;
  },

  renderCarapiedra() {
      const container = document.getElementById('carapiedra-container');
      let sorted = [...STATE.members].sort((a,b) => {
          let fa = (STATE.stats[a] && STATE.stats[a].absences) || 0;
          let fb = (STATE.stats[b] && STATE.stats[b].absences) || 0;
          return fb - fa;
      });

      let html = `<table><thead><tr><th>Posición</th><th>Integrante</th><th>Faltas Totales</th></tr></thead><tbody>`;
      sorted.forEach((m, idx) => {
          let faltas = (STATE.stats[m] && STATE.stats[m].absences) || 0;
          let medal = idx === 0 ? '🏆' : (idx===1 ? '🥈' : (idx===2?'🥉':(idx+1)));
          html += `<tr><td>${medal}</td><td><strong>${m}</strong></td><td><span style="color:var(--primary);font-weight:bold">${faltas}</span></td></tr>`;
      });
      html += `</tbody></table>`;
      container.innerHTML = html;
  },

  // EMISORA
  showEmisoraList() {
      document.getElementById('modal-emisora').classList.remove('hidden');
      const container = document.getElementById('emisora-container');
      
      let filtered = STATE.members.filter(m => m !== 'Pablo');
      filtered.sort((a,b) => {
          let ea = this.getStat(a, 'EM');
          let eb = this.getStat(b, 'EM');
          return eb - ea;
      });

      let html = `<table><thead><tr><th>Integrante</th><th>Veces EM</th>${STATE.isMaster ? '<th>Ajuste (Master)</th>' : ''}</tr></thead><tbody>`;
      filtered.forEach(m => {
          let count = this.getStat(m, 'EM');
          let ops = STATE.isMaster ? `<td>
             <button class="btn-sm btn-secondary" style="padding:0.1rem 0.4rem;" onclick="app.offsetEmisora('${m}', -1)">-</button>
             <button class="btn-sm btn-secondary" style="padding:0.1rem 0.4rem;" onclick="app.offsetEmisora('${m}', 1)">+</button>
          </td>` : '';
          
          html += `<tr><td><strong>${m}</strong></td><td><span style="font-weight:bold; color:var(--accent);">${count}</span></td>${ops}</tr>`;
      });
      html += `</tbody></table>`;
      container.innerHTML = html;
  },

  offsetEmisora(m, amount) {
      if(!STATE.stats[m]) STATE.stats[m] = { absences: 0 };
      if(STATE.stats[m].EM === undefined) STATE.stats[m].EM = 0;
      
      STATE.stats[m].EM += amount;
      if(STATE.stats[m].EM < 0) STATE.stats[m].EM = 0;
      
      this.saveAll();
      this.showEmisoraList();
      // Refrescar panel principal si está abierto
      if(!document.getElementById('view-history').classList.contains('hidden')) {
          this.renderStats();
      }
  },

  // ADMIN PANE
  showAdmin() {
      document.getElementById('modal-admin').classList.remove('hidden');
      this.renderAdminMembers();
  },

  renderAdminMembers() {
      const container = document.getElementById('admin-members-list');
      container.innerHTML = '';
      STATE.members.forEach((m, idx) => {
          container.innerHTML += `
             <div class="admin-row">
                 <input type="text" class="admin-input" id="admin-name-${idx}" value="${m}">
                 <button class="btn-sm btn-secondary" onclick="app.updateMemberName(${idx}, '${m}')">Renombrar</button>
                 <button class="btn-sm btn-secondary" onclick="app.openEditStats('${m}')">📊 Stats</button>
                 <button class="btn-sm" style="background:var(--primary);color:white;border:none;" onclick="app.deleteMember(${idx}, '${m}')">Borrar</button>
             </div>
          `;
      });
  },

  addMember() {
      const input = document.getElementById('new-member-name');
      const name = input.value.trim();
      if(!name) return;
      if(STATE.members.includes(name)) return alert("El integrante ya existe.");

      STATE.members.push(name);
      STATE.stats[name] = { absences: 0, EM: 0, BC1: 0, BB1: 0 };
      
      input.value = "";
      this.saveAll();
      this.renderAdminMembers();
      this.renderMembers();
      alert("Integrante añadido correctamente.");
  },

  updateMemberName(idx, oldName) {
      const input = document.getElementById(`admin-name-${idx}`);
      const newName = input.value.trim();
      if(!newName || newName === oldName) return;
      if(STATE.members.includes(newName)) return alert("El nombre ya existe.");

      STATE.members[idx] = newName;
      STATE.stats[newName] = STATE.stats[oldName];
      delete STATE.stats[oldName];
      
      // Update present list
      if(STATE.presentMembers.includes(oldName)) {
          STATE.presentMembers = STATE.presentMembers.filter(n => n !== oldName);
          STATE.presentMembers.push(newName);
      }

      this.saveAll();
      this.renderAdminMembers();
      this.renderMembers();
  },

  deleteMember(idx, name) {
      if(!confirm(`¿Seguro que quieres eliminar a ${name} para siempre? Sus estadísticas serán borradas.`)) return;
      
      STATE.members.splice(idx, 1);
      delete STATE.stats[name];
      
      STATE.presentMembers = STATE.presentMembers.filter(n => n !== name);

      this.saveAll();
      this.renderAdminMembers();
      this.renderMembers();
  },

  openEditStats(name) {
      document.getElementById('edit-stats-name').innerText = name;
      const container = document.getElementById('edit-stats-container');
      container.innerHTML = '';
      
      let st = STATE.stats[name] || { absences: 0 };
      
      let allRoles = new Set(['absences', 'EM', 'BC1', 'BC2', 'BC3', 'BB1', 'BB2', 'BB3', 'BB4', 'BB5']);
      STATE.members.forEach(m => {
          Object.keys(STATE.stats[m] || {}).forEach(k => allRoles.add(k));
      });
      
      let rolesArr = Array.from(allRoles).sort();
      STATE.editingStatsRoles = rolesArr;
      STATE.editingStatsName = name;
      
      rolesArr.forEach(role => {
          let val = st[role] || 0;
          let label = role === 'absences' ? 'Faltas (Carapiedra)' : `Rol ${role}`;
          container.innerHTML += `
             <div style="display:flex; justify-content:space-between; align-items:center;">
                 <label style="margin:0; width:150px; color:var(--text-main); font-weight:bold;">${label}</label>
                 <input type="number" id="edit-stat-${role}" value="${val}" min="0" style="flex:1; padding:0.4rem; font-size:1.1rem; text-align:center;">
             </div>
          `;
      });
      document.getElementById('modal-edit-stats').classList.remove('hidden');
  },

  saveEditedStats() {
      let name = STATE.editingStatsName;
      if(!name) return;
      if(!STATE.stats[name]) STATE.stats[name] = { absences: 0 };
      
      STATE.editingStatsRoles.forEach(role => {
          let input = document.getElementById(`edit-stat-${role}`);
          if(input) {
              STATE.stats[name][role] = parseInt(input.value) || 0;
          }
      });
      this.saveAll();
      document.getElementById('modal-edit-stats').classList.add('hidden');
      
      if(!document.getElementById('view-history').classList.contains('hidden')) {
          this.renderStats();
          this.renderCarapiedra();
      }
      this.showEmisoraList(); // Actualizar memoria interna
      document.getElementById('modal-emisora').classList.add('hidden'); // Ocultar por si acaso
      
      alert("Estadísticas actualizadas correctamente.");
  }
};

window.onload = () => app.init();
