import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import a1 from "../assets/about_img/anh1.jpg";
import a2 from "../assets/about_img/anh2.jpg";
import a3 from "../assets/about_img/anh3.png";
import a4 from "../assets/about_img/anh4.jpg";
import a5 from "../assets/about_img/anh5.jpg";

const images = [a1, a2, a3, a4, a5];
const links = ["/doctors", "", "/services", "", "/contact"];

const AutoScrollCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 4000); // Hold each image for 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-10 relative w-full h-[85vh] overflow-hidden rounded-md">
      <div
        className="flex transition-transform duration-1000 ease-in-out"
        style={{
          transform: `translateX(-${currentIndex * 100}vw)`,
          width: `${images.length * 100}vw`,
        }}
      >
        {images.map((img, index) => (
          <div key={index} className="w-screen h-screen flex-shrink-0">
            <img
              src={img}
              alt={`Slide ${index + 1}`}
              onClick={() => {
                navigate(links[index]);
                window.scrollTo(0, 0);
              }}
              className="w-full h-full object-contain cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AutoScrollCarousel;