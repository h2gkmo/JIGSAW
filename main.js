import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import * as turf from 'https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/+esm';

const scene = new THREE.Scene();
const oceanAudio = new Audio('wave.m4a');
oceanAudio.loop = true;

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 15;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Load Earth texture
const texture = new THREE.TextureLoader().load('textures/earthmap.png');
const globeGeometry = new THREE.SphereGeometry(5, 64, 64);
const globeMaterial = new THREE.MeshBasicMaterial({ map: texture });
const globe = new THREE.Mesh(globeGeometry, globeMaterial);
scene.add(globe);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let countriesGeoJSON = null;

// Load GeoJSON data asynchronously
fetch('data/countries.geojson')
  .then(res => res.json())
  .then(data => {
    countriesGeoJSON = data;
    console.log('Loaded countries.geojson');
  })
  .catch(console.error);

function uvToLatLon(uv) {
  const lon = uv.x * 360 - 180;
  const lat = uv.y * 180 - 90;
  return { lat, lon };
}

let currentCountryMesh = null;
let currentCountryLabel = null;

function getRandomPastelColor() {
  const r = Math.floor(150 + Math.random() * 105);
  const g = Math.floor(150 + Math.random() * 105);
  const b = Math.floor(150 + Math.random() * 105);
  return (r << 16) + (g << 8) + b;
}

function projectLonLatToXY(lon, lat) {
  return new THREE.Vector2(lon, lat);
}

// Fixed scale for all countries
const FIXED_COUNTRY_SCALE = 0.3;

// Create a country shape centered around its centroid
function addCountryMeshToScene(feature) {
  const shape = new THREE.Shape();
  const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];

  // Compute bounding box to find centroid
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  polygons.forEach(polygon => {
    polygon.forEach(ring => {
      ring.forEach(([lon, lat]) => {
        minX = Math.min(minX, lon);
        maxX = Math.max(maxX, lon);
        minY = Math.min(minY, lat);
        maxY = Math.max(maxY, lat);
      });
    });
  });
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  polygons.forEach(polygon => {
    polygon.forEach((ring, ringIndex) => {
      ring.forEach(([lon, lat], i) => {
        const x = lon - centerX;
        const y = lat - centerY;
        if (i === 0 && ringIndex === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
    });
  });

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({
    color: getRandomPastelColor(),
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(FIXED_COUNTRY_SCALE, FIXED_COUNTRY_SCALE, FIXED_COUNTRY_SCALE);

  // Fixed position for all countries (right side, not rotating)
  mesh.position.set(8, 0, 0);
  scene.add(mesh);
  return mesh;
}

function createCountryLabel(name) {
  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'white';
  ctx.font = '40px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const words = name.split(' ');
  const lines = [];
  let currentLine = '';
  words.forEach(word => {
    if ((currentLine + ' ' + word).length > 15) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  });
  if (currentLine) lines.push(currentLine);

  lines.forEach((line, i) => {
    ctx.fillText(line, size / 2, size / 2 + i * 45);
  });

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);

  // Fixed size and position under country
  sprite.scale.set(6, 3, 1);
  sprite.position.set(8, -2.5, 0);
  scene.add(sprite);
  return sprite;
}

window.addEventListener('click', (event) => {
  if (!countriesGeoJSON) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(globe);

  if (intersects.length > 0) {
    const uv = intersects[0].uv;
    const { lat, lon } = uvToLatLon(uv);
    const point = turf.point([lon, lat]);

    const country = countriesGeoJSON.features.find(feature =>
      turf.booleanPointInPolygon(point, feature)
    );

    if (country) {
      oceanAudio.pause();
      oceanAudio.currentTime = 0;

      if (currentCountryMesh) {
        scene.remove(currentCountryMesh);
        currentCountryMesh.geometry.dispose();
        currentCountryMesh.material.dispose();
        currentCountryMesh = null;
      }
      if (currentCountryLabel) {
        scene.remove(currentCountryLabel);
        currentCountryLabel.material.map.dispose();
        currentCountryLabel.material.dispose();
        currentCountryLabel = null;
      }

      currentCountryMesh = addCountryMeshToScene(country);
      currentCountryLabel = createCountryLabel(country.properties.ADMIN || country.properties.name);

      const countryName = country.properties.ADMIN || country.properties.name;
      const url = `https://www.google.com/maps/search/${encodeURIComponent(countryName)}`;
      window.open(url, "_blank", "width=600,height=400");
    } else {
      if (oceanAudio.paused) oceanAudio.play();
    }
  }
});


// === STARS BACKGROUND ===
function createStars() {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 2000;
  const starVertices = [];

  for (let i = 0; i < starCount; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
  }

  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}
createStars();


// === COMETS WITH GLOWING TAILS ===
const comets = [];
function createComet() {
  const cometGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const cometMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const comet = new THREE.Mesh(cometGeometry, cometMaterial);

  const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5 });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  comet.add(glow);

  const trailLength = 20;
  const trailPoints = [];
  for (let i = 0; i < trailLength; i++) {
    trailPoints.push(new THREE.Vector3(0, 0, 0));
  }
  const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
  const trailMaterial = new THREE.LineBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 });
  const trail = new THREE.Line(trailGeometry, trailMaterial);
  comet.userData.trail = trail;
  comet.add(trail);

  comet.position.set(Math.random() * 100 - 50, Math.random() * 100 - 50, -100);
  comet.userData.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 0.2,
    (Math.random() - 0.5) * 0.2,
    0.6 + Math.random() * 0.5
  );

  scene.add(comet);
  comets.push(comet);
}
setInterval(createComet, 6000);

function updateComets() {
  comets.forEach((comet, index) => {
    comet.position.add(comet.userData.velocity);

    const positions = comet.userData.trail.geometry.attributes.position.array;
    for (let i = positions.length - 3; i > 0; i -= 3) {
      positions[i] = positions[i - 3];
      positions[i + 1] = positions[i - 2];
      positions[i + 2] = positions[i - 1];
    }
    positions[0] = 0;
    positions[1] = 0;
    positions[2] = 0;
    comet.userData.trail.geometry.attributes.position.needsUpdate = true;

    if (comet.position.z > 50) {
      scene.remove(comet);
      comets.splice(index, 1);
    }
  });
}


// === SHOOTING STARS ===
const shootingStars = [];
function createShootingStar() {
  const geom = new THREE.SphereGeometry(0.1, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
  const star = new THREE.Mesh(geom, mat);
  star.position.set(Math.random() * 100 - 50, Math.random() * 100 - 50, -50);
  star.userData.velocity = new THREE.Vector3(-0.8, -0.5, 1.2);
  scene.add(star);
  shootingStars.push(star);
}
setInterval(createShootingStar, 8000);

function updateShootingStars() {
  shootingStars.forEach((star, index) => {
    star.position.add(star.userData.velocity);
    if (star.position.z > 50) {
      scene.remove(star);
      shootingStars.splice(index, 1);
    }
  });
}


// === METEOROIDS ===
const meteoroids = [];
function createMeteoroid() {
  const geom = new THREE.IcosahedronGeometry(0.2 + Math.random() * 0.5, 1);
  const mat = new THREE.MeshBasicMaterial({ color: 0x888888 });
  const rock = new THREE.Mesh(geom, mat);
  rock.position.set(Math.random() * 200 - 100, Math.random() * 200 - 100, Math.random() * -200);
  rock.userData.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 0.02,
    (Math.random() - 0.5) * 0.02,
    0.05 + Math.random() * 0.05
  );
  scene.add(rock);
  meteoroids.push(rock);
}
for (let i = 0; i < 50; i++) createMeteoroid();

function updateMeteoroids() {
  meteoroids.forEach(rock => {
    rock.position.add(rock.userData.velocity);
    rock.rotation.x += 0.01;
    rock.rotation.y += 0.01;
  });
}


function animate() {
  requestAnimationFrame(animate);
  globe.rotation.y += 0.0015;

  if (currentCountryLabel) {
    currentCountryLabel.lookAt(camera.position);
  }

  updateComets();
  updateShootingStars();
  updateMeteoroids();

  renderer.render(scene, camera);
}

animate();
