import React from "react";
import { Vehicle } from "./vehicle";
import Modal from 'react-modal';
import Multiselect from 'multiselect-react-dropdown';
import CodeMirror from 'react-codemirror';
import 'codemirror/addon/search/match-highlighter';
import 'codemirror/addon/selection/active-line';
import 'codemirror/mode/sparql/sparql';
import 'codemirror/addon/scroll/simplescrollbars';
const URI='http://self-driving-vehicle.stream#';
const hosts=["ws://192.168.0.109:8079","ws://localhost:8079","ws://localhost:8081","ws://localhost:8082"];
const scenes=[
    {id:"2011_09_26_drive_0005",description:"Size on disk:0.6 GB, Length: 160 frames, Image resolution: 1392 x 512 pixels, Labels: 9 Cars, 3 Vans, 0 Trucks, 2 Pedestrians, 0 Sitters, 1 Cyclists, 0 Trams, 0 Misc"},
    {id:"2011_09_26_drive_0009",description:"Size on disk:1.6 GB, Length: 453 frames, Image resolution: 1392 x 512 pixels, Labels: 89 Cars, 3 Vans, 2 Trucks, 3 Pedestrians, 0 Sitters, 0 Cyclists, 0 Trams, 1 Misc"},
    {id:"2011_09_26_drive_0011",description:"Size on disk:0.9 GB, Length: 230 frames, Image resolution: 1392 x 512 pixels, Labels: 15 Cars, 1 Vans, 1 Trucks, 1 Pedestrians, 0 Sitters, 1 Cyclists, 0 Trams, 1 Misc"},
    {id:"2011_09_26_drive_0017",description:"Size on disk:0.5 GB, Length: 113 frames, Image resolution: 1392 x 512 pixels, Labels: 4 Cars, 0 Vans, 0 Trucks, 0 Pedestrians, 0 Sitters, 0 Cyclists, 0 Trams, 0 Misc"}
];
const frameRates=[{rate:0.081,description:"~13 frames/second"},{rate:0.04,description:"~24 frames/second"}];




const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      backgroundImage: 'url("https://macropolo.org/wp-content/uploads/2021/06/standard_hero-1200x600.jpg")',
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

export class VehicleSetting extends React.PureComponent{
constructor(props)
{
    super(props)
    this.state={
        modal:true,
        enableLidar:true,
        enableOtherDataSet:true,
        vehicleId:"BMW001",
        sHost:0,
        //slHost:0,
        sScene:0,
        sRate:0,
        connectedHostes:[],
        otherDatasets:[],
        data:{vehicleId:null,host:null,lidarHost:null,scene:null,frameRate:null},
        query:`PREFIX sdv:  <${URI}>
        SELECT *
        WHERE {
          ?stream sdv:name ?name.
          #FILTER(?name='poseTrajectory').
        }`
    }
}
openModal=()=>{
    this.setState({modal:true});
}

afterOpenModal=()=>{
    // references are now sync'd and can be accessed.
    //subtitle.style.color = '#f00';
}

closeModal=()=>{
    this.setState({modal:false});
}
render(){
    var options = {
        lineNumbers: true,
        theme:'default',
        mode:'application/sparql-query',
        lineWrapping: true,
        styleActiveLine: true,
        styleActiveSelected: true,
        scrollbarStyle:'simple',
        highlightSelectionMatches: {
            minChars: 1,
            style:'matchhighlight'
          }
        };
    return<div>
    {/*onRequestClose={this.closeModal}*/}
    <Modal isOpen={this.state.modal}
          onAfterOpen={this.afterOpenModal}
          style={customStyles}
          contentLabel="Select Vehicle">
            <div className="vehicle-setting scrollbar style-4">
            <label htmlFor="vid">Vehicle Id :</label>
            <input type="text" id="vid" name="vehicleId" placeholder="Vehicle Id" value={this.state.vehicleId} onChange={event=>{
                this.setState({vehicleId:event.target.value});
            }}/>
            <label htmlFor="host">Host :</label>
            <select id="host" name="host" onChange={(event )=>{
                this.setState({sHost:event.target.selectedIndex});
            }}>
                {hosts.map(h=>{
                   return <option key={h} value={h}>{h}</option>
                })}
            </select>

            <label htmlFor="scene">Scene :</label>
            <select id="scene" name="scene" onChange={(event )=>{
                this.setState({sScene:event.target.selectedIndex});
            }}>
                {scenes.map(s=>{
                    return <option key={s.id} value={s.id}>{s.id}</option>
                })}
            </select>
            <p className="scene-description">
                {scenes[this.state.sScene].description}
            </p>

            <label htmlFor="lidar-host"><input type={"checkbox"} defaultChecked={this.state.enableLidar} onChange={(event)=>{
                this.setState({enableLidar:event.target.checked});
            }}/>Connect to the Hosts :</label>
            {/*
            <select id="lidar-host" name="lidar-host" disabled={!this.state.enableLidar} onChange={(event )=>{
                this.setState({slHost:event.target.selectedIndex});
            }}>
                {this.state.enableLidar&&hosts.map(h=>{
                   return <option key={h} value={h}>{h}</option>
                })}
            </select>
            */}
            {this.state.enableLidar &&<Multiselect
            displayValue="key"
            placeholder="Select other vehicles to get data"
            onKeyPressFn={()=>{}}
            onRemove={(selectedList, selectedItem)=>{
                const connectedHostes=[...selectedList];
                this.setState({connectedHostes:connectedHostes})
            }}
            onSearch={()=>{}}
            onSelect={(selectedList, selectedItem)=>{
                const connectedHostes=[...selectedList];
                this.setState({connectedHostes:connectedHostes});
            }}
            options={hosts.map(host=>{return {key:host}})}
            style={{
                chips: {
                  background: 'red'
                },
                searchBox: {
                  border: 'none',
                  'border-bottom': 'none',
                  'border-radius': '0px'
                }
              }}
            showCheckbox/>}

            {this.state.enableLidar&&
            <CodeMirror value={this.state.query}  options={options} onChange={(code, data, value) => {
            this.setState({
              query: code
            })
          }}/>}


<label htmlFor="other-dataset"><input type={"checkbox"} defaultChecked={this.state.enableOtherDataSet} onChange={(event)=>{
                this.setState({enableOtherDataSet:event.target.checked});
            }}/>Select other DataSets :</label>
            {/*
            <select id="lidar-host" name="lidar-host" disabled={!this.state.enableLidar} onChange={(event )=>{
                this.setState({slHost:event.target.selectedIndex});
            }}>
                {this.state.enableLidar&&hosts.map(h=>{
                   return <option key={h} value={h}>{h}</option>
                })}
            </select>
            */}
            {this.state.enableOtherDataSet &&<Multiselect
            displayValue="key"
            placeholder="Select other datasets"
            onKeyPressFn={()=>{}}
            onRemove={(selectedList, selectedItem)=>{
                const otherDatasets=[...selectedList];
                this.setState({otherDatasets:otherDatasets})
            }}
            onSearch={()=>{}}
            onSelect={(selectedList, selectedItem)=>{
                const otherDatasets=[...selectedList];
                this.setState({otherDatasets:otherDatasets});
            }}
            options={scenes.map(scenes=>{return {key:scenes.id}})}
            style={{
                chips: {
                  background: 'red'
                },
                searchBox: {
                  border: 'none',
                  'border-bottom': '1px solid none',
                  'border-radius': '0px'
                }
              }}
            showCheckbox/>}


            <label htmlFor="rate">Frame Rate :</label>
            <select id="rate" name="rate" onChange={(event )=>{
                this.setState({sRate:event.target.selectedIndex});
            }}>
                {frameRates.map(r=>{
                    return <option value={r.rate}>{r.rate} {r.description}</option>
                })}
            </select>
            
            <input type="submit" defaultValue="Submit" onClick={()=>{
                this.setState({data:{
                    vehicleId:this.state.vehicleId,
                    host:hosts[this.state.sHost],
                    connectedHostes:this.state.connectedHostes.map(host=>host.key),
                    otherDatasets:this.state.otherDatasets.map((ds)=>{
                        return ds.key
                    }),
                    //lidarHost:hosts[this.state.slHost],
                    scene:scenes[this.state.sScene].id,
                    frameRate:frameRates[this.state.sRate].rate,
                    query:this.state.query
                }});
                this.closeModal();
            }} />
            </div>
    </Modal>
    {!this.state.modal&&<Vehicle data={this.state.data}></Vehicle>}
    </div>
}
}