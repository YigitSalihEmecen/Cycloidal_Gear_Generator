# Cycloidal Gear Generator

A web-based parametric 3D modeling tool designed for generating perfectly mathematically calculated cycloidal gears and outer rings. This application is built with React and Three.js, tailored specifically for 3D printing enthusiasts, robotics developers, and mechanical engineers.

## Features

- **Parametric 3D Generation**: Instantly generate cycloidal drives by tweaking mathematical parameters (Pins, Radius, Eccentricity, Tolerances).
- **Live 3D Visualization**: See a real-time, interactive 3D preview of your gear assembly directly in the browser.
- **Dynamic Tolerances**: Artificially adjusts the cycloidal disc profile mathematically to create perfect mechanical clearances for 3D printing.
- **Multi-Disc Balancing**: Stack up to 4 cycloidal discs. The app automatically offsets the eccentric phases and perfectly aligns the output holes for a single solid output shaft.
- **Instant STL Export**: Export your generated discs and outer ring individually as `.stl` files, or download the entire assembly as a single `.zip` file for immediate slicing and 3D printing.

## Technology Stack

- **React.js** & **Vite**: For a lightning-fast, reactive user interface.
- **Three.js**: To compute and render 3D geometries and parametric extrusions.
- **JSZip**: To package generated `.stl` files on the client side.

## Getting Started

To run this application locally on your machine:

1. Clone this repository:
   ```bash
   git clone https://github.com/YigitSalihEmecen/Cycloidal_Gear_Generator.git
   cd Cycloidal_Gear_Generator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the local server URL (usually `http://localhost:5173`).
