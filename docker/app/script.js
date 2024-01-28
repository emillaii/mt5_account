document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    fetch('http://18.162.207.88:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username, password: password })
    })
        .then(response => {
            if (response.ok) {
                return response.text();
            } else {
                throw new Error('Invalid credentials');
            }
        })
        .then(data => {
            var json = JSON.parse(data);
            localStorage.setItem("token", json.token);
            window.location.href = json.app;
        })
        .catch(error => {
            console.error('Error:', error);
        });
});