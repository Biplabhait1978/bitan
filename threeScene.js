// threeScene.js - Setting up Three.js WebGL context

class WebGLApp {
    constructor() {
        this.container = document.getElementById('webgl-container');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Scene setup
        this.scene = new THREE.Scene();
        // Dark fog for depth fading
        this.scene.fog = new THREE.FogExp2(0x000000, 0.04);
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
        this.camera.position.z = 5;
        this.camera.position.y = 0;
        
        // Renderer setup
        const pixelRatio = window.innerWidth < 768 ? 1 : Math.min(window.devicePixelRatio, 2);
        this.renderer = new THREE.WebGLRenderer({
            antialias: window.innerWidth > 768, // Disable antialias on mobile for perf
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(pixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Mouse for parallax
        this.mouse = new THREE.Vector2();
        this.targetMouse = new THREE.Vector2();
        
        // Updates array for components
        this.updatables = [];
        
        // Raycaster for hover interactions
        this.raycaster = new THREE.Raycaster();
        
        this.initEvents();
        this.render();
    }
    
    initEvents() {
        window.addEventListener('resize', this.onResize.bind(this));
        
        if(window.innerWidth > 768) {
            window.addEventListener('mousemove', (e) => {
                // Normalized Device Coordinates (-1 to +1)
                this.mouse.x = (e.clientX / this.width) * 2 - 1;
                this.mouse.y = -(e.clientY / this.height) * 2 + 1;
            });
        }
    }
    
    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    
    addUpdatable(obj) {
        this.updatables.push(obj);
    }
    
    render() {
        window.requestAnimationFrame(this.render.bind(this));
        
        // Smooth mouse following
        this.targetMouse.x += (this.mouse.x - this.targetMouse.x) * 0.05;
        this.targetMouse.y += (this.mouse.y - this.targetMouse.y) * 0.05;
        
        // Subtle camera parallax based on mouse
        this.camera.position.x = this.targetMouse.x * 0.5;
        this.camera.position.y = this.targetMouse.y * 0.5;
        this.camera.lookAt(this.scene.position);
        
        // Update components
        for(let i=0; i<this.updatables.length; i++) {
            this.updatables[i].update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Make globally available
window.ThreeScene = WebGLApp;
