import React, { useState, useEffect } from 'react';
import './BackgroundSlideshow.css'; // We'll create this CSS file next

// Import all background images (removed semicolons from import paths)
import image1 from '../assets/backgrounds/Spacetime_Scifi_Digital_Arts_Concept_original_1171594.jpg'
import image2 from '../assets/backgrounds/Abstract_Liquid_Shape_original_1161292.jpg'
import image3 from '../assets/backgrounds/Iceland_Snowy_Mountain_Landscape_original_1188826.jpg'
import image4 from '../assets/backgrounds/Ice_Formation_original_751030.jpg'
import image5 from '../assets/backgrounds/Woman_Lying_On_Pool_Float_original_1562529.jpg'

const images = [image1, image2, image3, image4, image5];

const BackgroundSlideshow: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true); // Start transition (fade out)
      // Wait for fade out (1 second) before changing the image index
      setTimeout(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
        setIsTransitioning(false); // End transition (fade in)
      }, 1000); // Transition duration (1 second)
    }, 30000); // Display duration (30 seconds)

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <div className="background-slideshow">
      {images.map((image, index) => (
        <div
          key={index}
          className={`background-slide ${index === currentImageIndex ? 'active' : ''} ${isTransitioning && index === currentImageIndex ? 'transitioning' : ''}`}
          style={{ backgroundImage: `url(${image})` }}
        />
      ))}
    </div>
  );
};

export default BackgroundSlideshow; 