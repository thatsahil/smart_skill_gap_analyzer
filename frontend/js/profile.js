// frontend/js/profile.js

document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem('user_id');
    const userType = localStorage.getItem('user_type');

    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    const candidateProfile = document.getElementById('candidate-profile');
    const companyProfile = document.getElementById('company-profile');
    const candidateForm = document.getElementById('candidate-profile-form');
    const companyForm = document.getElementById('company-profile-form');

    // Show appropriate profile section
    if (userType === 'company') {
        companyProfile.style.display = 'block';
        candidateProfile.style.display = 'none';
        loadProfile(companyForm);
    } else {
        candidateProfile.style.display = 'block';
        companyProfile.style.display = 'none';
        loadProfile(candidateForm);
    }

    // Load profile data from API
    async function loadProfile(form) {
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/profile?user_id=${userId}`);
            const profileData = await response.json();

            if (response.ok) {
                // Populate form fields
                for (const key in profileData) {
                    const input = form.elements[key];
                    if (input) {
                        input.value = profileData[key] || '';
                    }
                }
            } else {
                alert('Error loading profile: ' + profileData.message);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    // Handle profile form submissions
    async function handleProfileUpdate(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const jsonData = { user_id: userId };
        
        formData.forEach((value, key) => {
            jsonData[key] = value;
        });

        try {
            const response = await fetch('http://127.0.0.1:5000/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jsonData),
            });

            const result = await response.json();
            if (response.ok) {
                alert('Profile updated successfully!');
                // Update stored name if it changed
                if (jsonData.name) {
                    localStorage.setItem('username', jsonData.name);
                }
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('An unexpected error occurred.');
        }
    }

    if (candidateForm) candidateForm.addEventListener('submit', handleProfileUpdate);
    if (companyForm) companyForm.addEventListener('submit', handleProfileUpdate);

    // Delete Account functionality
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const confirmDelete = confirm('Are you sure you want to delete your account? This will permanently remove all your data and job postings.');
            
            if (confirmDelete) {
                try {
                    const response = await fetch(`http://127.0.0.1:5000/api/delete-account?user_id=${userId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        alert('Account deleted successfully.');
                        localStorage.clear();
                        window.location.href = 'signup.html';
                    } else {
                        const result = await response.json();
                        alert(`Error: ${result.message}`);
                    }
                } catch (error) {
                    console.error('Error deleting account:', error);
                    alert('An unexpected error occurred.');
                }
            }
        });
    }

    // Logout functionality
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(event) {
            event.preventDefault();
            localStorage.removeItem('user_id');
            localStorage.removeItem('username');
            localStorage.removeItem('user_type');
            window.location.href = 'index.html';
            alert('You have been logged out.');
        });
    }
});
