import { ReleaseBanner } from "./js/three_banner.js";
import { MakeGradientMat } from "./js/gradient_quad_mat.js";
import { MakeLightrayMat } from "./js/lightray_mat.js";
import { mapRange, clamp } from "./js/math_util.js";
import * as THREE from "./js/three/three.module.min.js";

let banner = new ReleaseBanner("#three-container", "#three-canvas");
let blueLightRay = MakeLightrayMat("#4bf6ff");
let quadGradientMat = MakeGradientMat("#49a7ff");
let cameraAnchor = undefined;
let bgMesh = undefined;
let sceneRoot = undefined;
let gradient1 = undefined;
let gradient2 = undefined;

let scrollPercent = 0.0;
let mouseLerped = banner.mouse.clone();

// Light setup

const ambientLight = new THREE.AmbientLight(0xFFFFFF, 2.0);
banner.scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 8.5);
directionalLight.position.set(0.5, 1.0, 1.0);
directionalLight.target.position.set(0.0, 0.0, 0.0);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;

directionalLight.shadow.intensity = 0.8;
directionalLight.shadow.camera.top = 20.0;
directionalLight.shadow.camera.bottom = -10.0;
directionalLight.shadow.camera.left = 15.0;
directionalLight.shadow.camera.right = -15.0;
directionalLight.shadow.camera.far =  20.0;
directionalLight.shadow.camera.near =  0.0;
directionalLight.shadow.normalBias = 0.01;
directionalLight.shadow.bias = 0.01;

banner.scene.add(directionalLight);
banner.scene.add(directionalLight.target);

const backLight = new THREE.DirectionalLight(0xb5e3ff, 4.0);
backLight.position.set(-1.0, -1.0, -1.0);
backLight.target.position.set(0.0, 0, 0);
banner.scene.add(backLight);
banner.scene.add(backLight.target);

function setBgColor() {
    if (!bgMesh) return;
    bgMesh.material.color = new THREE.Color("hsl(200, 2.0%, 2.0%)");
}

function updateComposition() {
    if (banner.viewSize.x == 0.0 && banner.viewSize.y == 0.0) return;

    let ratio = clamp(banner.viewSize.x / banner.viewSize.y, 1.0, 2.0);
    let ratioX = mapRange(ratio, 1.0, 2.0, 0.0, 1.0);

    if (cameraAnchor) {
        cameraAnchor.position.y = 2.0;

        banner.sceneCamera.position.z = 2.0;
        banner.sceneCamera.position.set(0.0, 0.0, 2.0)
        banner.sceneCamera.lookAt(new THREE.Vector3(0.0, 1.0, 0.0));
    }

    if (sceneRoot) {
        sceneRoot.position.z = mapRange(ratioX, 0.0, 1.0, -12.0, -10.0);
        sceneRoot.position.x = mapRange(ratioX, 0.0, 1.0, 0.5, 5.0);
        sceneRoot.position.y = mapRange(ratioX, 0.0, 1.0, -3.0, -2.);
        sceneRoot.rotation.y = mapRange(ratioX, 0.0, 1.0, -Math.PI * 0.1, -Math.PI * 0.18);
    }

    if (gradient1) gradient1.position.x = mapRange(ratioX, 0.0, 1.0, -5.0, -15.0);
    if (gradient2) gradient2.position.x = mapRange(ratioX, 0.0, 1.0, 10.0, 15.0);

}

banner.process = function(delta){
    if (this.sceneCamera){
        mouseLerped.lerp(this.mouse, 10.0 * delta);
        this.sceneCamera.position.x = (mouseLerped.x - 0.5) * 1.0;
        this.sceneCamera.position.y = -(mouseLerped.y - 0.5) * 1.0 - scrollPercent * 1.5;
    }
    blueLightRay.uniforms.uTime.value = window.performance.now();
}

// Load and inject custom material on scene load.
banner.loadScene("../assets/three_banner_4.7.glb");


banner.events.addEventListener( "ready", () => {
    banner.scene.traverse((child)=>{
        if (child.name.toLowerCase().includes("lightray")){
            child.material = blueLightRay;
        }
        if (child instanceof THREE.Mesh) {
            if (child.name.toLowerCase().includes("plush")) child.castShadow = true;
            if (child.name.toLowerCase().includes("receiveshadow")) child.receiveShadow = true;
            if (child.name.toLowerCase().includes("castshadow")) child.castShadow = true;
            if (child.name == "WorldSphereMesh") bgMesh = child;
            if (child.name.toLowerCase().includes("backgroundgradient")) child.material = quadGradientMat;

            if (child.name == "BackgroundGradientMesh1") gradient1 = child;
            if (child.name == "BackgroundGradientMesh2") gradient2 = child;

        }
        if (child.name == "SceneHolder") sceneRoot = child;
        if (child.name == "CameraAnchor") cameraAnchor = child;
    });
    // Set bg color
    setBgColor();
    updateComposition();
});

banner.events.addEventListener( "colorSchemeChanged", setBgColor);
banner.events.addEventListener("resized", updateComposition);
banner.events.addEventListener("visibilityChanged", (event) => {
    if (event.visible) updateComposition();
});

window.addEventListener("scroll", (event) => {
    scrollPercent = window.scrollY / banner.viewSize.y;
});

