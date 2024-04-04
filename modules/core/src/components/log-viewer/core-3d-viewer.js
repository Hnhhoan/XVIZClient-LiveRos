// Copyright (c) 2019 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
import React, {PureComponent} from 'react';
import PropTypes, { func } from 'prop-types';

import {StaticMap} from 'react-map-gl';
import Map from 'react-map-gl';
import ReactMapGL from 'react-map-gl'; 
import DeckGL from '@deck.gl/react';
import {COORDINATE_SYSTEM} from '@deck.gl/core';
import {_MapContext as MapContext} from 'react-map-gl';

import ObjectLabelsOverlay from './object-labels-overlay';

import {SimpleMeshLayer} from '@deck.gl/mesh-layers';
import {LineLayer,ScatterplotLayer} from '@deck.gl/layers';
import {XVIZStyleParser} from '@xviz/parser';

import XVIZLayer from '../../layers/xviz-layer';

import {VIEW_MODE, DEFAULT_VIEW_STATE} from '../../constants';
import {getViewStateOffset, getViews, getViewStates} from '../../utils/viewport';
import {resolveCoordinateTransform} from '../../utils/transform';
import {mergeXVIZStyles} from '../../utils/style';
import {normalizeStreamFilter} from '../../utils/stream-utils';
import stats from '../../utils/stats';
import memoize from '../../utils/memoize';
import { _Pose as Pose } from 'math.gl';
import { addMetersToLngLat } from 'viewport-mercator-project';
import {DEFAULT_ORIGIN, CAR_DATA, LIGHTS, DEFAULT_CAR} from './constants';
import {Geometry} from '@luma.gl/core'
import { fillArray } from '@deck.gl/core/dist/es5/utils/flatten';
import {CubeGeometry} from '@luma.gl/engine';
import controller from '@deck.gl/core/dist/es5/controllers/controller';
const geometry = new CubeGeometry();
const noop = () => {};

const Z_INDEX = {
  car: 0,
  point: 1,
  polygon: 2,
  customDefault: 3
};

export default class Core3DViewer extends PureComponent {
  static propTypes = {
    // Props from loader
    frame: PropTypes.object,
    metadata: PropTypes.object,
    streamsMetadata: PropTypes.object,

    // Rendering options
    trackedVehicle:PropTypes.string,// them vao
    showMap: PropTypes.bool,
    showTooltip: PropTypes.bool,
    mapboxApiAccessToken: PropTypes.string,
    mapStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    xvizStyles: PropTypes.object,
    car: PropTypes.object,
    viewMode: PropTypes.object,
    streamFilter: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.array,
      PropTypes.object,
      PropTypes.func
    ]),
    customLayers: PropTypes.array,
    renderObjectLabel: PropTypes.func,
    getTransformMatrix: PropTypes.func,

    // Callbacks
    onMapLoad: PropTypes.func,
    onDeckLoad: PropTypes.func,
    onHover: PropTypes.func,
    onClick: PropTypes.func,
    onContextMenu: PropTypes.func,
    onViewStateChange: PropTypes.func,

    // Debug info listener
    debug: PropTypes.func,

    // States
    viewState: PropTypes.object,
    viewOffset: PropTypes.object,
    objectStates: PropTypes.object
  };

  static defaultProps = {
    car: DEFAULT_CAR,
    viewMode: VIEW_MODE.PERSPECTIVE,
    xvizStyles: {},
    customLayers: [],
    onMapLoad: noop,
    onDeckLoad: noop,
    onViewStateChange: noop,
    onHover: noop,
    onClick: noop,
    onContextMenu: noop,
    showMap: true,
    showTooltip: false
  };

  constructor(props) {
    super(props);

    this.state = {
      styleParser: this._getStyleParser(props),
      views: getViews(props.viewMode),
      controller:{touchRotate: true, doubleClickZoom: true, dragPan:true,dragRotate:true}
    };

    this.getLayers = memoize(this._getLayers.bind(this));
    this.getViewState = memoize(this._getViewState.bind(this));
    //this.trackedVehicle=props.trackedVehicle;// them vao
    //this.updateBoundingBox=props.updateBoundingBox;
    //this.boundingBoxes=props.boundingBoxes;
  }

  deckRef = React.createRef();

  componentWillReceiveProps(nextProps) {
    if (this.props.viewMode !== nextProps.viewMode) {
      const viewState = {
        ...this.props.viewState,
        ...DEFAULT_VIEW_STATE,
        ...nextProps.viewMode.initialViewState
      };
      // Reset offset
      const viewOffset = {
        x: 0,
        y: 0,
        bearing: 0
      };

      nextProps.onViewStateChange({viewState, viewOffset});
      this.setState({
        views: getViews(nextProps.viewMode)
      });
    }
    if (
      this.props.metadata !== nextProps.metadata ||
      this.props.xvizStyles !== nextProps.xvizStyles
    ) {
      this.setState({
        styleParser: this._getStyleParser(nextProps)
      });
    }
    if (this.props.frame !== nextProps.frame) {
      stats.get('frame-update').incrementCount();
    }
  }

  _onMapLoad = evt => {
    const map = evt.target;
    this.props.onMapLoad(map);
  };

  _onDeckLoad = () => {
    const deck = this.deckRef.current.deck;
    this.props.onDeckLoad(deck);
  };

  _onMetrics = deckMetrics => {
    if (this.props.debug) {
      const metrics = Object.assign({}, deckMetrics);
      const table = stats.getTable();

      for (const key in table) {
        metrics[key] = table[key].count;
      }
      this.props.debug(metrics);
    }
    stats.reset();
  };

  _onViewStateChange = ({viewState, oldViewState}) => {
    const viewOffset = getViewStateOffset(oldViewState, viewState, this.props.viewOffset);
    this.props.onViewStateChange({viewState, viewOffset});
  };

  _onLayerHover = (info, evt) => {
    const objectId = info && info.object && info.object.id;
    this.isHovering = Boolean(objectId);
    this.props.onHover(info, evt);
  };

  _onLayerClick = (info, evt) => {
    const isRightClick = evt.which === 3;

    if (isRightClick) {
      this.props.onContextMenu(info, evt);
    } else {
      this.props.onClick(info, evt);
    }
    //alert("onLayerClick");
    //console.log(info);
    //console.log(evt);
  };

  _getStyleParser({metadata, xvizStyles}) {
    return new XVIZStyleParser(mergeXVIZStyles(metadata && metadata.styles, xvizStyles));
  }
  _setController=(obj)=>{
    //this.state.set({controller:{...this.state.controller,...obj}});
    this.setState({controller:{...this.state.controller,...obj}})
  }
  _getBBVertices(box){
    let vertices=[
      [-0.5, -0.5, 0.5],//v0
      [0.5, -0.5, 0.5],//v1
      [0.5, 0.5, 0.5],//v2
      [-0.5, 0.5, 0.5],//v3
      [-0.5, -0.5, -0.5],//v4
      [0.5, -0.5, -0.5],//v5
      [0.5, 0.5, -0.5],//v6
      [-0.5, 0.5, -0.5],//v7,
      [0, 0, 0],//v8= Origin
      [1, 0, 0],//v9=Vector Ox
      [0, 1, 0],//v10= Vector Oy
      [0, 0, 1],//v11= Vector Oz
      [0, 0, -0.5]//v12 =track point;
    ];
    const getVertexCoordinate=(v,b)=>{
      let point=[2*v[0]*b.scale[0],2*v[1]*b.scale[1],2*v[2]*b.scale[2]];
      let [roll,pitch,yaw]=b.orientation;
      roll=1.0*roll/180*Math.PI;
      pitch=1.0*pitch/180*Math.PI;
      yaw=1.0*yaw/180*Math.PI;
      const row_0 = [
            Math.cos(pitch) * Math.cos(yaw),
            Math.sin(roll) * Math.sin(pitch) * Math.cos(yaw) - Math.cos(roll) * Math.sin(yaw),
            Math.cos(roll) * Math.sin(pitch) * Math.cos(yaw) + Math.sin(roll) * Math.sin(yaw)];
      const row_1 = [
            Math.cos(pitch) * Math.sin(yaw),
            Math.sin(roll) * Math.sin(pitch) * Math.sin(yaw) + Math.cos(roll) * Math.cos(yaw),
            Math.cos(roll) * Math.sin(pitch) * Math.sin(yaw) - Math.sin(roll) * Math.cos(yaw)];
      const row_2 = [
            -Math.sin(pitch),
            Math.sin(roll) * Math.cos(pitch),
            Math.cos(roll) * Math.cos(pitch)];
      const DCM = [row_0, row_1, row_2]; // Direction Cosine Matrix
      let rotatedPoint = [];
      for (var i = 0; i < DCM.length; i++) {
            let e = 0;
            for (var j = 0; j < DCM[i].length; j++) {
                e += point[j] * DCM[i][j];
            }
            rotatedPoint.push(e);
        }
      return addMetersToLngLat(b.position,rotatedPoint)
      }
    return vertices.map(v=>getVertexCoordinate(v,box));
}


_getEdgesBBoxLayers(opts){
    const {log,viewMode,boundingBoxes,updateBoundingBox,box}=opts;
    const timestamp=log.getCurrentTime();
    const vertices=this._getBBVertices(box);
    const edges=[
     {start:vertices[0],end:vertices[1]},
     {start:vertices[1],end:vertices[2]},
     {start:vertices[2],end:vertices[3]},
     {start:vertices[3],end:vertices[0]},
     {start:vertices[4],end:vertices[5]},
     {start:vertices[5],end:vertices[6]},
     {start:vertices[6],end:vertices[7]},
     {start:vertices[7],end:vertices[4]},
     {start:vertices[0],end:vertices[4]},
     {start:vertices[1],end:vertices[5]},
     {start:vertices[2],end:vertices[6]},
     {start:vertices[3],end:vertices[7]},
    ];
    const axes=[{start:vertices[8],end:vertices[9], color:[250,0,0]},
                {start:vertices[8],end:vertices[10], color:[65,230,50]},
                {start:vertices[8],end:vertices[11], color:[10,20,235]}]
    //console.log(vertices);
    const width=1;
    const layers=[];
    
    const edgeLayer=new LineLayer({
      id: box.id+'-edge-layer',
      data:edges,
      pickable: false,
      getWidth: width,
      getSourcePosition: e => e.start,
      getTargetPosition: e => e.end,
      getColor: e => [0,0,0]
    });
    layers.push(edgeLayer);
   
   
    const pointLayer=new ScatterplotLayer({
      id: box.id+'tracked-point-layer',
      data:[{coordinates:vertices[12],radius:0.3}],
      pickable: true,
      opacity: 1,
      stroked: false,
      filled: true,
      //radiusScale: 1,
      //radiusMinPixels: 1,
      //radiusMaxPixels: 10,
      //lineWidthMinPixels: 1,
      getPosition: d => d.coordinates,
      getRadius: d => d.radius,
      getFillColor: d => [255, 140, 0],
      getLineColor: d => [0, 0, 0]
    });
    layers.push(pointLayer);
  if(box.showAxis){
    const axesLayer=new LineLayer({
      id: box.id+'-axes-layer',
      data:axes,
      pickable: true,
      getWidth: 2,
      getSourcePosition: a => a.start,
      getTargetPosition: a => a.end,
      getColor: a => a.color,
      onDragStart: () => {
        if(viewMode===VIEW_MODE.TOP_DOWN){
          this._setController({dragPan:false});
        }
        return true;
      },
      onDrag: (info, event) => {
        //this.rotateCube({info, event,timestamp,viewMode,boundingBoxes,updateBoundingBox,box})
      },
      onDragEnd: (info,event) => {
        //this.rotateCube({info, event,timestamp,viewMode,boundingBoxes,updateBoundingBox,box});
        if(this.state.views===VIEW_MODE.TOP_DOWN){
                  this._setController({dragPan:true});
          }
        return true;
      },
    });
    layers.push(axesLayer);
  }
    return layers;
  }
  movecube = (info, event,timestamp,viewMode,boundingBoxes,updateBoundingBox) =>
  {
    if(viewMode===VIEW_MODE.TOP_DOWN){
      const boxes={};
      boxes[timestamp]=[...boundingBoxes[timestamp]];
      const box=boxes[timestamp].find(b=>b.id==info.object.id);
      box.position=[info.coordinate[0],info.coordinate[1],info.object.position[2]];
      updateBoundingBox(boxes)
    }
  }
  rotateCube=({info, event,timestamp,viewMode,boundingBoxes,updateBoundingBox,box})=>{
    if(viewMode===VIEW_MODE.TOP_DOWN){
      const boxes={};
      boxes[timestamp]=[...boundingBoxes[timestamp]];
      const n_box=boxes[timestamp].find(b=>b.id==box.id);
      const {x,y}= event.center;
      const {deltaX,deltaY}=event;
      const v1={x,y};
      const v2={x:v1.x-deltaX,y:v1.y-deltaY};
      const getAngleBetweenVector=(v1,v2)=>{
      const len_v1=Math.sqrt(Math.pow(v1.x,2)+Math.pow(v1.y,2));
      const len_v2=Math.sqrt(Math.pow(v2.x,2)+Math.pow(v2.y,2));
      const angle=Math.acos((v1.x*v2.x+v2.y*v2.y)/(len_v1*len_v2))*180/Math.PI/10;
        return angle;
      }
      const getRotatedDirection=(v1,v2)=>{
        const v_ox={x:1,y:0};
        return getAngleBetweenVector(v_ox,v1)-getAngleBetweenVector(v_ox,v2)>0?1:-1;
      }
      
      let angle=Number.parseFloat(box.orientation[2])+getRotatedDirection(v1,v2)*getAngleBetweenVector(v1,v2);
      if(Number.isNaN(angle))
        return;
      const sign=Math.sign(angle);
      const fract=Math.abs(angle)-Math.abs(Math.trunc(angle));
      console.log(Number.parseInt(Math.trunc(Math.abs(angle)))%360);
      angle= Number.parseInt(Math.trunc(Math.abs(angle)))%360;
      angle=sign*(angle+fract);
      console.log(event);
      console.log(angle);
      n_box.orientation[2]=angle;
      updateBoundingBox(boxes)
    }
  }
  _getBoundingBoxLayers(opts)
  {
    const {log,viewMode,boundingBoxes,updateBoundingBox}=opts;
    const timestamp=log.getCurrentTime();
    if(!timestamp)
      return [];
    else{
      const boxes=boundingBoxes[timestamp]?boundingBoxes[timestamp]:[];
      const changeColor=true;
       return boxes.map(box=>{
        return [new SimpleMeshLayer({
          id: `boundingBoxLayer`+timestamp+box.id,
          onDragStart: () => {
            alert("Box is selected");
            if(viewMode===VIEW_MODE.TOP_DOWN){
              this._setController({dragPan:false});
            }
            return true;
          },
          onDrag: (info, event) => {this.movecube(info, event,timestamp,viewMode,boundingBoxes,updateBoundingBox)},
          onDragEnd: (info,event) => {
            this.movecube(info, event,timestamp,viewMode,boundingBoxes,updateBoundingBox);
            if(viewMode===VIEW_MODE.TOP_DOWN){
              this._setController({dragPan:true});
            }
            return true;
          },
          data: [box], // Just need a single entry in data, as we're not using data attributes
          mesh: geometry,
          wireframe: false,
          transparent: true,
          _useMeshColors:true,
          // lightSettings: {
          //   ambientRatio: 0,  // Adjust ambient lighting
          //   diffuseRatio: 0.,  // Adjust diffuse lighting
          //   specularRatio: 0,  // Adjust specular lighting
          //   lightsPosition: [0, 0, 0],  // Adjust light position
          //   lightsStrength: [1.0, 0.0, 0.0, 0.0]  // Adjust light strength
          // },    
          getPosition: d =>{ return d.position} ,
          getColor:d=>{ return d.color},// [253, 128, 93],
          //getColor: changeColor ? [ 255, 0, 0] : [253, 128, 93],
          getScale:d=>d.scale,
          opacity:box.opacity,
          getOrientation:d=>{return [d.orientation[1],d.orientation[2],d.orientation[0]]},
          pickable: true,
          transitions: {
            // Need be getColor which matches the accessor name
              getColor: {
                duration: 1,
                // the color here need be the old color of getColor accessor
                enter: () => changeColor ? [253, 128, 93] : [255, 0, 0]
              }
            }, 
            zIndex: Z_INDEX.polygon
        })].concat(this._getEdgesBBoxLayers({...opts,box}));
       }).flat();
    }
  }

  _getblendedBoundingBoxLayers({frame})
  {
    let boxStream= frame.streams["/bounding_box"];
    boxStream=boxStream?boxStream:{boxes:[]};
    if(!Array.isArray(boxStream.boxes))
      return;
    const edgeData=boxStream.boxes.map(box=>{
    const vertices=this._getBBVertices(box);
    const edges=[
     {start:vertices[0],end:vertices[1]},
     {start:vertices[1],end:vertices[2]},
     {start:vertices[2],end:vertices[3]},
     {start:vertices[3],end:vertices[0]},
     {start:vertices[4],end:vertices[5]},
     {start:vertices[5],end:vertices[6]},
     {start:vertices[6],end:vertices[7]},
     {start:vertices[7],end:vertices[4]},
     {start:vertices[0],end:vertices[4]},
     {start:vertices[1],end:vertices[5]},
     {start:vertices[2],end:vertices[6]},
     {start:vertices[3],end:vertices[7]},
    ];
    return edges;
    }).flat();
    const pointsData=boxStream.boxes.map(box=>{
      const vertices=this._getBBVertices(box);
      return{coordinates:vertices[12],radius:0.3}
    });
    const changeColor=true;
    const width=1;
    return [new SimpleMeshLayer({
      id: `boundingBoxLayer`,
      data: boxStream.boxes, // Just need a single entry in data, as we're not using data attributes
      mesh: geometry,
      wireframe: false,
      transparent: true,
      _useMeshColors:true,
      // lightSettings: {
      //   ambientRatio: 0,  // Adjust ambient lighting
      //   diffuseRatio: 0.,  // Adjust diffuse lighting
      //   specularRatio: 0,  // Adjust specular lighting
      //   lightsPosition: [0, 0, 0],  // Adjust light position
      //   lightsStrength: [1.0, 0.0, 0.0, 0.0]  // Adjust light strength
      // },    
      getPosition: d =>{ return d.position} ,
      getColor:d=>{ return d.color},// [253, 128, 93],
      getScale:d=>d.scale,
      opacity:0.1,
      getOrientation:d=>[d.orientation[1],d.orientation[2],d.orientation[0]],
      pickable: true,
      transitions: {
            // Need be getColor which matches the accessor name
      getColor: {
                duration: 1,
                // the color here need be the old color of getColor accessor
                enter: () => changeColor ? [253, 128, 93] : [255, 0, 0]
              }
            }, 
      zIndex: Z_INDEX.polygon
    }),new LineLayer({
      id:'edge-layer',
      data:edgeData,//edges,
      pickable: false,
      getWidth: width,
      getSourcePosition: e => e.start,
      getTargetPosition: e => e.end,
      getColor: e => [0,0,0]
    }),
    new ScatterplotLayer({
      id:'tracked-point-layer',
      data:pointsData,//[{coordinates:vertices[12],radius:0.3}],
      pickable: true,
      opacity: 1,
      stroked: false,
      filled: true,
      //radiusScale: 1,
      //radiusMinPixels: 1,
      //radiusMaxPixels: 10,
      //lineWidthMinPixels: 1,
      getPosition: d => d.coordinates,
      getRadius: d => d.radius,
      getFillColor: d => [255, 140, 0],
      getLineColor: d => [0, 0, 0]
    })
  ];
  }

  _getConnectedCarsLayers({frame, car}){
    const vehicleNames=Object.keys(frame.streams)
            .filter(name=>name.startsWith("ws//"))
            .map(name=>name.split("/")[2])
            .reduce((names,name)=>{
                const  wsname="ws//"+name;
                if(!names.some(n=>n===wsname))
                {
                    names.push(wsname);
                }
                return names;
            },[]);
    const {
              origin = DEFAULT_ORIGIN,
              mesh,
              scale = [1, 1, 1],
              wireframe = false,
              texture = null,
              color = [0, 0, 0]
            } = car;
    return vehicleNames.filter(vehicleName=>{
      return frame.streams[vehicleName+"/vehicle_pose"].variable[0].values[0];
      }).map((vehicleName,index)=>{
      console.log(frame);
      const pose=frame.streams[vehicleName+"/vehicle_pose"].variable[0].values[0];
      const egoPose=frame.vehiclePose;
      const position=[pose.longitude,pose.latitude,pose.altitude];
      //const position=frame.streams[vehicleName+"/lidar/lidar-pose"].features[0].center;
      const angle=[pose.pitch* (180/Math.PI), pose.yaw* (180/Math.PI), pose.roll* (180/Math.PI)];
      return new SimpleMeshLayer({
        id: vehicleName,
        opacity: 1,
        coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
        //coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
        //coordinateOrigin: frame.origin || DEFAULT_ORIGIN,
        mesh,
        data: [{egoPose:egoPose, pose:pose,position: position,angle: angle, color: [100,100,100],scale:scale}],
        pickable: true,
        getPosition:d=>addMetersToLngLat(d.position,[0,0,0-2.2]),
        getColor: d=>d.color,
        getOrientation:d=>d.angle,
        getScale:d=>d.scale,
        //getTransformMatrix: d =>(new Pose({yaw:d.pose.yaw-d.egoPose.yaw,roll:d.pose.roll-d.egoPose.roll,pitch:d.pose.pitch-d.egoPose.pitch})).getTransformationMatrix().translate([d.position]).scale([100,100,100]),
        texture,
        wireframe,
        zIndex: Z_INDEX.car
      });
    })
  }

  _getCarLayer({frame, car}) {
    const {
      origin = DEFAULT_ORIGIN,
      mesh,
      scale = [1, 1, 1],
      wireframe = false,
      texture = null,
      color = [0, 0, 0]
    } = car;

    return new SimpleMeshLayer({
      id: 'car',
      opacity: 1,
      coordinateSystem: COORDINATE_SYSTEM.METER_OFFSETS,
      coordinateOrigin: frame.origin || DEFAULT_ORIGIN,
      // Adjust for car center position relative to GPS/IMU
      getTransformMatrix: d =>
        frame.vehicleRelativeTransform
          .clone()
          .translate(origin)
          .scale(scale),
      mesh,
      data: CAR_DATA,
      pickable: true,
      getPosition: d => d,
      getColor: color,
      texture,
      wireframe,
      updateTriggers: {
        getTransformMatrix: frame.vehicleRelativeTransform
      },
      zIndex: Z_INDEX.car
    });
  }

  _getLayers(opts) {
    const {
      frame,
      streamsMetadata,
      objectStates,
      customLayers,
      getTransformMatrix,
      styleParser,
      boundingBoxes
    } = opts;
    if (!frame) {
      return [];
    }

    const {streams, lookAheads = {}} = frame;

    const streamFilter = normalizeStreamFilter(opts.streamFilter);
    const featuresAndFutures = new Set(
      Object.keys(streams)
        .concat(Object.keys(lookAheads))
        .filter(streamFilter)
    );

    let layerList = [this._getCarLayer(opts)];
    layerList= layerList.concat(this._getblendedBoundingBoxLayers(opts));
    layerList= layerList.concat(this._getBoundingBoxLayers(opts));
    layerList=layerList.concat(this._getConnectedCarsLayers(opts));
    layerList = layerList.concat(
      Array.from(featuresAndFutures)
        .map(streamName => {
          // Check lookAheads first because it will contain the selected futures
          // while streams would contain the full futures array
          const stream = lookAheads[streamName] || streams[streamName];
          const coordinateProps = resolveCoordinateTransform(
            frame,
            streamName,
            streamsMetadata[streamName],
            getTransformMatrix
          );

          const stylesheet = styleParser.getStylesheet(streamName);

          // Support both features and lookAheads, respectively
          const primitives = stream.features || stream;
          if (primitives && primitives.length) {
            return new XVIZLayer({
              id: `xviz-${streamName}`,
              ...coordinateProps,

              pickable: true,

              data: primitives,
              style: stylesheet,
              objectStates,
              vehicleRelativeTransform: frame.vehicleRelativeTransform,

              // Hack: draw extruded polygons last to defeat depth test when rendering translucent objects
              // This is not used by deck.gl, only used in this function to sort the layers
              zIndex: Z_INDEX[primitives[0].type] || 0,

              // Selection props (app defined, not used by deck.gl)
              streamName
            });
          }
          return null;
        })
        .filter(Boolean)
    );

    layerList = layerList.concat(
      customLayers.map(layer => {
        // Clone layer props
        const {props} = layer;
        const additionalProps = {
          zIndex: 'zIndex' in props ? props.zIndex : Z_INDEX.customDefault
        };

        if (props.streamName) {
          // Use log data
          const stream = streams[props.streamName];
          Object.assign(
            additionalProps,
            resolveCoordinateTransform(
              frame,
              props.streamName,
              streamsMetadata[props.streamName],
              getTransformMatrix
            ),
            {
              data: stream && stream.features
            }
          );
        } else if (props.coordinate) {
          // Apply log-specific coordinate props
          Object.assign(
            additionalProps,
            resolveCoordinateTransform(frame, null, props, getTransformMatrix)
          );
        } else {
          return layer;
        }

        return layer.clone(additionalProps);
      })
    );

    // Sort layers by zIndex to avoid depth test issues
    return layerList.sort(
      (layer1, layer2) => (layer1.props.zIndex || 0) - (layer2.props.zIndex || 0)
    );
  }

  _layerFilter = ({layer, viewport, isPicking}) => {
    if (viewport.id === 'driver' && layer.id === 'car') {
      return false;
    }
    if (isPicking) {
      if (this.props.showTooltip) {
        return true;
      }
      if (layer.id.startsWith('xviz-')) {
        const sampleData = layer.props.data[0];
        return sampleData && sampleData.id;
      }
    }
    return true;
  };

  _getCursor = () => {
    return this.isHovering ? 'pointer' : 'crosshair';
  };

  _getViewState({viewMode, frame, viewState, viewOffset,trackedVehicle}) {
    /*const trackedPosition = frame
      ? {
          longitude: frame.trackPosition[0],
          latitude: frame.trackPosition[1],
          altitude: frame.trackPosition[2],
          bearing: 90 - frame.heading
        }
      : null;*/

      var trackedPosition;
      //console.log(viewOffset);
      if(!trackedVehicle||trackedVehicle=="Ego Vehicle"){
          trackedPosition = frame ? {
          longitude: frame.trackPosition[0],
          latitude: frame.trackPosition[1],
          altitude: frame.trackPosition[2],
          bearing: 90 - frame.heading
        } : null;
      }else{
        //try {
          const vehicle_pose=frame.streams[trackedVehicle+"/vehicle_pose"].variable[0].values[0];
          //console.log(frame.streams[trackedVehicle+"/vehicle_pose"].variable[0]);
          trackedPosition = (vehicle_pose&&frame) ? {
          longitude:vehicle_pose.longitude,
          latitude: vehicle_pose.latitude,
          altitude: vehicle_pose.altitude,
          bearing: 90 - vehicle_pose.yaw*180/Math.PI
        } : null;
        //} catch (error) {trackedPosition=null;}
      }
    return getViewStates({viewState, viewMode, trackedPosition, offset: viewOffset});
  }

  render() {
    const {
      mapboxApiAccessToken,
      frame,
      car,
      streamsMetadata,
      streamFilter,
      objectStates,
      renderObjectLabel,
      customLayers,
      getTransformMatrix,
      style,
      mapStyle,
      viewMode,
      viewState,
      viewOffset,
      showMap,
      trackedVehicle,
      boundingBoxes,
      updateBoundingBox,
      log
    } = this.props;
    const {styleParser, views} = this.state;
    const layers = this.getLayers({
      frame,
      car,
      streamsMetadata,
      streamFilter,
      objectStates,
      customLayers,
      getTransformMatrix,
      styleParser,
      boundingBoxes,
      updateBoundingBox,
      log,
      viewMode
    });
    const viewStates = this.getViewState({viewMode, frame, viewState, viewOffset,trackedVehicle});

    return (
      <DeckGL
        width="100%"
        height="100%"
        ref={this.deckRef}
        effects={[LIGHTS]}
        views={views}
        viewState={viewStates}
        layers={layers}
        layerFilter={this._layerFilter}
        getCursor={this._getCursor}
        onLoad={this._onDeckLoad}
        onHover={this._onLayerHover}
        onClick={this._onLayerClick}
        onViewStateChange={this._onViewStateChange}
        ContextProvider={MapContext.Provider}
        _onMetrics={this._onMetrics}
        controller={this.state.controller}
      >
        {showMap && (
          /*<StaticMap
            reuseMap={true}
            attributionControl={false}
            mapboxApiAccessToken={mapboxApiAccessToken}
            mapStyle={mapStyle}
            visible={frame && frame.origin && !viewMode.firstPerson}
            onLoad={this._onMapLoad}
          />*/
          
          <Map
      reuseMap={true}
            attributionControl={false}
            mapboxApiAccessToken={mapboxApiAccessToken}
            mapStyle={mapStyle}
            visible={frame && frame.origin && !viewMode.firstPerson}
            onLoad={this._onMapLoad}
          />
          /*
          <ReactMapGL
      reuseMap={true}
            attributionControl={false}
            mapboxApiAccessToken={mapboxApiAccessToken}
            mapStyle={mapStyle}
            visible={frame && frame.origin && !viewMode.firstPerson}
            onLoad={this._onMapLoad}
          />*/
          
        )}

        <ObjectLabelsOverlay
          objectSelection={objectStates.selected}
          frame={frame}
          streamsMetadata={streamsMetadata}
          renderObjectLabel={renderObjectLabel}
          xvizStyleParser={styleParser}
          style={style}
          getTransformMatrix={getTransformMatrix}
        />

        {this.props.children}
      </DeckGL>
    );
  }
}
