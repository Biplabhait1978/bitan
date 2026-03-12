// gallery.js - 3D Interactive Gallery logic

// Custom Shader for Image Planes (handles distortion on hover)
const vertexShader = `
    varying vec2 vUv;
    uniform float uHover;
    uniform float uTime;
    
    void main() {
        vUv = uv;
        vec3 pos = position;
        
        // Subtle wave effect on hover
        float wave = sin(pos.x * 10.0 + uTime * 2.0) * 0.05 * uHover;
        pos.z += wave;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const fragmentShader = `
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uHover;
    uniform float uOpacity;
    
    void main() {
        // Zoom on hover
        vec2 uv = vUv;
        uv -= 0.5;
        uv *= 1.0 - (uHover * 0.05);
        uv += 0.5;
        
        vec4 texColor = texture2D(uTexture, uv);
        
        // Always render in full color (removed grayscale effect)
        gl_FragColor = vec4(texColor.rgb, texColor.a * uOpacity);
    }
`;

class ImageGallery {
    constructor(webglApp) {
        this.app = webglApp;
        this.scene = webglApp.scene;
        this.planes = [];
        this.galleryGroup = new THREE.Group();
        this.scene.add(this.galleryGroup);
        
        this.textureLoader = new THREE.TextureLoader();
        
        this.manager = new CloudinaryManager();
        this.imagesData = [];
        
        this.hoveredPlane = null;
        
        this.init();
    }
    
    async init() {
        try {
            // Use the tag defined in cloudinary.js or default to "portfolio"
            const tag = typeof FOLDER_TAG !== 'undefined' ? FOLDER_TAG : "portfolio";
            this.imagesData = await this.manager.fetchGalleryImages(tag);
            await this.createPlanes();
            
            // Dispatch event for Main JS Loader to know we are ready
            window.dispatchEvent(new Event('allTexturesLoaded'));
            
            this.app.addUpdatable(this);
            this.initInteractions();
            this.initScroll();
            
        } catch (error) {
            console.error("Gallery initialization failed:", error);
            window.dispatchEvent(new Event('allTexturesLoaded')); // fallback unlock
        }
    }
    
    loadTexture(url) {
        return new Promise(resolve => {
            this.textureLoader.load(url, 
                texture => {
                    texture.generateMipmaps = true;
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.anisotropy = this.app.renderer.capabilities.getMaxAnisotropy();
                    resolve(texture);
                },
                undefined,
                error => {
                    console.error("Texture failed to load:", url);
                    resolve(null); // Resolve with null instead of rejecting
                }
            );
        });
    }
    
    async createPlanes() {
        const geometry = new THREE.PlaneGeometry(3, 4.5, 32, 32); 
        
        for (let i = 0; i < this.imagesData.length; i++) {
            const data = this.imagesData[i];
            const texture = await this.loadTexture(data.url);
            
            if (!texture) continue; // Skip if texture failed to load
            
            const material = new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms: {
                    uTexture: { value: texture },
                    uHover: { value: 0.0 },
                    uTime: { value: 0.0 },
                    uOpacity: { value: 1.0 }
                },
                transparent: true,
                side: THREE.DoubleSide
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData = { 
                index: i,
                data: data 
            };
            
            // Positioning Logic
            // We alternate left and right, and span backwards in Z
            const xOffset = i % 2 === 0 ? -2.5 : 2.5;
            // Introduce some random stagger
            const xRand = (Math.random() - 0.5) * 1.5;
            const yRand = (Math.random() - 0.5) * 2.0;
            
            mesh.position.set(xOffset + xRand, yRand, -i * 5 - 2);
            
            // Slight rotation for gallery feel
            mesh.rotation.y = i % 2 === 0 ? 0.1 : -0.1;
            
            this.planes.push(mesh);
            this.galleryGroup.add(mesh);
        }
    }
    
    initInteractions() {
        if(window.innerWidth <= 768) return; // Disable hover effects on mobile
        
        // Set up click event for lightbox
        window.addEventListener('click', () => {
            if(this.hoveredPlane) {
                this.openLightbox(this.hoveredPlane.userData);
            }
        });
    }

    initScroll() {
        // Link Lenis scroll to gallery z-position
        const gallerySection = document.getElementById('gallery');
        gallerySection.style.height = `${this.planes.length * 100}vh`;

        this.isGalleryActive = false;
        this.autoScrollSpeed = 0.0005; // Constant drift speed
        this.currentAutoProgress = 0;

        ScrollTrigger.create({
            trigger: gallerySection,
            start: "top center",
            end: "bottom center",
            onToggle: (self) => {
                this.isGalleryActive = self.isActive;
                if (this.isGalleryActive) {
                    document.body.classList.add('gallery-active');
                    document.querySelector('.gallery-hint').classList.add('visible');
                } else {
                    document.body.classList.remove('gallery-active');
                    document.querySelector('.gallery-hint').classList.remove('visible');
                }
            },
            onUpdate: (self) => {
                // Manual progress sync
                this.manualProgress = self.progress;
            }
        });
    }

    openLightbox(userData) {
        // ... previous lightbox code ...
        const lb = document.getElementById('lightbox');
        const img = lb.querySelector('.lightbox-img');
        const title = lb.querySelector('.meta-title');
        const loc = lb.querySelector('.meta-loc');
        const cam = lb.querySelector('.meta-cam');
        const yr = lb.querySelector('.meta-year');
        
        // Reset image
        img.classList.remove('loaded');
        img.src = "";
        
        // Set data
        const d = userData.data;
        title.innerText = d.title;
        loc.innerText = d.location;
        cam.innerText = d.camera;
        yr.innerText = `[${d.year}]`;
        
        img.onload = () => { img.classList.add('loaded'); };
        img.src = d.url;
        
        lb.classList.add('active');
        document.body.style.overflow = "hidden";
        if(window.lenis) window.lenis.stop();
        
        // Navigation Setup
        this.currentLightboxIndex = userData.index;
        
        const closeBtn = lb.querySelector('.lightbox-close');
        const prevBtn = lb.querySelector('.nav-prev');
        const nextBtn = lb.querySelector('.nav-next');
        
        const closeLB = () => {
            lb.classList.remove('active');
            if(window.lenis) window.lenis.start();
            closeBtn.removeEventListener('click', closeLB);
        };
        
        closeBtn.addEventListener('click', closeLB);
        
        const newPrev = prevBtn.cloneNode(true);
        const newNext = nextBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrev, prevBtn);
        nextBtn.parentNode.replaceChild(newNext, nextBtn);
        
        newPrev.addEventListener('click', () => this.navigateLightbox(-1));
        newNext.addEventListener('click', () => this.navigateLightbox(1));

        // Touch/Swipe Support
        let touchStartX = 0;
        let touchEndX = 0;
        
        const handleTouchStart = (e) => {
            touchStartX = e.changedTouches[0].screenX;
        };
        
        const handleTouchEnd = (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleGesture();
        };

        const handleGesture = () => {
            if (touchEndX < touchStartX - 50) this.navigateLightbox(1);
            if (touchEndX > touchStartX + 50) this.navigateLightbox(-1);
        };

        lb.addEventListener('touchstart', handleTouchStart, {passive: true});
        lb.addEventListener('touchend', handleTouchEnd, {passive: true});

        // Cleanup touch listeners on close
        const originalClose = closeLB;
        const cleanupLB = () => {
            lb.removeEventListener('touchstart', handleTouchStart);
            lb.removeEventListener('touchend', handleTouchEnd);
            originalClose();
        };
        closeBtn.onclick = cleanupLB;
    }

    navigateLightbox(dir) {
        let newIdx = this.currentLightboxIndex + dir;
        if(newIdx < 0) newIdx = this.imagesData.length - 1;
        if(newIdx >= this.imagesData.length) newIdx = 0;
        
        this.openLightbox({ index: newIdx, data: this.imagesData[newIdx] });
    }
    
    update() {
        const app = this.app;
        const time = app.renderer.info.render.frame * 0.01;

        // Auto Scroll / Drifting Logic
        if (this.isGalleryActive) {
            // Apply a constant drift forward
            this.currentAutoProgress += this.autoScrollSpeed;
            if (this.currentAutoProgress > 1) this.currentAutoProgress = 0;

            // Blend manual scroll and auto-drift
            // We give priority to manual scroll if the user is actively scrolling, 
            // but for simplicity here we blend them or let auto-drift take over when idle.
            // Using manualProgress as the base
            const targetZProgress = Math.max(this.manualProgress || 0, this.currentAutoProgress % 1);
            const totalDepth = this.planes.length * 5;
            
            gsap.to(this.galleryGroup.position, {
                z: totalDepth * targetZProgress,
                duration: 0.8,
                ease: "power2.out",
                overwrite: "auto"
            });
        }
        
        // Raycast for hover
        app.raycaster.setFromCamera(app.targetMouse, app.camera);
        const intersects = app.raycaster.intersectObjects(this.planes);
        
        if (intersects.length > 0) {
            const hit = intersects[0].object;
            this.hoveredPlane = hit;
            if(window.innerWidth > 768) document.body.classList.add('hovering');
        } else {
            this.hoveredPlane = null;
            if(window.innerWidth > 768) document.body.classList.remove('hovering');
        }
        
        for (let i = 0; i < this.planes.length; i++) {
            const p = this.planes[i];
            const mat = p.material;
            mat.uniforms.uTime.value = time;
            
            if (this.hoveredPlane === p) {
                mat.uniforms.uHover.value += (1.0 - mat.uniforms.uHover.value) * 0.1;
            } else {
                mat.uniforms.uHover.value += (0.0 - mat.uniforms.uHover.value) * 0.05;
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    // We defer the WebGL init slightly to ensure container is ready
    setTimeout(() => {
        const app = new ThreeScene();
        const gallery = new ImageGallery(app);
    }, 100);
});
