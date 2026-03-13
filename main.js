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

    // --- Ambient Audio Toggle ---
    // --- Ambient Audio Toggle ---
    const audioToggle = document.querySelector('.audio-toggle');
    const audioElement = document.getElementById('ambient-sound');
    let isPlaying = false;

    // Set initial volume to 0 so we can fade it in
    audioElement.volume = 0;

    // Helper: Fade audio volume
    function fadeAudio(targetVolume, durationMs) {
        const startVolume = audioElement.volume;
        const startTime = performance.now();
        
        function updateVolume(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            
            // Linear interpolation
            audioElement.volume = startVolume + (targetVolume - startVolume) * progress;
            
            if (progress < 1) {
                requestAnimationFrame(updateVolume);
            } else if (targetVolume === 0) {
                audioElement.pause();
            }
        }
        requestAnimationFrame(updateVolume);
    }

    audioToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the body click
        
        if (isPlaying) {
            // Fade out smoothly over 500ms
            fadeAudio(0, 500);
            audioToggle.classList.remove('playing');
        } else {
            // Play and fade in smoothly over 1500ms
            audioElement.play().catch(e => console.log("Audio play blocked by browser:", e));
            fadeAudio(0.5, 1500); // Max volume 0.5 for ambient
            audioToggle.classList.add('playing');
        }
        isPlaying = !isPlaying;
    });

    // Autoplay implementation:
    // Listen for valid user gestures (click, keydown, touchstart)
    const startAudioOnInteract = () => {
        if (!isPlaying) {
            const playPromise = audioElement.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Success! Audio is allowed to play
                    fadeAudio(0.5, 1500); // Max volume 0.5
                    audioToggle.classList.add('playing');
                    isPlaying = true;
                    
                    // Remove listeners now that it successfully started
                    ['click', 'touchstart', 'keydown'].forEach(evt => {
                        document.removeEventListener(evt, startAudioOnInteract);
                    });
                }).catch(e => {
                    // Autoplay blocked (e.g., scrolled instead of clicked, or strict browser)
                    // We don't remove listeners here so the next click can try again.
                    console.log("Auto-play still waiting for valid gesture:", e);
                });
            }
        }
    };

    // Bind to interactions that browsers typically accept as gestures
    ['click', 'touchstart', 'keydown'].forEach(evt => {
        document.addEventListener(evt, startAudioOnInteract, { passive: true });
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

        // Reveal WebGL Gallery only after hero scrolls fully out of view.
        // This also blocks clicks on the gallery while the hero is still covering it.
        const webgl = document.getElementById('webgl-container');
        gsap.set(webgl, { opacity: 0, pointerEvents: 'none' });

        ScrollTrigger.create({
            trigger: '#hero',
            start: 'bottom 90%', // hero bottom is near bottom of screen
            end: 'bottom top',   // hero completely gone from viewport
            scrub: true,
            onUpdate: (self) => {
                const p = self.progress;
                webgl.style.opacity = p;
                // Only allow clicking gallery images once the hero has COMPLETELY scrolled away
                // This prevents clicking through the hero background
                webgl.style.pointerEvents = p >= 1 ? 'auto' : 'none';
            }
        });

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
