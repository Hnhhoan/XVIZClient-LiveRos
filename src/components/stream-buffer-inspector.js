import React from 'react';
import {connectToLog} from 'streetscape.gl';
import ReactJson from 'react-json-view';
import Modal from 'react-modal';
import {getXVIZConfig} from '@xviz/parser';
const TIMEFORMAT_SCALE = getXVIZConfig().TIMESTAMP_FORMAT === 'seconds' ? 1000 : 1;

const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      maxHeight:'90%',
      maxWidth:'90%',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'green_dark_grey',
      backgroundRepeat:'no-repeat'
    },
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.75)'
      }
};    
Modal.setAppElement('#app');

class StreamBufferInspector extends React.PureComponent{
    constructor(props) {
      super(props);
      this.state={
        modal:false,
        streamNames:null,
        numberOfFrames:0,
        timestamp:0,
        inspectedValue:{},
        loadedBuffer:0}
       this.sltFrame = React.createRef();
    }
    _listFrames=(N)=>{
        const l=[];
        for(var i=0;i<N;i++)
        {
            l.push(i);
        }
        return l;
    }
    openModal=()=>{
        console.log(Object.keys(this.props.log.streamBuffer.streams))
        this.setState({modal:true,
          streamNames:Object.keys(this.props.log.streamBuffer.streams).sort(),
          numberOfFrames:this.props.log.streamBuffer.timeslices.length,
          loadedBuffer:this.props.log.streamBuffer.timeslices[this.props.log.streamBuffer.timeslices.length-1].timestamp-this.props.log.streamBuffer.bufferStart
        });
        this.updateBufferStatus = setInterval(()=>{
          this.setState({modal:true,
            streamNames:Object.keys(this.props.log.streamBuffer.streams).sort(),
            numberOfFrames:this.props.log.streamBuffer.timeslices.length,
            loadedBuffer:this.props.log.streamBuffer.timeslices[this.props.log.streamBuffer.timeslices.length-1].timestamp-this.props.log.streamBuffer.bufferStart
          });
        }, 500);
    }
    
    afterOpenModal=()=>{
        // references are now sync'd and can be accessed.
        //subtitle.style.color = '#f00';
    }
    
    closeModal=()=>{
        this.setState({modal:false});
        clearInterval(this.updateBufferStatus);
    }

    _readyData() {
      const {timestamp,frame} = this.props;
        if(frame)
        {
        }
        return {isReady:false,hasData:true};
    }

    render() {
      const {isReady,hasData,data}=this._readyData();
      const {log}=this.props;
      if(hasData==false)
            return null;
      else
            return <div className="stream-buffer-inspector">
            <button style={{width:"100%",cursor:"pointer",backgroundColor:"#2596be"}} onClick={()=>{
                this.openModal();
                //this.setState({frames:this.inspectFrames(this.props.log),streams:this.inspectStreams(this.props.log)})
            }}>
                  <b><small>&#937; Inspect Streambuffer</small></b> 
            </button>
            <Modal isOpen={this.state.modal}
          onAfterOpen={this.afterOpenModal}
          style={customStyles}
          contentLabel="Inspector">
            <p>Time range from <small><b>{new Date(this.props.log.streamBuffer.bufferStart * TIMEFORMAT_SCALE).toUTCString()}</b></small> to <small><b>{new Date(this.props.log.streamBuffer.bufferEnd * TIMEFORMAT_SCALE).toUTCString()}</b></small></p>
            <p>Time duration: <small><b>{(this.props.log.streamBuffer.bufferEnd-this.props.log.streamBuffer.bufferStart)} seconds</b></small></p>
            <p>Loaded buffer: <small><b>{(100*this.state.loadedBuffer/(this.props.log.streamBuffer.bufferEnd-this.props.log.streamBuffer.bufferStart)).toFixed(2)}% </b></small>( <small><b> {this.state.numberOfFrames} frames </b></small>)
              <progress id="file" value={this.state.loadedBuffer} max={this.props.log.streamBuffer.bufferEnd-this.props.log.streamBuffer.bufferStart} style={{width:"100%"}}></progress></p>
            
            {this.state.streamNames&&<p><small><b>{this.state.streamNames.length} streams are avaiable!</b></small></p>}
            {this.state.streamNames&&
            <select onChange={(event )=>{
              if(this.state.timestamp>0)
              {
                this.setState({stream:event.target.value,inspectedValue:this.props.log.streamBuffer.streams[event.target.value].filter(f=>f.time==this.state.timestamp)});
              }else
              {
                this.setState({stream:event.target.value});
              }
                
            }}>
                {this.state.streamNames.map(name=>{return <option key={name} value={name}>{name}</option>})}
            </select>}
            
            {<select  onChange={(event )=>{
              if(this.state.stream)
                this.setState({timestamp:event.target.value,inspectedValue:this.props.log.streamBuffer.streams[this.state.stream].filter(f=>f.time==event.target.value)});
              else
                this.setState({timestamp:event.target.value});
                log.seek(event.target.value);
            }}>
                {
                log.streamBuffer.timeslices.map(f=>f.timestamp).map((f,i)=>{return <option key={f} value={f}>{i}</option>})
                }
            </select>}

            <button onClick={()=>{
              if(this.state.stream)
              this.setState({timestamp:log.getCurrentTime(),inspectedValue:this.props.log.streamBuffer.streams[this.state.stream].filter(f=>f.time==log.getCurrentTime())});
            else
              this.setState({timestamp:log.getCurrentTime()});
            }}>
                   Inspect Current Frame
            </button>

            <button onClick={()=>{
              console.log(this.props.log.streamBuffer);
              const timestamps=this.props.log.streamBuffer.timeslices.map(f=>f.timestamp);
              timestamps.forEach(timestamp => {
                const boundingBoxStream={
                  timestamp: timestamp,
                  streams: {//override /bounding_box
                    '/bounding_box':   
                           {boxes:[{scale:[2,2,2], id:"vehicle", type:"UNKNOW", position:this.props.log.getCurrentFrame().origin,orientation:[0,0,0]}]}
                }}
                this.props.log.streamBuffer.insert(boundingBoxStream);
              });
              console.log(this.props.log.streamBuffer.streams[this.state.stream]);
            }}>
                   Inspect streambuffer
            </button>
            <button onClick={()=>{
                this.closeModal();
            }}>
                    Close
            </button>
            {
            (this.state.stream&&this.state.timestamp>=0)&&<ReactJson src={this.state.inspectedValue}/>
            }
            
          </Modal>
            
            {
            //this.props.log.streamBuffer.bufferEnd
            //this.props.log.streamBuffer.bufferStart
            //this.props.log.streamBuffer.streams
            //this.props.log.streamBuffer.timeslices
            }
          </div>
    }
}

const getLogState = (log, ownProps) => ({
  timestamp: log.getCurrentTime(),
  frame:log.getCurrentFrame()
});
const StreamBufferInspectorContainer = connectToLog({Component: StreamBufferInspector, getLogState});
export default StreamBufferInspectorContainer;

