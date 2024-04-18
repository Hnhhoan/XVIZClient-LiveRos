import React from 'react';
import {connectToLog} from 'streetscape.gl';
class MetricCollector extends React.PureComponent{
  constructor(props) {
    super(props);    
    this.state = {status:"get-ready"};
    this.txtStart=React.createRef();
    this.txtRange=React.createRef(); 
  }
    collectMetric(start,max){
        const fileName= new Date().getTime()+"-"+start+"-"+max+".js";
        const metrics = this.props.metrics.slice(start,max);
        const blob = new Blob([JSON.stringify({data:metrics},null,2)], {
        type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
    }
    render() {
        return <div className={'metric-collector'}>
        <fieldset>
        <legend><b>Metric Records</b></legend>
        <label><span className='txtLabel'>Starting Index:</span> 
         <input type="text" typeof='number' defaultValue={0} min={0} step={10} name='txtStart' ref={this.txtStart} /></label>
        <label><span className='txtLabel'>Number of Records:</span><input type="text" defaultValue={100} typeof='number' min={10} step={10} name='txtNumber' ref={this.txtRange} /></label> 
        <button className='ExecuteButton' disabled={!this.props.metrics.length}  onClick={()=>{
                const start=Number.parseInt(this.txtStart.current.value);
                const range=Number.parseInt(this.txtRange.current.value);
                const max=start+range;
                var sticker;
                if(this.state.status=="get-ready")     
                {
                    if(this.props.metrics.length>=max)
                    {//execute immediately
                        this.collectMetric(start,max)
                    }
                    else{
                        this.setState({status:"waiting"});
                        sticker= setInterval(()=>{
                            if(this.props.metrics.length>=max)
                            {
                                this.collectMetric(start,max);
                                clearInterval(sticker);
                                this.setState({status:"get-ready"});
                            }
                        },1000)
                    }
                }else//waiting
                {
                    clearInterval(sticker);//stop waiting
                    this.setState({status:"get-ready"});
                }
                }}><b>{
                    
                this.state.status=="get-ready"?"Download":"Stop Waiting "+this.props.metrics.length}</b></button>
                {this.props.metrics.length?<p>Loaded <b>{this.props.metrics.length}</b> records</p>:null} 
        </fieldset>
        </div>
      }
}
const getMetricState = (metrics) => ({
    metrics:metrics
  });
const MetricCollectorContainer = connectToLog({Component: MetricCollector, getMetricState});
export default MetricCollectorContainer;