(function () {
  const TOKEN_KEY = 'ars_jwt';
  const DEMO_ROLE_KEY = 'ars_demo_role';
  const DEMO_USER_KEY = 'ars_demo_user';
  const API_UNAVAILABLE_MESSAGE = 'The ARS API is unavailable. Configure .env, then run npm.cmd run dev.';
  let socket = null;

  function localDemoMode() {
    return ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
  }

  function token() {
    return localStorage.getItem(TOKEN_KEY);
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    if (token()) headers.set('Authorization', `Bearer ${token()}`);
    if (localDemoMode() && localStorage.getItem(DEMO_ROLE_KEY)) {
      headers.set('X-ARS-Demo-Role', localStorage.getItem(DEMO_ROLE_KEY));
      const userId = localStorage.getItem(DEMO_USER_KEY);
      if (userId) headers.set('X-ARS-Demo-User', userId);
    }
    let response;
    try {
      response = await fetch(`/api${path}`, {
        ...options,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(API_UNAVAILABLE_MESSAGE);
      }
      throw error;
    }

    const contentType = response.headers.get('content-type') || '';
    const responseText = response.status === 204 ? '' : await response.text();
    let payload = null;
    if (responseText && (contentType.includes('application/json') || contentType.includes('+json'))) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        throw new Error('The ARS API returned an invalid response. Please try again.');
      }
    }
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('ars_user_data');
      if (!location.pathname.includes('/login')) location.href = '/login/index.html';
    }
    if (!response.ok) {
      if (!contentType.includes('application/json') && !contentType.includes('+json')) {
        throw new Error(API_UNAVAILABLE_MESSAGE);
      }
      throw new Error(payload?.error?.message || 'The request could not be completed.');
    }
    if (responseText && !payload) {
      throw new Error(API_UNAVAILABLE_MESSAGE);
    }
    return payload;
  }

  function connectSocket() {
    if (!window.io || (!token() && !localDemoMode())) return null;
    if (!socket) {
      const auth = { token: token() };
      if (localDemoMode()) {
        auth.role = localStorage.getItem(DEMO_ROLE_KEY);
        auth.userId = localStorage.getItem(DEMO_USER_KEY);
      }
      socket = window.io({ auth });
      socket.on('connect_error', error => {
        if (/expired|invalid token|authentication required|no longer valid/i.test(error.message)) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('ars_user_data');
          location.href = '/login/index.html';
        }
      });
    }
    return socket;
  }

  function disconnectSocket() {
    if (socket) socket.disconnect();
    socket = null;
  }

  window.ARS_API = {
    request,
    connectSocket,
    disconnectSocket,
    setSession(tokenValue, user) {
      localStorage.setItem(TOKEN_KEY, tokenValue);
      localStorage.setItem('ars_user_data', JSON.stringify(user));
    },
    clearSession() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('ars_user_data');
      disconnectSocket();
    },
    setDemoUser(role, userId = '') {
      localStorage.setItem(DEMO_ROLE_KEY, role);
      if (userId) localStorage.setItem(DEMO_USER_KEY, userId);
      else localStorage.removeItem(DEMO_USER_KEY);
      disconnectSocket();
    },
    isLocalDemoMode: localDemoMode
  };
})();
