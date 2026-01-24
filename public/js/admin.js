document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    fetchUsers();

    // Logout Button (inject into header if not present, simple way)
    const header = document.querySelector('.admin-header');
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-secondary';
    logoutBtn.innerText = 'Logout';
    logoutBtn.style.marginLeft = '10px';
    logoutBtn.onclick = () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/login.html';
    };
    header.appendChild(logoutBtn);
});

async function apiRequest(url, method = 'GET', body = null) {
    const token = localStorage.getItem('adminToken');
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-admin-token': token
        }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    if (res.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/login.html';
        return null;
    }
    return res;
}

async function fetchUsers() {
    try {
        const response = await apiRequest('/api/admin/users');
        if (!response) return; // Auth failure handled

        if (!response.ok) throw new Error('Failed to fetch users');

        const users = await response.json();
        renderTable(users);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('user-rows').innerHTML = `
            <tr><td colspan="5" style="text-align:center; color: #ff6b6b;">Failed to load user data.</td></tr>
        `;
    }
}

async function toggleStatus(userId, currentStatus) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'reactivate'} this user?`)) return;

    const res = await apiRequest(`/api/admin/user/${userId}/status`, 'PATCH', { isActive: !currentStatus });
    if (res && res.ok) fetchUsers();
    else alert('Failed to update status');
}

async function deleteUser(userId) {
    if (!confirm('Are you sure? This will delete ALL user data permanently.')) return;

    const res = await apiRequest(`/api/admin/user/${userId}`, 'DELETE');
    if (res && res.ok) fetchUsers();
    else alert('Failed to delete user');
}

function renderTable(users) {
    const tbody = document.getElementById('user-rows');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No users found.</td></tr>';
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');

        // Format Joined Date
        const joinedDate = new Date(user.created_at).toLocaleDateString();

        // Status Badge
        const isActive = user.is_active === 1; // SQLite stores booleans as 1/0
        const statusHtml = isActive
            ? `<span class="badge-pill badge-github">Active</span>`
            : `<span class="badge-pill badge-none" style="background: rgba(255, 59, 48, 0.15); color: #ff3b30;">Inactive</span>`;

        // Format Linked Accounts
        let accountsHtml = '';
        if (user.linked_accounts && user.linked_accounts.length > 0) {
            user.linked_accounts.forEach(acc => {
                const platformClass = `badge-${acc.platform.toLowerCase()}`;
                accountsHtml += `<span class="badge-pill ${platformClass}">${acc.platform}</span>`;
            });
        } else {
            accountsHtml = `<span class="badge-pill badge-none">None</span>`;
        }

        // Actions
        const toggleBtn = `<button class="btn btn-sm" onclick="toggleStatus(${user.id}, ${isActive})" style="background: ${isActive ? '#ff3b30' : '#56d364'}; border:none; margin-right:5px;">${isActive ? '🛑' : '✅'}</button>`;
        const deleteBtn = `<button class="btn btn-sm" onclick="deleteUser(${user.id})" style="background: transparent; border: 1px solid #ff3b30; color: #ff3b30;">🗑️</button>`;

        tr.innerHTML = `
            <td>#${user.id}</td>
            <td>
                <strong>${escapeHtml(user.username)}</strong>
                <div style="margin-top:4px;">${statusHtml}</div>
            </td>
            <td>${joinedDate}</td>
            <td>${accountsHtml}</td>
            <td>
                <a href="/index.html?user=${user.id}" class="btn btn-sm" style="font-size: 0.8rem; padding: 4px 10px; margin-right: 5px;">Profile</a>
                ${toggleBtn}
                ${deleteBtn}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
