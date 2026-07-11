const REDUCED_MOTION = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };

export function useRipple() {
  const addRipple = (event, element) => {
    if (REDUCED_MOTION.matches) return;
    const circle = document.createElement('span');
    const diameter = Math.max(element.clientWidth, element.clientHeight);
    const radius = diameter / 2;

    const rect = element.getBoundingClientRect();

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('li-ripple-animation');

    const ripple = element.getElementsByClassName('li-ripple-animation')[0];
    if (ripple) {
      ripple.remove();
    }

    element.appendChild(circle);
    
    // Cleanup after animation
    setTimeout(() => {
      circle.remove();
    }, 600);
  };

  return {
    addRipple
  };
}

// Global styles for ripple should be injected or included in a base css file:
/*
.li-ripple-animation {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  animation: ripple 600ms linear;
  background-color: rgba(255, 255, 255, 0.7);
}

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
*/
