import React from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';

const Marker = ({ position, title, SVGComponent }) => {
  return (
    <AdvancedMarker
      position={position}
      title={title}
      style={{ transition: 'transform 1s ease-in-out' }}
    >
      <SVGComponent width={20} height={20} />
    </AdvancedMarker>
  );
};

export default Marker;