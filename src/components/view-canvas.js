import React from 'react';
import PropTypes from 'prop-types';
const ViewCanvas = ({draw,viewVolume,positions}) => {
  const canvas = React.useRef();
  React.useEffect(() => {
    const context = canvas.current.getContext('2d');
    draw(context,viewVolume,positions);
  });
return (
    <canvas ref={canvas} />
  );
};
ViewCanvas.propTypes = {
  draw: PropTypes.func.isRequired,
  viewVolume: PropTypes.object.isRequired,
  positions: PropTypes.array.isRequired
};
export default ViewCanvas;