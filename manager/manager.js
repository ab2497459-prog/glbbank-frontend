// manager.js - handles tabs, employee + manager registration and registries
(function(){
  function qs(id){ return document.getElementById(id); }

  window.switchTab = function(tabId){
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tree-node').forEach(b => b.classList.remove('active'));
    qs(tabId).classList.add('active');
    // activate corresponding sidebar button
    const map = { 'create-emp':'btn-tab-create','registry-emp':'btn-tab-registry','registry-acc':'btn-tab-accounts','manage-managers':'btn-tab-managers' };
    const btn = qs(map[tabId]); if (btn) btn.classList.add('active');
    if (tabId === 'registry-emp') renderEmployees();
    if (tabId === 'registry-acc') renderAccounts();
    if (tabId === 'manage-managers') renderManagers();
  };

  // Hide manager controls unless current user is admin
  function getCurrentUserRole(){
    try{
      const token = localStorage.getItem('glbbank_authToken');
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload && payload.role ? payload.role : null;
    }catch(e){ return null; }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const role = getCurrentUserRole();
    // If not admin, hide the Manage Managers sidebar button and tab
    if (role !== 'admin'){
      const btn = document.getElementById('btn-tab-managers');
      const tab = document.getElementById('manage-managers');
      if (btn) btn.style.display = 'none';
      if (tab) tab.style.display = 'none';
    }
  });

  // Logout
  window.triggerLogout = function(){
    localStorage.removeItem('glbbank_authToken');
    window.location.href = '../landing-page/index.html';
  };

  // Employee registration (uses /api/auth/register with role employee)
  const empForm = qs('employeeForm');
  if (empForm){
    empForm.addEventListener('submit', async function(e){
      e.preventDefault();
      const body = {
        name: qs('empName').value.trim(),
        email: qs('empEmail').value.trim(),
        password: qs('empPassword').value,
        role: 'employee',
        mobile: qs('empMobile').value.trim()
      };
      const res = await window.GLBBANK_API.postJSON('/auth/register', body);
      if (!res.ok) return alert('Failed: '+res.error.message);
      alert('Employee registered');
      empForm.reset();
      renderEmployees();
    });
  }

  // Manager registration (admin-only in backend). Uses stored token.
  const mgrForm = qs('managerForm');
  if (mgrForm){
    mgrForm.addEventListener('submit', async function(e){
      e.preventDefault();
      // client-side guard: only admin may register managers
      const roleNow = getCurrentUserRole();
      if (roleNow !== 'admin') return alert('Only admins may register managers');
      const body = {
        name: qs('mgrName').value.trim(),
        email: qs('mgrEmail').value.trim(),
        password: qs('mgrPassword').value,
        role: 'manager',
        mobile: qs('mgrMobile').value.trim()
      };
      const res = await window.GLBBANK_API.postJSON('/auth/register', body);
      if (!res.ok) return alert('Register failed: '+res.error.message);
      alert('Manager registered');
      mgrForm.reset();
      renderManagers();
    });
  }

  // Render employees
  window.renderEmployees = async function(){
    const role = qs('roleSelect') ? qs('roleSelect').value : 'employee';
    const q = `?role=${encodeURIComponent(role)}`;
    const res = await window.GLBBANK_API.getJSON('/users'+q);
    if (!res.ok) return alert('Failed to load users: '+res.error.message);
    const list = res.data || [];
    const tbody = qs('employeeTableBody'); tbody.innerHTML = '';
    for (const u of list){
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><a href="#" onclick="openEmpCard('${u.id}')">${u.name}</a></td><td>${u.studentId||u.id||''}</td><td>${u.mobile||''}</td><td>${u.email||''}</td><td>•••••••</td><td>-</td>`;
      tbody.appendChild(tr);
    }
  };

  // Render accounts placeholder
  window.renderAccounts = async function(){
    const tbody = qs('accountsTableBody'); if (!tbody) return; tbody.innerHTML = '<tr><td colspan="6">No accounts implemented</td></tr>';
  };

  // Render managers
  window.renderManagers = async function(){
    const query = qs('mgrSearchInput') && qs('mgrSearchInput').value ? `?role=manager&query=${encodeURIComponent(qs('mgrSearchInput').value)}` : '?role=manager';
    // backend supports ?role filter; search handled client-side
    const res = await window.GLBBANK_API.getJSON('/users?role=manager');
    if (!res.ok) return alert('Failed to load managers: '+res.error.message);
    const list = res.data || [];
    const tbody = qs('managersTableBody'); tbody.innerHTML = '';
    for (const u of list){
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${u.name||''}</td><td>${u.email||''}</td><td>${u.mobile||''}</td><td>${u.role||''}</td><td><button onclick="editUser('${u.id}')">Edit</button> <button onclick="deleteUser('${u.id}')">Delete</button></td>`;
      tbody.appendChild(tr);
    }
  };

  // Simple edit/delete actions
  window.editUser = async function(id){
    const name = prompt('New name:'); if (!name) return;
    const res = await window.GLBBANK_API.putJSON('/users/'+encodeURIComponent(id), { name });
    if (!res.ok) return alert('Update failed: '+res.error.message);
    alert('Updated'); renderManagers();
  };

  window.deleteUser = async function(id){
    if (!confirm('Delete this user?')) return;
    const res = await window.GLBBANK_API.deleteJSON('/users/'+encodeURIComponent(id));
    if (!res.ok) return alert('Delete failed: '+res.error.message);
    alert('Deleted'); renderManagers();
  };

  // Employee card modal
  window.openEmpCard = function(id){
    // fetch user details
    window.GLBBANK_API.getJSON('/users/'+encodeURIComponent(id)).then(res=>{
      if (!res.ok) return alert('Could not fetch user');
      const u = res.data;
      qs('cardEmpName').innerText = u.name || '-';
      qs('cardEmpId').innerText = 'ID: '+(u.studentId||u.id||'');
      qs('cardEmpMobile').innerText = u.mobile || '-';
      qs('cardEmpEmail').innerText = u.email || '-';
      qs('cardEmpPass').innerText = '•••••••';
      qs('empCardModal').classList.add('visible');
    });
  };
  window.closeEmpCard = function(){ qs('empCardModal').classList.remove('visible'); };

  // Initial render
  document.addEventListener('DOMContentLoaded', function(){
    renderEmployees();
  });
})();
// manager.js truncated; restore from HTML and expected functions.