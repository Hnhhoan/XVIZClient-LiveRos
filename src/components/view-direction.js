import React from 'react';
import {connectToLog} from 'streetscape.gl';
class ViewDirection extends React.PureComponent{
    constructor(props) {
      super(props);
      this.myViewSelect=React.createRef();
      this.myCanvas=React.createRef();
      this.state = {selectedView: null};
    }
    _onChangeView=()=>{
      console.log("this.myViewSelect.current.value");
      console.log(this.myViewSelect.current.value);
      this.setState({selectedView: this.myViewSelect.current.value});
    }    
    _readyData() {
      const {timestamp,frame} = this.props;
        if(frame)
        {
          const streamNames=Object.keys(frame.streams)
          const pointStreamNames=streamNames.filter(name=>{
          const regex = /\/carview\/[a-zA-Z0-9-_]+\/points/g;
            return name.match(regex);
          })
          const viewStreamNames=pointStreamNames.map(name=>{
            return name.split('/')[2];
          })
          if(pointStreamNames.length)
          {
            var selectedView
            if(this.state.selectedView==null)
              {
                selectedView=viewStreamNames[0];
              }else{
                selectedView=this.state.selectedView;
              }
            
            const xyz=frame.streams["/carview/"+selectedView+"/points"].pointCloud.positions;
            var positions=[];
            xyz.forEach((element,index,array)=>{
              if(index%3==0){
                positions.push([]);
              }
              positions[positions.length-1].push(element);
            });
            const viewVolume=frame.streams["/carview/"+selectedView+"/view_volume"].variable[0].values;
            _drawImage(this.myCanvas.current,viewVolume,positions);
            return {isReady:true,hasData:true,data:{viewStreamNames,pointStreamNames,viewVolume,positions}}
          }
          return {isReady:true,hasData:false};
        }
        return {isReady:false,hasData:false};
    }

    render() {
      const {isReady,hasData,data}=this._readyData();
      if(hasData==false)
            return null;
      else
            return <div className="control-group">
            <h2>Car View</h2>
            {/*
            <div className="distance">
              <label>View name</label>
              <input
                className="value-input view-name"
                type="text"
                placeholder={"view direction name"}
              />
              <div className="clear" />
            </div>

            <div className="distance">
              <label>Up vector</label>
              <input
                className="value-input vector-element"
                type="number"
                placeholder={"z"}
              />
              <input
                className="value-input vector-element"
                type="number"
                placeholder={"y"}
              />
              <input
                className="value-input vector-element"
                type="number"
                placeholder={"x"}
              />
              <div className="clear" />
            </div>

            <div className="distance">
              <label>Front vector</label>
              <input
                className="value-input vector-element"
                type="number"
                placeholder={"z"}
              />
              <input
                className="value-input vector-element"
                type="number"
                placeholder={"y"}
              />
              <input
                className="value-input vector-element"
                type="number"
                placeholder={"x"}
              />
              <div className="clear" />
            </div>

            <div className="distance">
              <label>Min distance in meters:</label>
              <input
                className="value-input"
                type="number"
                defaultValue={30}
                min={10}
                max={100}
              />
              <div className="clear" />
            </div>
            <div className="distance">
              <label>Max distance in meters:</label>
              <input
                className="value-input"
                type="number"
                defaultValue={150}
                min={100}
                max={200}
              />
              <div className="clear" />
            </div>

            <div className="distance">
              <label>View width in meters:</label>
              <input
                className="value-input"
                type="number"
                defaultValue={30}
                min={10}
                max={50}
              />
              <div className="clear" />
            </div>

            <div className="distance">
              <label>View height in meters:</label>
              <input
                className="value-input"
                type="number"
                defaultValue={3}
                min={1}
                max={10}
              />
              <div className="clear" />
            </div>
            <div className="distance">
              <div className="control-buttons">
                <input className="control-button" type="button" defaultValue="Add view" />
                <div className="clear" />
              </div>
            </div>
            */}
            <div className="shared-carview">
              <label>View directions:</label>
              <div className="blank" />
              <div className="select">
                <select ref={this.myViewSelect} onChange={this._onChangeView}>
                  {
                    data.pointStreamNames.map((streamName,index)=>{
                      return <option key={streamName} value={data.viewStreamNames[index]}>{data.viewStreamNames[index]}</option>
                    })
                  }
                </select>
                <div className="select__arrow" />
              </div>
            </div>
            <div className='view-frame'>
                <canvas ref={this.myCanvas} style={{ position: 'relative', left:-25 }}></canvas>
                {/*<p className='eclipse-percentage'>View eclipse in approximation: <span className='eclipse-value'>~30</span> %</p>*/}
                <p className='eclipse-percentage'>Lidar point density : <span className='eclipse-value'>~{Math.round(data.positions.length/(data.viewVolume.w*data.viewVolume.h))}</span> points/m^2</p>
            </div>
            {/* 
            <div className="control-buttons">
              <input className="control-button" type="button" defaultValue="Remove view" />
              <div className="clear" />
            </div>
            */}
          </div>
    }
}

function _multiplyMatrixVector(matrix,vector){
  var result=[];
  return matrix.reduce((result,row)=>{
      result.push(row.reduce((r,e,c_index)=>{
          r+=e*vector[c_index];
          return r;
      },0));
      return result;
  },result);
}
function _drawPoint(context, x, y, color, size) {
  //console.log({x,y});
  if (color == null) {
    color = 'white';
  }
  if (size == null) {
      size = 5;
  }

  var radius = 0.5 * size;

  // to increase smoothing for numbers with decimal part
var pointX = Math.round(x - radius);
  var pointY = Math.round(y - radius);

  context.beginPath();
  context.fillStyle = color;
  context.fillRect(pointX, pointY, size, size);
  context.fill();
}
function _drawImage(canvas,viewVolume,positions){
  if(canvas==null)
  return;
  const scale=1.0*viewVolume.h/viewVolume.w;

  //const width=scaleRate*parseInt(viewVolume.w);
  const width=300;
  //const height=scaleRate*parseInt(viewVolume.h);
  const height=width*scale;
  canvas.width=width;
  canvas.height=height;
  const plane_vertices=viewVolume.f_vertices.map(v=>{
    return _multiplyMatrixVector(viewVolume.R,v);
  })
  const center_point=[
    (plane_vertices[0][0]+plane_vertices[2][0])/2,//ignore x
    (plane_vertices[0][1]+plane_vertices[2][1])/2,// =width/2
    (plane_vertices[0][2]+plane_vertices[2][2])/2]// =height/2
  const origin=[Math.round(width/2),Math.round(height/2)];
  const center_height=[
    (plane_vertices[0][0]+plane_vertices[1][0])/2,
    (plane_vertices[0][1]+plane_vertices[1][1])/2,
    (plane_vertices[0][2]+plane_vertices[1][2])/2]
  const center_width=[
    (plane_vertices[0][0]+plane_vertices[3][0])/2,
    (plane_vertices[0][1]+plane_vertices[3][1])/2,
    (plane_vertices[0][2]+plane_vertices[3][2])/2];
  const plane_positions=positions.map(p=>{
    return _multiplyMatrixVector(viewVolume.R,p);
  })
  const ctx=canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, width, height);
  ctx.fill();
  plane_positions.forEach(p=>{
    const width_offset= (p[1]-center_point[1])/Math.abs(center_point[1]-center_width[1])
    const height_offset= (p[2]-center_point[2])/Math.abs(center_point[2]-center_height[2])
    const x=width-Math.round(origin[0]+width_offset*width/2);
    const y=height -Math.round(origin[1]+height_offset*height/2);
    const size=1;
    _drawPoint(ctx,x,y,'white',size)
  })

  ctx.fill();
}

const getLogState = (log, ownProps) => ({
  timestamp: log.getCurrentTime(),
  frame:log.getCurrentFrame()
});
const ViewDirectionContainer = connectToLog({Component: ViewDirection, getLogState});
export default ViewDirectionContainer;