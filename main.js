import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import * as turf from 'https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/+esm';

const scene = new THREE.Scene();
const oceanAudio = new Audio('wave.m4a');
oceanAudio.loop = true;
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 15;  // Zoomed out a bit


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
  const lat = uv.y * 180 - 90;  // flip Y here
  return { lat, lon };
}


window.addEventListener('click', (event) => {
  if (!countriesGeoJSON) return; // Wait until geojson is loaded

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
      console.log('Clicked country:', country.properties.ADMIN || country.properties.name);
      // TODO: Expand and show the country map here
    } else {
      console.log('Clicked ocean or no country found');
    }
  }
});

function animate() {
  requestAnimationFrame(animate);
  globe.rotation.y += 0.0015;
  renderer.render(scene, camera);
}

animate();
function projectLonLatToXY(lon, lat) {
  // Simple equirectangular projection (X: lon, Y: lat)
  // You can scale it later for display
  return new THREE.Vector2(lon, lat);
}
function createShapeFromGeoJSON(feature) {
  const shape = new THREE.Shape();

  // GeoJSON polygons can be MultiPolygon or Polygon
  const polygons = feature.geometry.type === 'MultiPolygon' ?
    feature.geometry.coordinates : [feature.geometry.coordinates];

  polygons.forEach(polygon => {
    polygon.forEach((ring, ringIndex) => {
      // ring is an array of [lon, lat]
      ring.forEach(([lon, lat], i) => {
        const point = projectLonLatToXY(lon, lat);
        if (i === 0 && ringIndex === 0) {
          shape.moveTo(point.x, point.y);
        } else {
          shape.lineTo(point.x, point.y);
        }
      });
      // Close the ring shape automatically
    });
  });

  return shape;
}
function addCountryMeshToScene(feature) {
  const shape = createShapeFromGeoJSON(feature);

  // Extrude or flat shape geometry
  const geometry = new THREE.ShapeGeometry(shape);

  // Simple color for country fill
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });

  const mesh = new THREE.Mesh(geometry, material);

  // Scale up for better visibility (since lon/lat range is small)
  mesh.scale.set(0.05, 0.05, 0.05);

  // Position in front of camera, e.g. z = 5
  mesh.position.set(0, 0, 5);

  scene.add(mesh);

  return mesh;
}
let currentCountryMesh = null;

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
      console.log('Clicked country:', country.properties.ADMIN || country.properties.name);

      // Remove old country mesh if exists
      if (currentCountryMesh) {
        scene.remove(currentCountryMesh);
        currentCountryMesh.geometry.dispose();
        currentCountryMesh.material.dispose();
        currentCountryMesh = null;
      }

      // Add new country mesh
      currentCountryMesh = addCountryMeshToScene(country);

       // ✅ Stop ocean sound when land is clicked
      oceanAudio.pause();
      oceanAudio.currentTime = 0;
    } else {
      console.log('Clicked ocean or no country found');
      
      // Play wave.m4a sound
      if (oceanAudio.paused) {
        oceanAudio.play();}
    }
  }
});