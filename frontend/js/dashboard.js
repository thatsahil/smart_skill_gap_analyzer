// frontend/static/js/dashboard.js
// This file can be used for interactive JavaScript functionality specific to the dashboard.

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        // Not logged in, redirect to login page
        window.location.href = 'login.html';
        return;
    }

    // Example: Display a welcome message with the username if available (e.g., from local storage)
    const welcomeMessageElement = document.getElementById('welcome-message');
    const storedUsername = localStorage.getItem('username'); // Assuming username is stored after login
    const userType = localStorage.getItem('user_type');

    if (welcomeMessageElement && storedUsername) {
        welcomeMessageElement.textContent = `Welcome, ${storedUsername} to your Dashboard!`;
    }

    // Toggle dashboard sections based on user_type
    const candidateSection = document.getElementById('candidate-dashboard');
    const companySection = document.getElementById('company-dashboard');

    if (userType === 'company') {
        if (companySection) companySection.style.display = 'block';
        if (candidateSection) candidateSection.style.display = 'none';
    } else {
        if (candidateSection) candidateSection.style.display = 'block';
        if (companySection) companySection.style.display = 'none';
    }

    // Scroll to Job Listings when clicking Explore Jobs card
    const exploreJobsCardCand = document.getElementById('explore-jobs-card-cand');
    const exploreJobsCardComp = document.getElementById('explore-jobs-card-comp');
    const jobListingsSection = document.getElementById('job-listings-card');

    [exploreJobsCardCand, exploreJobsCardComp].forEach(card => {
        if (card) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                if (jobListingsSection) {
                    jobListingsSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    });

    // Navigate to Skill Gap Reports when clicking the card
    const skillGapReportsCard = document.getElementById('skill-gap-reports-card');
    if (skillGapReportsCard) {
        skillGapReportsCard.style.cursor = 'pointer';
        skillGapReportsCard.addEventListener('click', () => {
            window.location.href = 'skill-gap-reports.html';
        });
    }

    // Navigate to Analyze page when clicking the Analyze Job Descriptions card
    const analyzeJobsCard = document.getElementById('analyze-jobs-card');
    if (analyzeJobsCard) {
        analyzeJobsCard.style.cursor = 'pointer';
        analyzeJobsCard.addEventListener('click', () => {
            window.location.href = 'analyze.html';
        });
    }


    // Load all jobs with filtering and sorting
    let allJobs = [];
    async function loadAllJobs() {
        const jobsList = document.getElementById('jobs-list');
        if (!jobsList) return;

        try {
            const response = await fetch('http://127.0.0.1:5000/api/jobs');
            allJobs = await response.json();

            if (response.ok) {
                renderJobs(allJobs);
            }
        } catch (error) {
            console.error('Error loading jobs:', error);
        }
    }

    function renderJobs(jobsToRender) {
        const jobsList = document.getElementById('jobs-list');
        if (!jobsList) return;

        if (jobsToRender.length === 0) {
            jobsList.innerHTML = '<p style="color: var(--text-muted); text-align: center; grid-column: 1/-1; padding: 20px;">No jobs found matching your criteria.</p>';
            return;
        }

        jobsList.innerHTML = '';

        jobsToRender.forEach(job => {
            const isOwner = userType === 'company' && job.company_id === userId;
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';

            jobCard.innerHTML = `
                <h3>${job.title}</h3>
                <p class="company">${job.company_name}</p>
                <p>${job.description}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <button class="btn" style="width: auto; padding: 7px 16px; font-size: 0.82rem;">View Details</button>
                    ${isOwner ? `<button class="delete-btn" data-id="${job._id}">Delete</button>` : ''}
                </div>
            `;

            // Handle delete button click
            if (isOwner) {
                const deleteBtn = jobCard.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this job posting?')) {
                        await deleteJob(job._id);
                    }
                });
            }

            jobsList.appendChild(jobCard);
        });
    }

    async function deleteJob(jobId) {
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/delete-job/${jobId}?company_id=${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('Job deleted successfully!');
                // Update local state and re-render
                allJobs = allJobs.filter(job => job._id !== jobId);
                applyFilterAndSort();
            } else {
                const result = await response.json();
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('An unexpected error occurred.');
        }
    }

    // Filter and Sort Logic
    function applyFilterAndSort() {
        const searchTerm = document.getElementById('job-search').value.toLowerCase();
        const sortValue = document.getElementById('job-sort').value;

        let filteredJobs = allJobs.filter(job => 
            job.title.toLowerCase().includes(searchTerm) || 
            job.company_name.toLowerCase().includes(searchTerm) ||
            job.description.toLowerCase().includes(searchTerm)
        );

        // Sort
        if (sortValue === 'title-asc') {
            filteredJobs.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortValue === 'title-desc') {
            filteredJobs.sort((a, b) => b.title.localeCompare(a.title));
        } else if (sortValue === 'company-asc') {
            filteredJobs.sort((a, b) => a.company_name.localeCompare(b.company_name));
        } else if (sortValue === 'newest') {
            // Since we don't have a date, we assume the order from API is roughly chronological
            // or we just keep the original order. If we had a timestamp, we'd use it here.
            filteredJobs = [...filteredJobs]; 
        }

        renderJobs(filteredJobs);
    }

    // Attach listeners
    const searchInput = document.getElementById('job-search');
    const sortSelect = document.getElementById('job-sort');

    if (searchInput) searchInput.addEventListener('input', applyFilterAndSort);
    if (sortSelect) sortSelect.addEventListener('change', applyFilterAndSort);

    loadAllJobs();

    // Handle 'Post a New Job' form visibility
    const showPostJobBtn = document.getElementById('show-post-job-form');
    const postJobSection = document.getElementById('post-job-section');
    if (showPostJobBtn && postJobSection) {
        showPostJobBtn.addEventListener('click', (e) => {
            e.preventDefault();
            postJobSection.style.display = postJobSection.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Handle 'Post a New Job' form submission
    const postJobForm = document.getElementById('post-job-form');
    if (postJobForm) {
        postJobForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(postJobForm);
            const jsonData = {
                title: formData.get('title'),
                description: formData.get('description'),
                company_id: userId,
                company_name: storedUsername
            };

            try {
                const response = await fetch('http://127.0.0.1:5000/api/post-job', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(jsonData),
                });

                const result = await response.json();
                if (response.ok) {
                    alert('Job posted successfully!');
                    postJobForm.reset();
                    postJobSection.style.display = 'none';
                } else {
                    alert(`Error: ${result.message}`);
                }
            } catch (error) {
                console.error('Error posting job:', error);
                alert('An unexpected error occurred.');
            }
        });
    }

    // Example: Logout functionality
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(event) {
            event.preventDefault();
            // Clear any user session data (e.g., tokens, username)
            localStorage.removeItem('user_id');
            localStorage.removeItem('username');
            localStorage.removeItem('user_type');
            // Redirect to login or home page
            window.location.href = 'index.html'; // Or 'login.html'
            alert('You have been logged out.');
        });
    }
});