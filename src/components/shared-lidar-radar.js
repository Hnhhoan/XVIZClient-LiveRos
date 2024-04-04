import { CheckBox } from "@streetscape.gl/monochrome";
import React from "react";
import {connectToLog} from 'streetscape.gl';
class SharedLidarRadar extends React.PureComponent{
    constructor(props) {
        super(props);
        //// RDF stream processing with CQELS to get streams of avaible shared lidars
        this._dummyVehicleData=[{id:1,name:"car 1",position:{x:100,y:120},sharedLidar:false,tracking:false, streamAddress:"ws://car1"},
                {id:2,name:"car 2",position:{x:150,y:180},sharedLidar:true,tracking:false, streamAddress:"ws://car2"},
                {id:3,name:"car 3",position:{x:120,y:140},sharedLidar:true,tracking:true, streamAddress:"ws://car3"}];
        this.state={data:this._dummyVehicleData,show_panel:{ck_sharing_lidar:true,ck_tracked_lidar:true,ck_off_lidar:true}};
    }
    _removeTracking=(e)=>{
        //console.log(e.currentTarget.getAttribute("data-id"));
        this._dummyVehicleData= this._dummyVehicleData.map(c=>{
            const n={...c};
            if(c.id==e.currentTarget.getAttribute("data-id"))
            {
                
                n.tracking=false;
                return n
            }else{
            return n;}
        })
        this.setState({data:this._dummyVehicleData});
    }
    _tracking=(e)=>{
        //console.log(e.currentTarget.getAttribute("data-id"));
        this._dummyVehicleData= this._dummyVehicleData.map(c=>{
            const n={...c};
            if(c.id==e.currentTarget.getAttribute("data-id"))
            {
                n.tracking=true;
                return n
            }else{
            return n;}
        })
        this.setState({data:this._dummyVehicleData});
    }
    _checkShowCK=(e)=>{
        const id=e.currentTarget.id;
        const show_panel= this.state.show_panel;
        show_panel[id]=e.currentTarget.checked;
        this.setState({show_panel:show_panel})
    }
    _randomDummyMove()
    {   
        this._dummyVehicleData=this._dummyVehicleData.map(car=>{
            const acc={x:(Math.random()-0.5>=0)?Math.random():-Math.random(),y:(Math.random()-0.5>=0)?Math.random():-Math.random()};
            const c={...car};
            c.position.x+=2*acc.x;
            c.position.y+=2*acc.y;
            return c;
        })
    }
    _readyData(){
        const {timestamp,frame} = this.props;
        if(frame)
        {
            this._randomDummyMove();
            return {isReady:true,hasData:true,data:this._dummyVehicleData}
        }else{
            return {isReady:false,hasData:false}
        }
    }
    render(){
    const {isReady,hasData,data}=this._readyData();
    if(!hasData)
    return <div>Waitting for data</div>
    
    return  <div className="radar-container">
    <div className="control-group">
        <h2>Select Shared Lidar</h2>
        <div className="distance">
          <label>Max distance in meters:</label>
          <input
            className="value-input"
            type="number"
            defaultValue={150}
            min={50}
            max={200}
          />
          <div className="clear" />
        </div>
        <div className="distance">
          <label>Time duration in seconds:</label>
          <input
            className="value-input"
            type="number"
            defaultValue={100}
            min={30}
            max={300}
          />
          <div className="clear" />
        </div>
        <div className="distance">
          <div className="control-buttons">
            <input className="control-button" type="button" defaultValue="Apply" />
            <div className="clear" />
          </div>
        </div>
      </div>

 
 
            <div className="radar">
            <img
                className="compass"
                src="https://upload.wikimedia.org/wikipedia/commons/b/b6/Compass_360_%28en%29.svg"
                alt="circle"
            />
            <div className="pointer" />
            <div className="shadow" />
            <div className="axes">
                <span className="triangle">▲</span>
                <div className="axis axis-y " />
                <div className="axis axis-x " />
            </div>
            {data.map((car)=>{
                if (car.sharedLidar==false)
                    return this.state.show_panel.ck_off_lidar&&<div className="dot none-lidar" data-id={car.id} key={car.id} style={{top:car.position.x,left:car.position.y}} data-status={"no-shared-lidar"} data-tip={"id: "+car.id +",status: no shared lidar" } />
                else {
                    if(car.tracking){
                    return  this.state.show_panel.ck_tracked_lidar&&<div className="dot tracking" data-id={car.id} key={car.id} data-status={"tracking"} style={{top:car.position.x,left:car.position.y}} data-tip={"id: "+car.id +", status: tracking"} onClick={this._removeTracking}>
                    <div className="ringbase ring1" />
                    <div className="ringbase ring2" />
                </div>
                    }else{
                        return this.state.show_panel.ck_sharing_lidar&&<div className="dot shared-lidar" data-id={car.id} key={car.id} data-status={"shared-lidar"} style={{top:car.position.x,left:car.position.y}} data-tip={"id: "+car.id +", status: lidar sharing"} onClick={this._tracking} />
                    }
                }
            })}
            </div>
            {
            <div className="show_panel">
                <p><input type={"checkbox"} id={"ck_sharing_lidar"} data-type={"shared-lidar"} defaultChecked={this.state.show_panel.ck_sharing_lidar} onClick={this._checkShowCK}/> <label>{"Show vehicles sharing lidar signal"}</label></p>
                <p><input type={"checkbox"} id={"ck_tracked_lidar" } data-type={"tracking"} defaultChecked={this.state.show_panel.ck_tracked_lidar} onClick={this._checkShowCK}/> <label>{"Show tracked vehicles"}</label></p>
                <p><input type={"checkbox"} id={"ck_off_lidar"} data-type={"none-lidar"} defaultChecked={this.state.show_panel.ck_off_lidar} onClick={this._checkShowCK}/><label>{"Show lidar-off vehicles"}</label></p>
            </div>
             }
            <br></br>
        </div>
    }
}

const getLogState = (log, ownProps) => ({
    timestamp: log.getCurrentTime(),
    frame:log.getCurrentFrame()
  });
const SharedLidarRadarContainer  = connectToLog({Component: SharedLidarRadar, getLogState});
export default SharedLidarRadarContainer;