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

const texture = new THREE.TextureLoader().load('textures/earthmap.png');
const globeGeometry = new THREE.SphereGeometry(5, 64, 64);
const globeMaterial = new THREE.MeshBasicMaterial({ map: texture });
const globe = new THREE.Mesh(globeGeometry, globeMaterial);
scene.add(globe);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let countriesGeoJSON = null;
let chosenCountryData = null; // Store geometry and color

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
let playNowButton = null;

function getRandomPastelColor() {
  const r = Math.floor(150 + Math.random() * 105);
  const g = Math.floor(150 + Math.random() * 105);
  const b = Math.floor(150 + Math.random() * 105);
  return (r << 16) + (g << 8) + b;
}

const FIXED_COUNTRY_SCALE = 0.3;

function addCountryMeshToScene(feature) {
  const shape = new THREE.Shape();
  const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];

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
  const pastelColor = getRandomPastelColor();
  const material = new THREE.MeshBasicMaterial({
    color: pastelColor,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(FIXED_COUNTRY_SCALE, FIXED_COUNTRY_SCALE, FIXED_COUNTRY_SCALE);
  mesh.position.set(8, 0, 0);
  scene.add(mesh);

  // Save for puzzle window
  chosenCountryData = {
    geometry: polygons,
    color: pastelColor,
    name: feature.properties.ADMIN || feature.properties.name
  };

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

  sprite.scale.set(6, 3, 1);
  sprite.position.set(8, -2.5, 0);
  scene.add(sprite);
  return sprite;
}

function createPlayNowButton() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.shadowColor = 'rgba(245, 245, 235, 0.8)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#3c60daff';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.roundRect(20, 40, 216, 50, 15);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'black';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PLAY NOW', 128, 65);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const button = new THREE.Sprite(material);
  button.scale.set(4, 2, 1);
  button.position.set(8, 2.5, 0);
  button.name = "playNowButton";
  scene.add(button);
  return button;
}

window.addEventListener('click', (event) => {
  if (!countriesGeoJSON) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const objectsToCheck = [globe];
  if (playNowButton) objectsToCheck.push(playNowButton);

  const intersects = raycaster.intersectObjects(objectsToCheck.filter(Boolean));
  if (intersects.length === 0) return;

  const clickedObj = intersects[0].object;

  // If Play Now button clicked
if (clickedObj.name === "playNowButton") {
  const popup = window.open("", "popup", "width=420,height=540,left=0,top=100");
  popup.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Start Puzzle</title>
      <style>
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          font-family: 'Segoe UI', Arial, sans-serif;
        }
        .bg {
          position: fixed;
          left: 0; top: 0;
          width: 100vw; height: 100vh;
          z-index: 0;
        }
        .bg video {
          position: absolute;
          left: 0; top: 0;
          width: 100vw; height: 100vh;
          object-fit: cover;
          z-index: 0;
        }
        .center {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 340px;
          max-width: 95vw;
          padding: 32px 24px 24px 24px;
          border-radius: 32px;
          background: rgba(255,255,255,0.13);
          box-shadow: 0 8px 48px #0008, 0 0 0 2px #fff2;
          backdrop-filter: blur(16px);
          text-align: center;
          z-index: 2;
        }
        .headline {
          font-size: 2rem;
          font-weight: bold;
          color: #463c05ff;
          margin-bottom: 10px;
          letter-spacing: 2px;
          text-shadow: 0 2px 16px #fff, 0 0 24px #ffd700;
          animation: pop 1.2s cubic-bezier(.68,-0.55,.27,1.55);
        }
        @keyframes pop {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        .country {
          font-size: 1.1rem;
          color: #fff;
          margin-bottom: 8px;
          font-weight: 500;
          text-shadow: 0 2px 8px #222;
        }
        .subtitle {
          color: #e0e0e0;
          font-size: 1rem;
          margin-bottom: 12px;
          text-shadow: 0 1px 4px #222;
        }
        .instructions {
          color: #fff;
          font-size: 0.98rem;
          margin-bottom: 18px;
          text-shadow: 0 1px 4px #222;
        }
        .arrow-btn {
          margin: 0 auto;
          margin-top: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border: none;
          background: none;
          cursor: pointer;
          outline: none;
        }
        .arrow-svg {
          filter: drop-shadow(0 0 12px #ffd700) drop-shadow(0 0 24px #fff);
          transition: filter 0.2s;
        }
        .arrow-btn:hover .arrow-svg {
          filter: drop-shadow(0 0 24px #ffd700) drop-shadow(0 0 36px #fff);
        }
        .confetti-canvas {
          position: fixed;
          left: 0; top: 0;
          width: 100vw; height: 100vh;
          pointer-events: none;
          z-index: 1;
        }
        @media (max-width: 400px) {
          .center { padding: 18px 4vw; }
          .headline { font-size: 1.2rem; }
          .country { font-size: 1rem; }
          .subtitle { font-size: 0.9rem; }
          .instructions { font-size: 0.9rem; }
        }
      </style>
    </head>
    <body>
      <div class="bg">
        <video src="background_vid.mp4" autoplay loop muted></video>
      </div>
      <canvas class="confetti-canvas"></canvas>
      <div class="center">
        <div class="headline">Let's Start the Puzzle!</div>
        <div class="subtitle">Ready to fix this country's map?</div>
        <div class="instructions">
          Drag and drop the puzzle pieces to complete the country.<br>
          Have fun and learn geography!
        </div>
        <button class="arrow-btn" id="arrowBtn" title="Next">
          <svg class="arrow-svg" width="48" height="48" viewBox="0 0 48 48">
            <polygon points="16,8 36,24 16,40" fill="#463c05ff" stroke="#fff" stroke-width="3" />
          </svg>
        </button>
      </div>
      <script>
        // Confetti animation
        const canvas = document.querySelector('.confetti-canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        const colors = ['#ffd700', '#ff4081', '#40c4ff', '#69f0ae', '#fff176', '#ffab40', '#ab47bc'];
        let confetti = [];
        let frame = 0;
        let startTime = Date.now();
        function spawnConfetti() {
          for (let i = 0; i < 6; i++) {
            confetti.push({
              x: Math.random() * canvas.width,
              y: -20,
              r: 8 + Math.random() * 8,
              color: colors[Math.floor(Math.random() * colors.length)],
              vx: (Math.random() - 0.5) * 2,
              vy: 2 + Math.random() * 2,
              ay: 0.08 + Math.random() * 0.05,
              angle: Math.random() * 2 * Math.PI,
              spin: (Math.random() - 0.5) * 0.2
            });
          }
        }
        function animateConfetti() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          confetti.forEach(c => {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.angle);
            ctx.fillStyle = c.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, c.r, c.r / 2, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
            c.x += c.vx;
            c.y += c.vy;
            c.vy += c.ay;
            c.angle += c.spin;
          });
          confetti = confetti.filter(c => c.y < canvas.height + 40);
          if ((Date.now() - startTime) < 3000 && frame % 8 === 0) {
            spawnConfetti();
          }
          frame++;
          if ((Date.now() - startTime) < 3000) {
            requestAnimationFrame(animateConfetti);
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
        animateConfetti();
        window.addEventListener('resize', () => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        });

        document.getElementById('arrowBtn').onclick = function() {
          sessionStorage.setItem('countryPuzzleData', JSON.stringify(${JSON.stringify({
            geometry: chosenCountryData?.geometry || [],
            color: chosenCountryData?.color || 0xffffff,
            name: chosenCountryData?.name || ""
          })}));
          window.location.href = "next.html";
        };
      </script>
    </body>
    </html>
  `);
  return;
}

  if (clickedObj === globe && intersects[0].uv) {
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
      if (playNowButton) {
        scene.remove(playNowButton);
        playNowButton.material.map.dispose();
        playNowButton.material.dispose();
        playNowButton = null;
      }

      currentCountryMesh = addCountryMeshToScene(country);
      currentCountryLabel = createCountryLabel(country.properties.ADMIN || country.properties.name);

      playNowButton = createPlayNowButton();

      const countryName = country.properties.ADMIN || country.properties.name;
      const url = `https://www.google.com/maps/search/${encodeURIComponent(countryName)}`;
      window.open(url, "_blank", "width=600,height=400");
    } else {
      if (oceanAudio.paused) oceanAudio.play();
      if (playNowButton) {
        scene.remove(playNowButton);
        playNowButton.material.map.dispose();
        playNowButton.material.dispose();
        playNowButton = null;
      }
    }
  }
});

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