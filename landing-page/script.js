async function loginWithBackend(identifier, password) {
    try {
        const res = await GLBBANK_API.postJSON('/auth/login', { email: identifier, password });
        if (!res.ok) {
            throw res.error || new Error('Login failed');
        }
        return res.data;
    } catch (err) {
        if (err instanceof TypeError) {
            const apiUrl = window.GLBBANK_API?.API_BASE_URL || `${window.location.origin}/api`;
            throw new Error(`Unable to reach backend. Is the server running at ${apiUrl}?`);
        }
        throw err;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const loginModal = document.getElementById('loginModal');
    const openBtn = document.getElementById('openLoginBtn');
    const heroBtn = document.getElementById('heroLoginBtn');
    const closeBtn = document.getElementById('closeLoginBtn');
    const portalLoginForm = document.getElementById('portalLoginForm');

    const showModal = () => { if (loginModal) loginModal.classList.add('open'); };
    const hideModal = () => {
        if (loginModal) loginModal.classList.remove('open');
        if (portalLoginForm) portalLoginForm.reset();
        adaptLoginPlaceholder('');
    };

    if (openBtn) openBtn.addEventListener('click', showModal);
    if (heroBtn) heroBtn.addEventListener('click', showModal);
    if (closeBtn) closeBtn.addEventListener('click', hideModal);

    window.addEventListener('click', (e) => {
        if (e.target === loginModal) hideModal();
    });
});

/**
 * FIXED ADAPTATION ENGINE: Alters labels and input fields dynamically based on selected role
 * @param {string} selectedRole - The current configuration tag token value
 */
function adaptLoginPlaceholder(selectedRole) {
    const labelElement = document.getElementById('lblUserCredential');
    const inputElement = document.getElementById('loginEmail');
    
    if (!labelElement || !inputElement) return;

    switch(selectedRole) {
        case 'student':
            labelElement.innerText = "User ID / Email ID / Bank Account No. / Mobile No.";
            inputElement.placeholder = "Enter Student ID, Email, Account No, or Mobile...";
            break;
            
        case 'faculty':
            labelElement.innerText = "Faculty Bank Account No. / Email ID / Mobile No.";
            inputElement.placeholder = "Enter Faculty Account No, Email, or Mobile...";
            break;
            
        case 'merchant':
            labelElement.innerText = "Merchant Bank Account No. / Mobile No. / Email ID";
            inputElement.placeholder = "Enter Merchant Account No, Mobile, or Email...";
            break;
            
        case 'manager':
        case 'employee':
        case 'admin':
            labelElement.innerText = "Operator User ID / Corporate Email";
            inputElement.placeholder = "Enter administrative authorization credentials...";
            break;
            
        default:
            labelElement.innerText = "User ID / Email Address";
            inputElement.placeholder = "Enter credentials";
            break;
    }
}

// Manage Secure Form Submission and Strict Role-Isolated Redirect Routing
document.getElementById('portalLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const role = document.getElementById('loginRole').value;
    const userId = document.getElementById('loginEmail').value.trim();
    const userPass = document.getElementById('loginPassword').value;

    if (!role) {
        alert("Please select a target user role profile.");
        return;
    }

    if (role === 'manager' || role === 'employee' || role === 'admin') {
        try {
            const data = await loginWithBackend(userId, userPass);
            if (data.user.role !== role) {
                throw new Error('Selected role does not match the account role.');
            }

            localStorage.setItem('glbbank_authToken', data.token);
            localStorage.setItem('glbbank_loggedInUser', JSON.stringify(data.user));
            alert(`Authentication Success! Welcome ${data.user.name}.`);

            const redirectMap = {
                admin: '../manager/manager.html',
                manager: '../manager/manager.html',
                employee: '../employee/employee.html'
            };

            window.location.href = redirectMap[role] || '../landing-page/index.html';
        } catch (error) {
            alert(error.message || 'Authentication failed.');
        }
        return;
    }

    if (role === 'student' || role === 'faculty' || role === 'merchant') {
        try {
            const data = await loginWithBackend(userId, userPass);
            if (data.user.role !== role) {
                throw new Error('Selected role does not match the account role.');
            }

            localStorage.setItem('glbbank_authToken', data.token);
            localStorage.setItem('glbbank_loggedInUser', JSON.stringify(data.user));
            localStorage.setItem('glbbank_loggedInUserMobile', data.user.mobile || '');
            alert(`Authentication Success! Loading ${role.toUpperCase()} Workspace Panel...`);
            window.location.href = `../${role}/${role}.html`;
        } catch (error) {
            alert(error.message || 'Authentication Failed.');
        }
        return;
    }

    alert("Routing configuration path error.");
});