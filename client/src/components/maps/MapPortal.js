import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

// A component that renders its children in a portal to prevent DOM conflicts
const MapPortal = ({ children, isOpen }) => {
  const [portalNode, setPortalNode] = useState(null);

  useEffect(() => {
    // Create a new div element that lives outside the main React tree
    if (isOpen && !portalNode) {
      const node = document.createElement('div');
      node.className = 'map-portal-container';
      document.body.appendChild(node);
      setPortalNode(node);
    }

    // Cleanup: remove the portal node when component unmounts or closes
    return () => {
      if (portalNode) {
        // Use a timeout to ensure React has finished with the node
        setTimeout(() => {
          try {
            if (document.body.contains(portalNode)) {
              document.body.removeChild(portalNode);
            }
          } catch (err) {
            console.warn('Error removing portal node:', err);
          }
          setPortalNode(null);
        }, 100);
      }
    };
  }, [isOpen, portalNode]);

  // Only render the portal when it's open and the node exists
  if (!isOpen || !portalNode) {
    return null;
  }

  // Use createPortal to render children into the detached DOM node
  return ReactDOM.createPortal(children, portalNode);
};

export default MapPortal; 