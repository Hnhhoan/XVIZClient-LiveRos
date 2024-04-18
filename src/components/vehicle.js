import {setXVIZConfig, getXVIZConfig} from '@xviz/parser';
import {
  //LogViewer,
  //PlaybackControl,
  StreamSettingsPanel,
  MeterWidget,
  TrafficLightWidget,
  TurnSignalWidget,
  XVIZPanel,
  VIEW_MODE,
  //LogViewerStats,
  //XVIZWorkerFarmStatus,
  //XVIZWorkersMonitor,
  //XVIZWorkersStatus
} from 'streetscape.gl';
//import {MetricCollector} from './metric-collector';
import MetricCollectorContainer from './metric-collector';
import {XVIZWorkerFarmStatus} from "../../modules/core/src/perf/xviz-worker-farm-status";
import {XVIZWorkersMonitor} from "../../modules/core/src/perf/xviz-workers-monitor";
import {XVIZWorkersStatus} from "../../modules/core/src/perf/xviz-workers-status";
import {LogViewerStats} from "../../modules/core/src/perf/log-viewer-stats";
import {LogViewerCPUGPUMemoryStats} from  "../../modules/core/src/perf/log-viewer-CPU-GPU-memory-stats";
import {LogViewerCPUGPUTimeStats} from  "../../modules/core/src/perf/log-viewer-CPU-GPU-time-stats";
import {LogViewerCPUGPUTPFStats} from "../../modules/core/src/perf/log-viewer-CPU-GPU-TPF-stats";
import {LogViewer} from "../../modules/core/src/index"
import {PlaybackControl} from "../../modules/core/src/index";
import {Form} from '@streetscape.gl/monochrome';
import {XVIZ_CONFIG, APP_SETTINGS, MAPBOX_TOKEN, MAP_STYLE, XVIZ_STYLE, CAR} from '../constants';
import {XVIZStreamLoader} from 'streetscape.gl';
import { CollapseButton } from './collapse-button';
import { CommandLine } from './command-line';
import ViewDirectionContainer from './view-direction';
import StreamSettingQueryContainer from './stream-setting-query';
import StreamQueryContainer from './stream-query';
import ObjectQueryContainer from './object-query';
import StreamBufferInspectorContainer from './stream-buffer-inspector';
import VehicleTrackContainer from './vehicle-track';
import React from 'react';
setXVIZConfig(XVIZ_CONFIG);
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { OBJLoader } from "@loaders.gl/obj"; 
import {load} from '@loaders.gl/core';
import {registerLoaders} from '@loaders.gl/core';
import {Geometry} from '@luma.gl/core'
import BoundingBoxContainer from './bounding-box';
//import PerformanceMetricsContainer from './performance-metrics';
import PerformanceMetrics from './performance-metrics';
import {STYLES} from '../constants';
//import {generateFVCubeMesh} from '../ext/face-vertex-cube-mesh'
//import { EditableGeoJsonLayer, DrawPolygonMode } from 'nebula.gl';

const CUSTOM_XVIZ_STYLE = {
  '/objects': [{name: 'highlighted', style: {fill_color: '#ff8000aa'}}]
};

const debug=(metric) =>{
//fps (Number)
//redraw (Number) - the number of times WebGLContext was rerendered
//frame-update (Number) - the number of XVIZ frames rendered to screen
//loader-update (Number) - the number of new XVIZ messages loaded
//loader-error (Number) - the number of XVIZ errors generated during loading
console.log(metric)
}

// Add the loaders that handle your mesh format here
registerLoaders([OBJLoader]);
//var mesh = require("../static/humanoid_quad.obj");

const onMapLoad=(map) => {
  // Insert the layer beneath any symbol layer.
  const layers = map.getStyle().layers;
  const labelLayerId = layers.find(
  (layer) => layer.type === 'symbol' && layer.layout['text-field']
  ).id;
   
  // The 'building' layer in the Mapbox Streets
  // vector tileset contains building height data
  // from OpenStreetMap.
  map.addLayer(
  {
  'id': 'add-3d-buildings',
  'source': 'composite',
  'source-layer': 'building',
  'filter': ['==', 'extrude', 'true'],
  'type': 'fill-extrusion',
  'minzoom': 15,
  'paint': {
  'fill-extrusion-color': '#aaa',
   
  // Use an 'interpolate' expression to
  // add a smooth transition effect to
  // the buildings as the user zooms in.
  'fill-extrusion-height': [
  'interpolate',
  ['linear'],
  ['zoom'],
  15,
  0,
  15.05,
  ['get', 'height']
  ],
  'fill-extrusion-base': [
  'interpolate',
  ['linear'],
  ['zoom'],
  15,
  0,
  15.05,
  ['get', 'min_height']
  ],
  'fill-extrusion-opacity': 0.6
  }
  },
  labelLayerId);};


const data_meshes = ({
  "meshes": 
    [
      {
        'vertices': [
          [0, 0, 0.1],
          [1, 0, 0],
          [1, 1, 0],
          [0, 1, 0],
          [0.25, 0.25, 1],
          [0.75, 0.25, 1],
          [0.75, 0.75, 1],
          [0.25, 0.75, 1],
          [0.5, 0.5, 2]
        ],
      'faces': [
        [0, 1, 2],
        [0, 2, 3],
        [0, 1, 4],
        [4, 1, 5],
        [1, 2, 5],
        [5, 2, 6],
        [2, 3, 6],
        [6, 3, 7],
        [3, 0, 7],
        [7, 0, 4]
      ]
    }]
});


const wireframe = false;
const opacity = 0.5;


const layers = data_meshes.meshes.map((meshData, i) => {
const vertices = new Float32Array(meshData.vertices.flat());
const indices = new Uint16Array(meshData.faces.flat());
  // Create a Geometry instance for this mesh
  const geometry = new Geometry({
    attributes: {
      positions: vertices,
    },
    indices,
  });
  const changeColor=true;
  return new SimpleMeshLayer({
    id: `mesh-layer-${i}`,
    data: [0], // Just need a single entry in data, as we're not using data attributes
    mesh: geometry,
    wireframe: wireframe,
    transparent: true,
    // lightSettings: {
    //   ambientRatio: 0,  // Adjust ambient lighting
    //   diffuseRatio: 0.,  // Adjust diffuse lighting
    //   specularRatio: 0,  // Adjust specular lighting
    //   lightsPosition: [0, 0, 0],  // Adjust light position
    //   lightsStrength: [1.0, 0.0, 0.0, 0.0]  // Adjust light strength
    // },    
    getPosition: d => d.position,
    //getColor: [255, 0, 0],
    getColor: changeColor ? [ 255, 0, 0] : [253, 128, 93],
    opacity: opacity,
    pickable: true,
    transitions: {
      // Need be getColor which matches the accessor name
        getColor: {
          duration: 1,
          // the color here need be the old color of getColor accessor
          enter: () => changeColor ? [253, 128, 93] : [255, 0, 0]
        }
      },
    streamName: '/tracklets/label',
    coordinate: 'VEHICLE_RELATIVE'
  });
})



  /**
   * Data format:
   * [
   *   {name: 'Colma (COLM)', address: '365 D Street, Colma CA 94014', exits: 4214, coordinates: [-122.466233, 37.684638]},
   *   ...
   * ]
   */
  /*
  import {ScatterplotLayer} from "@deck.gl/layers";
  var customLayers = [new ScatterplotLayer({
    id: 'custom-scatterplot',
    // Scatterplot layer render options
    getPosition: d => d.position,
    getRadius: 1,
    getColor: [255, 0, 0],

    // log-related options
    streamName: '/tracklets/label',
    coordinate: 'VEHICLE_RELATIVE'
  })
];
*/
const TIMEFORMAT_SCALE = getXVIZConfig().TIMESTAMP_FORMAT === 'seconds' ? 1000 : 1;
export class Vehicle extends React.PureComponent {
  constructor(props){
    super(props)
    this.vehicleLog = new XVIZStreamLoader({
      logGuid: 'mock',
      session_type:'live',
      bufferLength: 180,
      serverConfig: {
        defaultLogLength: 180,
        serverUrl: 'ws://localhost:8081'
      },
      worker: true,
      maxConcurrency: 4
    });
    //this.vehicleLog.on("finish",()=>{alert("finish to show chart")})
    this.state = {
      log: this.vehicleLog,
      settings: {
        viewMode: 'PERSPECTIVE',
        showTooltip: false,
        showMap: true,
        showDebug: true
      },
      objectStates: {},
      panelStatus:"close",
      viewState: null,
      viewOffset: null,
      trackedVehicle:"Ego Vehicle",
      geojson: {
        type: 'FeatureCollection',
        features: []
      },
      boundingBoxes: {},
      metrics:[],
      panels: [],
      logGetReady:false,
      // LogViewer perf stats
      statsSnapshot: {},
      // XVIZ Parser perf stats
      backlog: 'NA',
      dropped: 'NA',
      workers: {}
    };

    
    //this.hostServerNames=props.data.connectedHostes;
    //this.offServerNames=props.data.otherDatasets;
  }
  moveCamera=({x,y,bearing,trackedVehicle})=> {
    this.setState({
      viewOffset: {x: x, y: y, bearing: bearing},
      trackedVehicle:trackedVehicle
    });
  }

  componentDidCatch(error, errorInfo) {
    console.log(errorInfo);
  }


  renderObjectLabel=(props) => { /*console.log(props.object); console.log(this.state.log.getCurrentFrame()); console.log(this.props.data.connectedHostes);*/ return props.isSelected && <div>
    {props.object._streams.get('/tracklets/objects')&&props.object._streams.get('/tracklets/objects').base.classes[0]=="Car"&&<img src="https://st2.depositphotos.com/3665639/7449/v/450/depositphotos_74490439-stock-illustration-pictograph-of-car-icon.jpg" width={50} alt={props.object._streams.get('/tracklets/objects').base.classes[0]} />}
    {props.object._streams.get('/tracklets/objects')&&props.object._streams.get('/tracklets/objects').base.classes[0]=="Van"&&<img src="https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/128x128/plain/van.png" width={50} alt={props.object._streams.get('/tracklets/objects').base.classes[0]} />}
    {props.object._streams.get('/tracklets/objects')&&props.object._streams.get('/tracklets/objects').base.classes[0]=="Cyclist"&&<img src="https://e7.pngegg.com/pngimages/787/917/png-clipart-bicycle-cycling-jersey-cyclo-cross-sport-cyclist-icon-blue-text-thumbnail.png" width={50} alt={props.object._streams.get('/tracklets/objects').base.classes[0]} />}
    {props.object._streams.get('/tracklets/objects')&&props.object._streams.get('/tracklets/objects').base.classes[0]=="Pedestrian"&&<img src="https://static-00.iconduck.com/assets.00/pedestrian-icon-160x256-lqls46zs.png" width={25} alt={props.object._streams.get('/tracklets/objects').base.classes[0]} />}
    
    {this.props.data.connectedHostes.map(h=>{ return props.object._streams.get(h+'/tracklets/objects')&&props.object._streams.get(h+'/tracklets/objects').base.classes[0]=="Car"&&<img src="https://st2.depositphotos.com/3665639/7449/v/450/depositphotos_74490439-stock-illustration-pictograph-of-car-icon.jpg" width={50} alt={props.object._streams.get(h+'/tracklets/objects').base.classes[0]} />})
    }
    {this.props.data.connectedHostes.map(h=>{ return props.object._streams.get(h+'/tracklets/objects')&&props.object._streams.get(h+'/tracklets/objects').base.classes[0]=="Van"&&<img src="https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/128x128/plain/van.png" width={50} alt={props.object._streams.get(h+'/tracklets/objects').base.classes[0]} />})
    }
    {this.props.data.connectedHostes.map(h=>{ return props.object._streams.get(h+'/tracklets/objects')&&props.object._streams.get(h+'/tracklets/objects').base.classes[0]=="Cyclist"&&<img src="https://e7.pngegg.com/pngimages/787/917/png-clipart-bicycle-cycling-jersey-cyclo-cross-sport-cyclist-icon-blue-text-thumbnail.png" width={50} alt={props.object._streams.get(h+'/tracklets/objects').base.classes[0]} />})
    }
    {this.props.data.connectedHostes.map(h=>{ return props.object._streams.get(h+'/tracklets/objects')&&props.object._streams.get(h+'/tracklets/objects').base.classes[0]=="Pedestrian"&&<img src="https://static-00.iconduck.com/assets.00/pedestrian-icon-160x256-lqls46zs.png" width={25} alt={props.object._streams.get(h+'/tracklets/objects').base.classes[0]} />})
    }

    {this.props.data.otherDatasets.map((ds,index)=>{ return props.object._streams.get("ws://ds_"+index+'/tracklets/objects')&&props.object._streams.get("ws://ds_"+index+'/tracklets/objects').base.classes[0]=="Car"&&<img src="https://st2.depositphotos.com/3665639/7449/v/450/depositphotos_74490439-stock-illustration-pictograph-of-car-icon.jpg" width={50} alt={props.object._streams.get("ws://ds_"+index+'/tracklets/objects').base.classes[0]} />})
    }
    {this.props.data.otherDatasets.map((ds,index)=>{ return props.object._streams.get("ws://ds_"+index+'/tracklets/objects')&&props.object._streams.get("ws://ds_"+index+'/tracklets/objects').base.classes[0]=="Van"&&<img src="https://d1nhio0ox7pgb.cloudfront.net/_img/o_collection_png/green_dark_grey/128x128/plain/van.png" width={50} alt={props.object._streams.get("ws://ds_"+index+'/tracklets/objects').base.classes[0]} />})
    }
    {this.props.data.otherDatasets.map((ds,index)=>{ return props.object._streams.get("ws://ds_"+index+'/tracklets/objects')&&props.object._streams.get("ws://ds_"+index+'/tracklets/objects').base.classes[0]=="Cyclist"&&<img src="https://e7.pngegg.com/pngimages/787/917/png-clipart-bicycle-cycling-jersey-cyclo-cross-sport-cyclist-icon-blue-text-thumbnail.png" width={50} alt={props.object._streams.get("ws://ds_"+index+'/tracklets/objects').base.classes[0]} />})
    }
    {this.props.data.otherDatasets.map((ds,index)=>{ return props.object._streams.get("ws://ds_"+index+'/tracklets/objects')&&props.object._streams.get("ws://ds_"+index+'/tracklets/objects').base.classes[0]=="Pedestrian"&&<img src="https://static-00.iconduck.com/assets.00/pedestrian-icon-160x256-lqls46zs.png" width={25} alt={props.object._streams.get("ws://ds_"+index+'/tracklets/objects').base.classes[0]} />})
    }
    {this.props.data.otherDatasets.map((ds,index)=>{ return props.object._streams.get("ws://ds_"+index+'/lidar/lidar-pose')&&props.object._streams.get("ws://ds_"+index+'/lidar/lidar-pose').base.classes[0]=="SOURCE"&&<p><b>{"ws://ds_"+index}</b></p>})
    }
    </div>};

  // Call this method to turn highlight on/off
  highlightObject=(id, value = true)=>{
    const oldObjectStates = this.state.objectStates;
    this.setState({
      objectStates: {
        ...oldObjectStates,
        highlighted: {
          ...oldObjectStates.highlighted,
          [id]: value
        }
      }
    });
    //console.log(this.state.objectStates);
  }
  componentWillUnmount() {
    if (this.xvizWorkerMonitor) {
      this.xvizWorkerMonitor.stop();
    }
  }
  async componentDidMount() {
    //document.title = this.props.data.vehicleId+'-'+this.props.data.host+'-'+this.props.data.scene;
    //this.state.log.on('error', console.error).connect();
    const {log} = this.state;
    log.on('ready',()=>
    {
      //console.log("this.state.log.getStreamSettings()");
      //console.log(this.state.log.getStreamSettings());
      //alert("Log get ready!");
      const metadata = log.getMetadata();
        this.setState({
          panels: Object.keys((metadata && metadata.ui_config) || {}),
          logGetReady:true
        });
    }).on('error', console.error).connect();

    // Monitor the log
    this.xvizWorkerMonitor = new XVIZWorkersMonitor({
      numWorkers: log.options.maxConcurrency,
      reportCallback: ({backlog, dropped, workers}) => {
        this.setState({backlog, dropped, workers});
      }
    });
    log._debug = (event, payload) => {
      if (event === 'parse_message') {
        this.xvizWorkerMonitor.update(payload);
      }
    };
    this.xvizWorkerMonitor.start();
  }
  _renderPerf = () => {
    const {statsSnapshot, backlog, dropped, workers} = this.state;
    return this.state.settings.showDebug ? (
      <div style={STYLES.PERF}>
        <MetricCollectorContainer metrics={this.state.metrics} workers={workers}></MetricCollectorContainer>
        <hr />
        <XVIZWorkerFarmStatus backlog={backlog} dropped={dropped} />
        <XVIZWorkersStatus workers={workers} />
        <hr />
        <LogViewerStats statsSnapshot={statsSnapshot} />
        <hr />
        <LogViewerCPUGPUMemoryStats statsSnapshot={statsSnapshot} />
        <hr/>
        {/**<LogViewerCPUGPUTimeStats statsSnapshot={statsSnapshot} />
        <hr/>**/}
        <LogViewerCPUGPUTPFStats statsSnapshot={statsSnapshot} />
        
        {/**<PerformanceMetrics metrics={this.state.metrics}/>**/}
      </div>
    ) : null;
  };
  _updateBoundingBox=(changedboundingBoxes)=>{
    this.setState({
      boundingBoxes:{...this.state.boundingBoxes, ...changedboundingBoxes} 
    });
  }
  _onSettingsChange = changedSettings => {
    this.setState({
      settings: {...this.state.settings, ...changedSettings}
    });
  };
  _controlPanel=(status)=>{
    this.setState({
      panelStatus:status
    });
  }
  _isLogGetReady=()=>{
    return this.state.logGetReady;
  }
  //getServerNames=()=>{return {hostServerNames:this.hostServerNames,offServerNames:this.offServerNames.map((n,index)=>"ws://ds_"+index)}};
  getServerNames=()=>{
    return {hostServerNames:["ego-vehicle"],offServerNames:["ws://ds_0","ws://ds_1"]};
  };
  render() {
    const {log, settings,boundingBoxes} = this.state;
    //console.log(log);
    //console.log(settings);
    /*
    const editableLayer = new EditableGeoJsonLayer({
      id: 'geojson',
      data: this.state.geojson,
      mode: DrawPolygonMode,
      onEdit: ({ updatedData }) => {
        this.setState({ geojson: updatedData });
      }
    });*/

    return (
      <div id="container">
        <div id="control-panel" className={this.state.panelStatus=="open"?"scrollbar style-4 panel-open":"scrollbar style-4 panel-close"}>
          <CollapseButton status={this.state.panelStatus} controlPanel={this._controlPanel}/>
          {/**<CommandLine host={this.props.data.host+'/?setting=true'} onChange={this._onSettingsChange} settings={this.state.settings}/>
          <hr style={{margin:0}} />*/}
        {/**
          <StreamSettingQueryContainer log={log} getServerNames={this.getServerNames} highlightObject={this.highlightObject}/>
          
          <hr style={{margin:0}} />*/}
          <StreamQueryContainer log={log} getServerNames={this.getServerNames} />
          <hr style={{margin:0}} />
          <ObjectQueryContainer log={log} getServerNames={this.getServerNames} highlightObject={this.highlightObject}/>
          <hr style={{margin:0}} />
          <VehicleTrackContainer viewState={this.state.viewState} trackedVehicle={this.state.trackedVehicle}
              viewOffset={this.state.viewOffset} log={log} moveCamera={this.moveCamera} setTrackedVehicle={this.setTrackedVehicle}/>
          <hr style={{margin:0}} />
          {/**<StreamBufferInspectorContainer log={log} />
          <hr style={{margin:0}} />*/}
          <BoundingBoxContainer log={log} onChange={this._onSettingsChange} settings={this.state.settings} updateBoundingBox={this._updateBoundingBox} boundingBoxes={this.state.boundingBoxes}></BoundingBoxContainer>
          {/**<hr style={{margin:0}} />
          <ViewDirectionContainer log={log}/>
          <hr style={{margin:0}} />
          */}
          {/*<SharedLidarRadarContainer log={log}/>*/}
           
          <XVIZPanel log={log} name="Camera"/>
          <hr />
          <div className="control-group">
          <Form
            data={APP_SETTINGS}
            values={this.state.settings}
            onChange={this._onSettingsChange}
          />
          <StreamSettingsPanel log={log} onSettingsChange={settings=>{}} />
          <hr />
          <XVIZPanel log={log} name="Metrics" />
          </div>
          {this._renderPerf()}
        </div>
        <div id="log-panel">
          <div id="map-view">
            <LogViewer
              log={log}
              showMap={settings.showMap}
              mapboxApiAccessToken={MAPBOX_TOKEN}
              mapStyle={MAP_STYLE}
              car={CAR}
              xvizStyles={XVIZ_STYLE}
              showTooltip={settings.showTooltip}
              viewMode={VIEW_MODE[settings.viewMode]}
              //customLayers={layers}
              //customLayers={[editableLayer]}
              onMapLoad={onMapLoad}
              renderObjectLabel={this.renderObjectLabel}
              updateBoundingBox={this._updateBoundingBox}
              //onSelectObject ={(infor,event)=>{
              //  console.log(infor);
              //  console.log(event);
              //  return true;
              //}}
              //debug={debug}
              //debug={this._getMetrics}
              debug={payload => 
                {
                  if(this._isLogGetReady())
                    {this.setState({statsSnapshot: payload,metrics:[...this.state.metrics,payload]});}
                    console.log(this._isLogGetReady());
              }}
              //objectStates={this.state.objectStates}
              //onViewStateChange={objectStates => this.setState({objectStates})}
              boundingBoxes={boundingBoxes}
              viewState={this.state.viewState}
              viewOffset={this.state.viewOffset}
              trackedVehicle={this.state.trackedVehicle}
              onViewStateChange={({viewState, viewOffset}) => this.setState({viewState, viewOffset})}
            />
            <div id="hud">
              {/**<TurnSignalWidget log={log} streamName="/vehicle/turn_signal" />
              <hr />
              <TrafficLightWidget log={log} streamName="/vehicle/traffic_light" />
              <hr />
              <MeterWidget
                log={log}
                streamName="/vehicle/acceleration"
                label="Acceleration"
                min={-4}
                max={4}
              />
              <hr />**/}
              <MeterWidget
                log={log}
                streamName="/vehicle/velocity"
                label="Ego-Speed"
                getWarning={x => (x > 30 ? 'FAST' : '')}
                min={0}
                max={120}
              />
              {
                   log&&Object.keys(log.streamBuffer.streams)
                    .filter(name=>name.startsWith("ws//"))
                    .map(name=>name.split("/")[2])
                    .reduce((names,name)=>{
                        const  wsname="ws//"+name;
                        if(!names.some(n=>n===wsname))
                        {
                            names.push(wsname);
                        }
                        return names;
                    },[]).map(ws=>{
                      return <MeterWidget
                      log={log}
                      streamName={ws+"/vehicle/velocity"}
                      label={ws+"-Speed"}
                      getWarning={x => (x > 30 ? 'FAST' : '')}
                      min={0}
                      max={120}
                    />
                    })
              }
            </div>
          </div>
          <div id="timeline">
            <PlaybackControl
              width="100%"
              log={log}
              formatTimestamp={x => new Date(x * TIMEFORMAT_SCALE).toUTCString()}
            />
          </div>
          
        </div>
      </div>
    );
  }
}