import React from 'react';
import {connectToLog} from 'streetscape.gl';
class VehicleTrack extends React.PureComponent{
    constructor(props) {
      super(props);
       //this.sltFrame = React.createRef();
       this.moveCamera=props.moveCamera;
    }
    _readyData() {
      const {timestamp,frame,log} = this.props;
      //console.log(frame);
        if(log)
        {
            const vehicleNames=Object.keys(log.streamBuffer.streams)
            .filter(name=>name.startsWith("ws//"))
            .map(name=>name.split("/")[2])
            .reduce((names,name)=>{
                const  wsname="ws//"+name;
                if(!names.some(n=>n===wsname))
                {
                    names.push(wsname);
                }
                return names;
            },["Ego Vehicle"]);
            return {isReady:true,hasData:true,data:vehicleNames};
        }
        return {isReady:false,hasData:true};
    }
    render=()=> {
      const {isReady,hasData,data}=this._readyData();
      const {timestamp,frame,log,viewOffset,viewState,trackedVehicle} = this.props;
      if(hasData==false)
            return ;
      else
            return <div className="Vehicle-Track">
            {data&&<p><small><b>Camera focus:</b></small></p>}
            {data&&
            <select onChange={(event )=>{
                this.moveCamera({x:0,y:0,bearing:0,trackedVehicle:event.target.value});
            }}>
                {data.map((name)=>{return <option key={name} value={name}>{name}</option>})}
            </select>
            }
          </div>
    }
}

const getLogState = (log) => ({
  timestamp: log.getCurrentTime(),
  frame:log.getCurrentFrame(),
  log:log
});
const VehicleTrackContainer = connectToLog({Component: VehicleTrack, getLogState});
export default VehicleTrackContainer;

