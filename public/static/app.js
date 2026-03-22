// 获取缓存的 token
function getToken() {
  return localStorage.getItem("token");
}

// 保存 token 到本地缓存
function setToken(token) {
  localStorage.setItem("token", token);
}

// 封装 AJAX 请求，自动携带 token
function ajax(url, options = {}) {
  const token = getToken();
  const headers = options.headers || {};

  if (token) {
    headers["token"] = token;
  }

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...headers,
    },
  }).then((res) => res.json());
}
