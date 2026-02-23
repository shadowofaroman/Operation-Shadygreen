import * as THREE from 'https://unpkg.com/three@0.170.0/build/three.module.js';

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(devicePixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky blue

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15);
camera.lookAt(0, 0, 0);

// Ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshLambertMaterial({ color: 0x3a7d44 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Grass
function createGrass(count, spread) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const indices = [];
  
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spread;
    const z = (Math.random() - 0.5) * spread;
    const height = 0.3 + Math.random() * 0.3;
    const lean = (Math.random() - 0.5) * 0.3;
    
    const base = i * 3;
    // 3 vertices per blade (triangle)
    positions.push(x - 0.05, 0, z);       // bottom left
    positions.push(x + 0.05, 0, z);       // bottom right
    positions.push(x + lean, height, z);  // tip
    
    indices.push(base, base + 1, base + 2);
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  const material = new THREE.MeshLambertMaterial({ 
    color: 0x4a9e5c,
    side: THREE.DoubleSide
  });
  
  return new THREE.Mesh(geometry, material);
}

const grass = createGrass(50000, 40);
scene.add(grass);

// Light
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 20, 10);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

// Resize
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();