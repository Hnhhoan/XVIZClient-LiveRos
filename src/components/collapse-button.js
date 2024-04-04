import React from 'react';
//import {GeoJsonLayer} from '@deck.gl/layers';
//import {LogViewer} from 'streetscape.gl';
export class CollapseButton extends React.PureComponent{
  
  constructor(props) {
    super(props);    
    this.state = {status:props.status};
    this.bttLabel="&laquo; &laquo; &laquo;";
    this.tooltip="minimize the panel";    
  }
    collapseclickEventHandler=(e)=>{
      if(this.state.status=="open")
      {
        this.setState({status:"close"});
        this.bttLabel="&#187; &#187; &#187;";
        this.tooltip="maximize the panel";
        this.props.controlPanel("close");
      }
      else
      {
        this.setState({status:"open"});
        this.bttLabel="&laquo; &laquo; &laquo;";
        this.tooltip="minimize the panel";
        this.props.controlPanel("open");
      }
      
    }
    render() {
        return <div className={this.state.status=="open"?'collapse-button collapse-button-open':'collapse-button collapse-button-close'} onClick={this.collapseclickEventHandler}>
        <p data-tip={this.tooltip}><span dangerouslySetInnerHTML={{__html: this.bttLabel}}></span></p> 
        </div>
      }
}