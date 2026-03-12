// main.js - Core logic, initialization, GSAP animations, Lenis scroll

document.addEventListener("DOMContentLoaded", () => {

    // Register GSAP ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // --- Lenis Smooth Scrolling ---
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4xou
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    lenis.on('scroll', (e) => {
        ScrollTrigger.update();
        // Update Scroll Progress bar
        const progress = (lenis.scroll / (lenis.limit)) * 100;
        document.querySelector('.scroll-progress').style.width = `${progress}%`;
    });

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // Make lenis globally available for other scripts
    window.lenis = lenis;

    // --- Custom Cursor ---
    const cursor = document.getElementById('cursor');
    const cursorFollower = document.getElementById('cursor-follower');
    const hoverTargets = document.querySelectorAll('a, button, .hover-target, .project-image, .about-img');

    if (window.innerWidth > 768) {
        let mouseX = 0, mouseY = 0;
        let followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // Set dot position immediately
            gsap.set(cursor, {
                x: mouseX,
                y: mouseY
            });
        });

        // Tween loop for follower
        gsap.ticker.add(() => {
            // Lerp follower position
            followerX += (mouseX - followerX) * 0.1;
            followerY += (mouseY - followerY) * 0.1;
            gsap.set(cursorFollower, { x: followerX, y: followerY });
        });

        hoverTargets.forEach(target => {
            target.addEventListener('mouseenter', () => {
                document.body.classList.add('hovering');
            });
            target.addEventListener('mouseleave', () => {
                document.body.classList.remove('hovering');
            });
        });
    }

    // --- Ambient Audio Toggle ---
    const audioToggle = document.querySelector('.audio-toggle');
    let audioCtx;
    let oscillator;
    let isPlaying = false;

    // We synthesize a subtle ambient drone using Web Audio API
    function setupAudio() {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Master gain
        const masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.05; // Very subtle
        masterGain.connect(audioCtx.destination);

        // Drone oscillator
        oscillator = audioCtx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = 55; // Low drone (A1)

        // Filter for warmth
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;

        // LFO for subtle modulation
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1; // Very slow
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 10;

        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);

        oscillator.connect(filter);
        filter.connect(masterGain);

        lfo.start();
        oscillator.start();

        // start paused
        audioCtx.suspend();
    }

    audioToggle.addEventListener('click', () => {
        if (!audioCtx) setupAudio();

        if (isPlaying) {
            audioCtx.suspend();
            audioToggle.classList.remove('playing');
        } else {
            audioCtx.resume();
            audioToggle.classList.add('playing');
        }
        isPlaying = !isPlaying;
    });


    // --- Loader Sequence & Initialization ---
    function initAnimations() {
        // Timeline for intro
        const tl = gsap.timeline();

        // Reveal Hero items
        tl.to('.hero-title', {
            y: '0%',
            duration: 1.5,
            ease: "expo.out",
            stagger: 0.1
        }, "+=0.2")
            .to('.hero-subtitle', {
                y: '0%',
                duration: 1.5,
                ease: "expo.out"
            }, "-=1.2")
            .to('.scroll-prompt', {
                opacity: 1,
                duration: 1
            }, "-=0.5");

        // Featured Projects Parallax & Reveal
        const projects = document.querySelectorAll('.project-item');
        projects.forEach(project => {
            const overlay = project.querySelector('.project-overlay');
            const img = project.querySelector('img');
            const title = project.querySelector('.project-title');

            // Image reveal
            ScrollTrigger.create({
                trigger: project,
                start: "top 80%",
                animation: gsap.to(overlay, {
                    scaleX: 0,
                    duration: 1.5,
                    ease: "expo.inOut"
                })
            });

            // Parallax image
            gsap.to(img, {
                yPercent: 20,
                ease: "none",
                scrollTrigger: {
                    trigger: project,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true
                }
            });
        });

        // About Section
        ScrollTrigger.create({
            trigger: ".about",
            start: "top 70%",
            animation: gsap.to(".image-reveal", {
                scaleY: 0,
                duration: 1.5,
                ease: "expo.inOut"
            })
        });

        gsap.utils.toArray('.fade-up').forEach(elem => {
            gsap.from(elem, {
                y: 50,
                opacity: 0,
                duration: 1,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: elem,
                    start: "top 85%"
                }
            });
        });
    }

    // Simulate Loading Process
    const progressText = document.querySelector('.loader-percentage');
    const progressBar = document.querySelector('.loader-progress');
    const loaderLogo = document.querySelector('.loader-logo');
    let loadProgress = 0;

    // Animate loader logo in
    gsap.to(loaderLogo, { opacity: 1, duration: 2, ease: "power2.inOut" });

    // Loader Particles (Simple Canvas implementation)
    const canvas = document.getElementById('loader-particles');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speedY: Math.random() * 0.5 + 0.1
        });
    }

    function animateParticles() {
        if (loadProgress >= 100) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        particles.forEach(p => {
            p.y -= p.speedY;
            if (p.y < 0) p.y = canvas.height;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(animateParticles);
    }
    animateParticles();

    // Fake loading interval, but ideally tied to Three.js texture loading
    // In threeScene.js, we will dispatch an event 'imagesLoaded' to complete this.
    // For now, we simulate slow load.

    // Wait for the gallery.js to finish fetching & loading textures
    // If not ready in 5s, force it
    let forcedComplete = false;

    function finishLoading() {
        if (forcedComplete) return;
        forcedComplete = true;
        loadProgress = 100;
        progressText.innerText = "100%";
        progressBar.style.width = "100%";

        gsap.to(".loader", {
            yPercent: -100,
            duration: 1.5,
            ease: "expo.inOut",
            delay: 0.5,
            onComplete: () => {
                document.body.classList.remove('loading');
                initAnimations();
                // Signal Three.js that loader is gone (if needed)
                window.dispatchEvent(new Event('loaderComplete'));
            }
        });
    }

    // We can listen to a custom event dispatched by ThreeJS manager
    window.addEventListener('allTexturesLoaded', () => {
        finishLoading();
    });

    const loadInterval = setInterval(() => {
        if (loadProgress < 95) {
            loadProgress += Math.random() * 5;
            if (loadProgress > 95) loadProgress = 95;
            progressText.innerText = Math.floor(loadProgress) + "%";
            progressBar.style.width = loadProgress + "%";
        }
    }, 150);

    // Fallback
    setTimeout(() => {
        clearInterval(loadInterval);
        finishLoading();
    }, 6000);

    // Form Handling
    document.getElementById('contactForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const btn = this.querySelector('.submit-btn span');
        const origText = btn.innerText;
        btn.innerText = "Sending...";
        setTimeout(() => {
            btn.innerText = "Message Sent";
            this.reset();
            setTimeout(() => {
                btn.innerText = origText;
            }, 3000);
        }, 1500);
    });
});
