import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- SETUP ---
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(10, 10, 25);

// --- LIGHTING ---
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(5, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.00001; // Adjusted for thin grass
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

// --- POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.4, 0.85);
composer.addPass(bloomPass);

// --- SHARED GRASS LOGIC (The R&D Engine) ---

const grassUniforms = { uTime: { value: 0 } };

function applyGrassShader(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = grassUniforms.uTime;
    shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #ifdef USE_INSTANCING
        vec3 worldPos = instanceMatrix[3].xyz;
      #else
        vec3 worldPos = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      #endif

      // Wind calculation based on world position
      float wind = sin(uTime * .005 + worldPos.x * 0.2 + worldPos.z * 0.2) * pow(uv.y, 2.5) * 0.7;
      vec3 transformed = vec3( position );
      transformed.x += wind;
      `
    );
  };
}

// Master Geometry (Used for both single and field)
const bladeGeo = new THREE.PlaneGeometry(0.015, 0.6, 1, 4).translate(0, 0.3, 0);

// --- 1. THE HERO BLADE (Single) ---
const heroMat = new THREE.MeshStandardMaterial({ color: 0x7fff00, side: THREE.DoubleSide });
applyGrassShader(heroMat);
const heroBlade = new THREE.Mesh(bladeGeo, heroMat);
heroBlade.position.set(2, 0, 10);
heroBlade.castShadow = true;
scene.add(heroBlade);

// --- 2. THE GRASS FIELD (Whole Type) ---
const GRASS_COUNT = 300000;
const fieldMat = new THREE.MeshStandardMaterial({ color: 0x5ca613, side: THREE.DoubleSide });
applyGrassShader(fieldMat);

const instancedGrass = new THREE.InstancedMesh(bladeGeo, fieldMat, GRASS_COUNT);
instancedGrass.receiveShadow = true;
// instancedGrass.castShadow = true; // Warning: 300k shadow casters is heavy!

const dummy = new THREE.Object3D();
for (let i = 0; i < GRASS_COUNT; i++) {
  dummy.position.set((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40);
  dummy.rotation.y = Math.random() * Math.PI;
  dummy.scale.set(1, 0.5 + Math.random() * 1.5, 1);
  dummy.updateMatrix();
  instancedGrass.setMatrixAt(i, dummy.matrix);
}
scene.add(instancedGrass);

// --- MODEL LOADING ---
let canopyModel = null;
const loader = new GLTFLoader();
loader.load('models/wall_mounted_louvred.glb', (gltf) => {
    canopyModel = gltf.scene;
    canopyModel.scale.setScalar(5);
    scene.add(canopyModel);
    canopyModel.traverse(c => { if(c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
});

// Ground for structure
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40,40), new THREE.MeshStandardMaterial({color: 0x111111}));
floor.rotation.x = -Math.PI/2;
floor.position.y = -0.01;
floor.receiveShadow = true;
scene.add(floor);

// --- TOOLS ---
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
const transformGizmo = new TransformControls(camera, renderer.domElement);
scene.add(transformGizmo);
transformGizmo.addEventListener('dragging-changed', e => orbit.enabled = !e.value);

function handleContextAction(action) {
  if (action === 'transform') {
    transformGizmo.attach(canopyModel || heroBlade); // Can now attach to either!
    bloomPass.strength = 3.0;
    setTimeout(() => bloomPass.strength = 0.5, 300);
  }
  if (action === 'reset') {
    transformGizmo.detach();
  }
}

// Context Menu (Simplified)
canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY);
});

function showContextMenu(x, y) {
    document.getElementById('shadygreen-ctx')?.remove();
    const menu = document.createElement('div');
    menu.id = 'shadygreen-ctx';
    menu.innerHTML = `<div class="ctx-item" data-action="transform">Transform Selection</div>`;
    Object.assign(menu.style, { position: 'fixed', top: y+'px', left: x+'px', zIndex: 1000, background: '#111', color: '#fff', padding: '10px' });
    document.body.appendChild(menu);
    menu.querySelector('.ctx-item').onclick = () => handleContextAction('transform');
    window.onclick = () => menu.remove();
}

// --- RENDER LOOP ---
function animate(time) {
  grassUniforms.uTime.value = time * 0.001; 
  orbit.update();
  composer.render();
  requestAnimationFrame(animate);
}
animate();