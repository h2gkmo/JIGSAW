# JIGSAW

A web-based puzzle / interactive experience built with HTML, JavaScript and asset files (audio/video/images).  
This project demonstrates a dynamic “jigsaw / puzzle-style” interface using multimedia backgrounds, sound effects, and interactive logic.

## 🔍 Project Overview

- Core files: `index.html`, `main.js`, `next.html`  
- Media assets are stored under the `textures/` and `data/` directories.  
- Includes background videos, images, audio-effects (`pop.wav`, `tap.mp3`, `wave.m4a`) used for interactive feedback.  
- Built using plain JavaScript + HTML (no external heavy frameworks) to keep things lightweight.

## 🎯 Features

- Multimedia backgrounds (video & image) for immersive experience.  
- Click/tap sound effects for user interactions.  
- An interactive flow: starting at `index.html`, then (optionally) `next.html` for further stages.  
- Asset-rich — textures, audio, background videos to add visual and auditory polish.  
- Easy to fork and customize: swap out assets and modify `main.js` logic to repurpose for your own interactive puzzle or experience.

## 🧪 Getting Started

1. Clone the repository  
   git clone https://github.com/h2gkmo/JIGSAW.git
   cd JIGSAW
 
2. Open index.html in your browser (no build step required).    
   # or simply double-click the file in your file manager/browser
   
3. To customise:
    - Modify main.js for behaviour changes.
    - Replace assets inside textures/, data/ or media files.
    - Adjust next.html if you want additional pages or flows.

🧩 Directory Structure

JIGSAW/
├── data/              # JSON or other data files (if any)
├── textures/          # Image / video / texture assets
├── background.mp4     # Primary background video
├── background2.mp4    # Secondary background video
├── background_img.jpeg# Static background image
├── background_vid.mp4 # Another variant background video
├── index.html         # Entry point
├── main.js            # JavaScript logic
├── next.html          # Optional second page
├── pop.wav            # Click/pop sound effect
├── tap.mp3            # Tap sound effect
└── wave.m4a           # Additional audio ambient/feedback

🤝 Contributing

Contributions are welcome! If you’d like to suggest improvements or add new features:

- Fork the repo.
- Create a new branch: git checkout -b feature-yourFeatureName.
- Commit your changes: git commit -m 'Add some feature'.
- Push to your branch: git push origin feature-yourFeatureName.
- Open a Pull Request and describe your changes.
- Please ensure all interactive behaviour remains smooth and assets load correctly.

📄 License

This project is open source. You may use, modify and distribute the code and assets freely (unless specific assets are copyrighted).
Include any license file here if you want (e.g., MIT License).

🧠 Ideas for Extension

- Add more stages/pages beyond next.html.
- Incorporate puzzle-piece dragging logic (e.g., users assemble pieces).
- Add timer, scoring or high-score tracking.
- Replace backgrounds dynamically based on user selection.
- Integrate responsive design for mobile/touch-screens.
- Enjoy exploring and expanding the JIGSAW experience!
  
Happy coding 🚀
