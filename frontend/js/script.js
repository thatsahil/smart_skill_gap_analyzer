// Global script.js for index, login, signup pages

document.addEventListener('DOMContentLoaded', function() {
    // Function to handle form submissions (login/signup)
    async function handleFormSubmission(event, endpoint) {
        event.preventDefault(); // Prevent default form submission

        const form = event.target;
        const formData = new FormData(form);
        const jsonData = {};
        formData.forEach((value, key) => {
            jsonData[key] = value;
        });

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jsonData),
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                if (result.redirect) {
                    // Store user info in local storage for dashboard
                    if (result.user_id) localStorage.setItem('user_id', result.user_id);
                    if (result.username) localStorage.setItem('username', result.username);
                    if (result.user_type) localStorage.setItem('user_type', result.user_type);
                    window.location.href = result.redirect; // Redirect to dashboard
                }
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Network or server error:', error);
            alert('An unexpected error occurred. Please try again.');
        }
    }

    // Attach event listener for login form
    const loginForm = document.querySelector('#login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => handleFormSubmission(event, 'http://127.0.0.1:5000/api/login'));
    }

    // Attach event listener for signup form
    const signupForm = document.querySelector('#signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (event) => handleFormSubmission(event, 'http://127.0.0.1:5000/api/signup'));
    }
});
