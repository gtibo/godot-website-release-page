import { ReleaseBanner } from "./js/three_banner.js";
import { MakeGradientMat } from "./js/gradient_quad_mat.js";
import { mapRange, clamp } from "./js/math_util.js";
import * as THREE from "./js/three/three.module.min.js";

let banner = new ReleaseBanner("#three-container", "#three-canvas", {stencil: true});
let scrollPercent = 0.0;
let mouseLerped = banner.mouse.clone();
let rightSceneRoot = undefined;

// Custom Materials

let gradientMat = MakeGradientMat("#49a7ff");

let sphereGradientMat = new THREE.ShaderMaterial({
    transparent: true,
  uniforms: {
    color: {
      value: new THREE.Color("rgba(73, 255, 158, 1)")
    },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;

    varying vec2 vUv;
    
    void main() {
      
      gl_FragColor = vec4(color,  round(1.0 - length(vUv.xy - vec2(0.5))) * (1.0 - (vUv.y - 0.5) * 2.0) * 0.2);
    }
  `,
});

let screenLightsMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
        color: {
        value: new THREE.Color("#49a7ff")
        },
        uTime: {
            value: 0.0
        },
    },
    vertexShader: `
        varying vec2 vUv;

        void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        uniform float uTime;

        varying vec2 vUv;
        
        void main() {
        
        float wave = sin(vUv.x * 20.0 + uTime * 0.001);
        wave = (1.0 + wave) * 0.5;

        gl_FragColor = vec4(color, vUv.y * 0.6 * wave);
        }
    `,
});

let gridMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
        color: {
        value: new THREE.Color("#ffffff")
        },
        gridSampler: { type: "t", value: null}

    },
    vertexShader: `
        varying vec2 vUv;

        void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        uniform sampler2D gridSampler;        
        varying vec2 vUv;
        
        void main() {

        gl_FragColor = vec4(color, texture2D(gridSampler, vUv * 5.0).x * (1.0 - length(vUv.xy - vec2(0.5)) * 2.0) * 0.25);
        }
    `,
});

new THREE.TextureLoader().load(import.meta.resolve('./assets/3d_grid.png'), (r)=>{
    r.wrapS = THREE.RepeatWrapping;
    r.wrapT = THREE.RepeatWrapping;
    r.minFilter = THREE.NearestFilter;
    r.magFilter = THREE.NearestFilter;

    gridMat.uniforms.gridSampler.value = r;
    gridMat.needsUpdate = true;
});

const stencilMat = new THREE.MeshPhongMaterial({ color: 'white' });
stencilMat.depthWrite = false;
stencilMat.stencilWrite = true;
stencilMat.stencilRef = 1;
stencilMat.stencilFunc = THREE.AlwaysStencilFunc;
stencilMat.stencilZPass = THREE.ReplaceStencilOp;

// Light Setup

const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.6);
banner.scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 8.5);
directionalLight.position.set(-0.5, 1, 1);
directionalLight.target.position.set(0.0, 0, 0);
banner.scene.add(directionalLight);
banner.scene.add(directionalLight.target);

const backLight = new THREE.DirectionalLight(0xb5e3ff, 4.0);
backLight.position.set(0.5, -0.5, -1);
backLight.target.position.set(0.0, 0, 0);
banner.scene.add(backLight);
banner.scene.add(backLight.target);

function updateComposition() {
    if (banner.viewSize.x == 0.0 && banner.viewSize.y == 0.0) return;

    let ratio = banner.viewSize.x / banner.viewSize.y;

    if(rightSceneRoot){
        rightSceneRoot.position.x = mapRange(clamp(ratio, 0.5, 1.5), 0.5, 1.5, 2.5, 5.0);
        rightSceneRoot.position.y = mapRange(clamp(ratio, 0.5, 1.5), 0.5, 1.5, -1.5, 0.0);
    }

    banner.sceneCamera.fov = mapRange(clamp(ratio, 0.5, 1.5), 0.5, 1.5, 35.0, 25.0);
    banner.sceneCamera.updateProjectionMatrix();
}

banner.process = function(delta){
    if (this.sceneCamera){
        mouseLerped.lerp(this.mouse, 10.0 * delta);
        this.sceneCamera.position.x = (mouseLerped.x - 0.5) * 0.5;
        this.sceneCamera.position.y = -(mouseLerped.y - 0.5) * 0.25 - scrollPercent * 1.5;
    }
}

// Load and inject custom material on scene load.
banner.loadScene("../assets/three_banner_4.6.glb");

banner.events.addEventListener( "ready", () => {
    banner.scene.traverse((child)=>{
        if(child.name == "RightSceneRoot") rightSceneRoot = child;
        if(child.name.includes("Plane")) child.material = gradientMat;
        if(child.name.includes("GradientSphere")) child.material = sphereGradientMat;
        if(child.name.includes("ScreenLights")) child.material = screenLightsMat;
        if(child.name.includes("MaskGrid")) child.material = gridMat;
        if(child.name.includes("Stencil")) child.material = stencilMat;
        if(child.name.includes("Mask")){
            child.material.stencilWrite = true;
            child.material.stencilRef = 1;
            child.material.stencilFunc = THREE.EqualStencilFunc;
        };
    });
    updateComposition();
});

banner.events.addEventListener("resized", updateComposition);
banner.events.addEventListener("visibilityChanged", (event) => {
    if (event.visible) updateComposition();
});

window.addEventListener("scroll", (event) => {
    scrollPercent = window.scrollY / banner.viewSize.y;
});