import React from 'react';
import {connectToLog} from 'streetscape.gl';
import ReactJson from 'react-json-view';
import {getXVIZConfig} from '@xviz/parser';
import { addMetersToLngLat } from 'viewport-mercator-project';
const TIMEFORMAT_SCALE = getXVIZConfig().TIMESTAMP_FORMAT === 'seconds' ? 1000 : 1;
const ViewModes=["PERSPECTIVE","TOP_DOWN","DRIVER"];
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }
  
  function rgbToHex(color) {
    return "#" + componentToHex(color[0]) + componentToHex(color[1]) + componentToHex(color[2]);
  }
function generateB_Box({id,scale,color,type,selected,opacity,showAxis,visible,position,orientation,editmode})
{
    id=id?id:"V-"+Math.pow(10,16)*Math.random();
    type=type?type:"UNKNOW";
    scale=Array.isArray(scale)?scale:[1,1,1];
    orientation=Array.isArray(orientation)?orientation:[0,0,0];
    selected=selected?true:false;
    color=Array.isArray(color)?color:[253, 128, 93];
    opacity= typeof opacity === 'number' && isFinite(opacity)?opacity:0.1;
    visible= visible?true:false;
    showAxis=showAxis?true:false;
    editmode=editmode?true:false;
    return {id,scale,color,type,selected,opacity,showAxis,visible,position,orientation,editmode};
}

function edit_Box({id,type,color,opacity,showAxis,longitude,latitude,altitude,roll,pitch,yaw,long,width,height},box,boundingBoxes,timestamp,updateBoundingBox){
    const boxes={};
    boxes[timestamp]=boundingBoxes[timestamp]?boundingBoxes[timestamp]:[];
    const index = boxes[timestamp].findIndex(b=>{return b.id==box.id});  
    if (index > -1) { // only splice array when item is found
        const b= {...boxes[timestamp][index]}
        b.id=id?id:b.id;
        b.type=type?type:b.type;
        b.color=color?color:b.color;
        b.opacity=opacity?opacity:b.opacity;
        b.scale[0]=long?long:b.scale[0];
        b.scale[1]=width?width:b.scale[1];
        b.scale[2]=height?height:b.scale[2];
        b.position[0]=longitude?longitude:b.position[0];
        b.position[1]=latitude?latitude:b.position[1];
        b.position[2]=altitude?altitude:b.position[2];
        b.orientation[0]=roll?roll:b.orientation[0];
        b.orientation[1]=pitch?pitch:b.orientation[1];
        b.orientation[2]=yaw?yaw:b.orientation[2];
        b.showAxis=showAxis!=undefined?showAxis:b.showAxis;
        boxes[timestamp].splice(index, 1); // 2nd parameter means remove one item only
        boxes[timestamp].splice(index, 0, b);
        //boxes[timestamp].push(b);
        updateBoundingBox(boxes);
    }
}
function addBoxToStreamBuffer(box,timestamp,frame,log){
    const name="/bounding_box";
    let boxes=frame.streams[name].boxes;
    boxes=boxes?boxes:[];
    boxes.push(box);
    const boundingBoxStream={
        timestamp: timestamp,
        streams: {//override /bounding_box
          '/bounding_box':   
                 {boxes:boxes}
      }}
      log.streamBuffer.insert(boundingBoxStream);
}
class BoundingBox extends React.PureComponent{
    constructor(props) {
      super(props);
      this.onChange=this.props.onChange;
      this.settings=this.props.settings;
      this.updateBoundingBox=this.props.updateBoundingBox;
    }
    _readyData() {
      const {timestamp,frame,log,boundingBoxes} = this.props;
        if(frame)
        {
            const timestamps=log.streamBuffer.timeslices.map(f=>f.timestamp);
            const boxes=boundingBoxes[log.getCurrentTime()]?boundingBoxes[log.getCurrentTime()]:[];
            return {isReady:false,hasData:true,timestamps,boxes};
        }
        return {isReady:false,hasData:true};
    }

    render() {
      const {isReady,hasData,timestamps,boxes}=this._readyData();
      const {frame,timestamp,log,boundingBoxes}=this.props;
      if(hasData==false)
            return null;
      else
            return <div className="bounding-box">
            <div className='bounding-box-frame'>
            <label>Timestamp:</label>{timestamps&&<select onChange={(event )=>{
                log.seek(event.target.value);
            }}>
                {
                timestamps.map(f=>{return <option key={f} value={f}>{f}</option>})
                }
            </select>}
            <div>
            <button onClick={()=>{
               const box= generateB_Box({position: addMetersToLngLat(frame.origin,[10*Math.random(),10*Math.random(),0.5])});
               const boxes={};
               boxes[timestamp]=boundingBoxes[timestamp]?boundingBoxes[timestamp]:[]
               boxes[timestamp].push(box);
               this.updateBoundingBox(boxes);
               //addBoxToStreamBuffer(box,timestamp,frame,log);
               //log.seek(timestamp);
            }}>add a box</button><button onClick={()=>{
                
              timestamps.forEach(timestamp => {
                const boundingBoxStream={
                  timestamp: timestamp,
                  streams: {//override /bounding_box
                    '/bounding_box':   
                           {boxes:boundingBoxes[timestamp]}
                }}
                this.props.log.streamBuffer.insert(boundingBoxStream);
              });
              //console.log(this.props.log.streamBuffer.streams[this.state.stream]);
            }}>blend in buffer</button>
            </div>
            </div>
            {boxes&&<div className='list-of-box'>
                {boxes.map(box=>{
                    return <div key={box.id}>
                        <div className='item-box'>
                            <p>{box.id}-{box.type}</p>
                            <button>close</button>
                            <button onClick={()=>{
                                const boxes={};
                                boxes[timestamp]=boundingBoxes[timestamp]?boundingBoxes[timestamp]:[];
                                const index = boxes[timestamp].findIndex(b=>{return b.id==box.id});
                                if (index > -1) { // only splice array when item is found
                                    boxes[timestamp].splice(index, 1); // 2nd parameter means remove one item only
                                    this.updateBoundingBox(boxes);
                                }
                            }}>remove</button>
                        </div>
                        <label>ViewMode:</label> 
                        <select  onChange={(e)=>{this.onChange({viewMode:e.target.value})}}>
                            {
                                ViewModes.map(mode=>{
                                    return <option key={mode} value={mode}>{mode}</option>
                                })
                            }
                        </select>
                        <div className='editing-box'>
                        <fieldset>
                        <legend><b>Box</b></legend>
                        <div>
                        <label>id:</label>
                        <input type="text" value={box.id} onChange={(event)=>{
                            edit_Box({id:event.target.value},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/> 
                        </div>
                        <div>
                        <label>object type:</label>
                        <input type="text" value={box.type} onChange={(event)=>{
                            edit_Box({type:event.target.value},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/> 
                        </div>
                        <div>
                        <label>color:</label>
                        <input type="color"  value={rgbToHex(box.color)} onChange={(event)=>{
                            console.log(event.target.value);
                            const hex2rgb = (hex) => {
                                const r = parseInt(hex.slice(1, 3), 16);
                                const g = parseInt(hex.slice(3, 5), 16);
                                const b = parseInt(hex.slice(5, 7), 16);
                                
                                // return {r, g, b} 
                                return [ r, g, b ];
                            }
                            edit_Box({color:hex2rgb(event.target.value)},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/> 
                        </div>
                        <div>
                        <label>opacity:</label>
                        <input type="number" value={box.opacity} step={0.01} max={1} min={0} onChange={(event)=>{
                            edit_Box({opacity:event.target.value},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/> 
                        </div>
                        <div>
                        <label>axis:</label>
                        <input type="checkbox" value={box.showAxis} onChange={(event)=>{
                            edit_Box({showAxis:event.target.checked},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/> 
                        </div>
                        </fieldset>
                        <fieldset>
                        <legend><b>Position</b></legend>
                        <div>
                        <label>longitude:</label>
                        <input type="number" step={0.0000001} value={box.position[0]} onChange={(event)=>{
                            edit_Box({longitude:Number(event.target.value)},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/><small> (radian)</small> 
                        </div>
                        <div>
                        <label>latitude:</label>
                        <input type="number" step={0.0000001} value={box.position[1]} onChange={(event)=>{
                            edit_Box({latitude:Number(event.target.value)},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/><small> (radian)</small> 
                        </div>
                        <div>
                        <label>altitude:</label>
                        <input type="number" step={0.01} value={box.position[2]} onChange={(event)=>{
                            edit_Box({altitude:Number(event.target.value)},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/><small> (meter)</small> 
                        </div>
                        </fieldset>
                        <fieldset>
                        <legend><b>Orientation</b></legend>
                        <div>
                        <label>roll:</label>
                        <input type="number" value={box.orientation[0]} onChange={(event)=>{
                            edit_Box({roll:event.target.value},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/><small> (degree)</small>
                        </div>
                        <div>
                        <label>pitch:</label>
                        <input type="number" value={box.orientation[1]} onChange={(event)=>{
                            edit_Box({pitch:event.target.value},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/><small> (degree)</small>
                        </div>
                        <div>
                        <label>yaw:</label>
                        <input type="number" value={box.orientation[2]} onChange={(event)=>{
                            edit_Box({yaw:event.target.value},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/><small> (degree)</small>
                        </div>
                        </fieldset>
                        <fieldset>
                        <legend><b>Dimension</b></legend>
                        <div>
                        <label>long:</label>
                        <input type="number" value={box.scale[0]} min={0} step={0.01} onChange={(event)=>{
                            edit_Box({long:event.target.value},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/><small></small>
                        </div>
                        <div>
                        <label>width:</label>
                        <input type="number" value={box.scale[1]} min={0} step={0.01} onChange={(event)=>{
                            edit_Box({width:event.target.value},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/><small> </small> 
                        </div>
                        <div>
                        <label>height:</label>
                        <input type="number" value={box.scale[2]} min={0} step={0.01} onChange={(event)=>{
                            edit_Box({height:event.target.value},box,boundingBoxes,timestamp,this.updateBoundingBox)
                        }}/><small> </small> 
                        </div>
                        </fieldset>
                        <fieldset>
                        <legend><b>Next Frames</b></legend>
                        <div>
                        <label>timestamp</label>
                        <input type="number"/> 
                        </div>
                        <button>clone</button>
                        </fieldset>
                        </div>
                    </div>
                })}
                
            </div>}
            
          </div>
    }
}

const getLogState = (log, ownProps) => ({
  timestamp: log.getCurrentTime(),
  frame:log.getCurrentFrame()
});
const BoundingBoxContainer = connectToLog({Component: BoundingBox, getLogState});
export default BoundingBoxContainer;

