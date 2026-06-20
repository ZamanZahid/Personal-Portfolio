document.addEventListener('DOMContentLoaded', () => {
    // Loading Screen
    const loadingScreen = document.querySelector('.loading-screen');
    window.addEventListener('load', () => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    });

    // Typing Animation for Hero Section
    const typingTextElement = document.querySelector('.typing-text');
    const phrases = [
        "a Student Developer",
        "a Robotics Enthusiast",
        "an AI Explorer",
        "a Web Developer",
        "a Problem Solver",
        "a Software Engineer",
        "a Full Stack Developer",
        "a Technology Enthusiast",
        "4x Hackathon Winner",
        "a Creative Thinker",
        "an Innovator",
        "a Future Engineer",
        "a Lifelong Learner",
        "an Open Source Contributor",
        "a Builder",
        "a Creator",
        "THE GOAT",
        "a Tech Enthusiast",
        "a Computer Science Student",
        "an Aspiring Entrepreneur",
        "an Automation Developer",
        "a Python Programmer",
        "a Java Developer",
        "a Frontend Developer",
        "a Backend Developer",
        "a STEM Student",
        "a Self-Taught Programmer",
        "an Autonomous Systems Developer",
        "a Robotics Builder",
        "an AI Developer",
        "a Curious Mind",
        "a Project Creator",
        "THE GOAT"

    ];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeEffect() {
        const currentPhrase = phrases[phraseIndex];
        const currentChar = currentPhrase.substring(0, charIndex);
        typingTextElement.textContent = currentChar;

        if (!isDeleting && charIndex < currentPhrase.length) {
            charIndex++;
            setTimeout(typeEffect, 100);
        } else if (isDeleting && charIndex > 0) {
            charIndex--;
            setTimeout(typeEffect, 50);
        } else {
            isDeleting = !isDeleting;
            if (!isDeleting) {
                phraseIndex = (phraseIndex + 1) % phrases.length;
            }
            setTimeout(typeEffect, 1000);
        }
    }

    typeEffect();

});