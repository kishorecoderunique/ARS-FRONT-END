(function () {
  const TOKEN_KEY = 'ars_jwt';
  const API_UNAVAILABLE_MESSAGE = 'The ARS API is unavailable. Configure .env, then run npm.cmd run dev.';
  let socket = null;

  function token() {
    return localStorage.getItem(TOKEN_KEY);
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    if (token()) headers.set('Authorization', `Bearer ${token()}`);
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
    if (!window.io || !token()) return null;
    if (!socket) {
      socket = window.io({ auth: { token: token() } });
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
    }
  };
})();
