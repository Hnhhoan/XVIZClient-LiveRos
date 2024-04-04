import React from 'react';
//import {GeoJsonLayer} from '@deck.gl/layers';
//import {LogViewer} from 'streetscape.gl';
var ws;
function connectSettingStream(host){
    return new Promise((resolve,reject)=>{
    var ws = new WebSocket(host);
    ws.addEventListener('open', (event)=> {
        console.log("connect to host :"+host);
        resolve(ws);
    });

    ws.addEventListener('message',async (event)=> {
        console.log('received: %s', event.data);
        const response= JSON.parse(event.data);
        if(response.status)
          await printCommandOutput(response.message);
        else  
          await printCommandOutput('{&#9760;}:ERROR '+response.message);
    });

    ws.addEventListener('error',event=>{
      console.log('ERROR: %s', event.data);
    })
    })
}
export class CommandLine extends React.PureComponent{
    constructor(props){
      super(props);
      connectSettingStream(this.props.host).then(w=>{ws=w;});
    }
    componentWillUnmount(){
      ws.close();
    }
    render() {
        return <div className="control-group">
        <h2>Command Executor</h2>
        <div
          className="command-bound"
          id="cmd-input-tooltip"
          data-tip="execute '?' to show all the supported commands!"
        >
          <span className="command">
            cmd:/$
            <input id="cmd-input" type="text" onKeyUp={(event)=>{
              const settings=cmd_inputKeyUp(event);
              if(settings)
                settings.then(s=>{
                  if(s&&s.isMapChanged){
                    const newStateSettings={...this.props.settings};
                    newStateSettings.showMap=s.status;
                    this.props.onChange(newStateSettings);}
                  if(s&&s.isViewModeChanged){
                    const newStateSettings={...this.props.settings};
                    newStateSettings.viewMode=s.mode;
                    this.props.onChange(newStateSettings);
                  }
                  if(s&&s.isTooltipChanged){
                    const newStateSettings={...this.props.settings};
                    newStateSettings.showTooltip=s.status;
                    this.props.onChange(newStateSettings);
                  }
                  
                  })
              }} />
          </span>
        </div>
        <div className="command-ouput" id="command-ouput">
          <p id="writting-line" />
        </div>
      </div>
      }
}
function cmd_inputKeyUp(event){
  var cmd_input_tooltip=document.getElementById("cmd-input-tooltip");
  if(event.target.value.length>35)
  {
    cmd_input_tooltip.setAttribute("data-tip","your cmd: '"+ event.target.value+"'");
  }else {
    cmd_input_tooltip.setAttribute("data-tip","execute '?' to show all the supported commands!");
  }
  if(event.key=='Enter')
  {
    const result= commandHandler(event.target.value,command_executor_config);
    event.target.value="";
    return result;
  }
}


var command_executor_config=
{
    "commands":
    {
      "?":
      {"command":"?",
        "description":
          {
            "forWhat":"Show the supported commands", "syntax":"? [-cmd=command]{&crarr;}"
          },
        "parameters":
          {
            "-cmd":{"forWhat":"Specific command to be descripted","values":["all","?","clear","turn","reconnect","disconnect","connect-status","streams-status","restart"],"default":"all"}
          }
      },
      "map":
      {"command":"map",
        "description":
          {
            "forWhat":"turn on/off map", "syntax":"map [-status=on/off] {&crarr;}"
          },
          "parameters":
          {
            "-status":{"forWhat":"Specific command to be descripted","values":["on","off"],"default":"on"}
          }
      },
      "viewmode":
      {"command":"viewmode",
        "description":
          {
            "forWhat":"set camera viewmode", "syntax":"viewmode [-mode=PERSPECTIVE/TOP_DOWN/DRIVER] {&crarr;}"
          },
          "parameters":
          {
            "-mode":{"forWhat":"Specific command to be descripted","values":["PERSPECTIVE","TOP_DOWN","DRIVER"],"default":"PERSPECTIVE"}
          }
      },
      "tooltip":
      {"command":"tooltip",
        "description":
          {
            "forWhat":"turn on/off tooltip of object", "syntax":"tooltip [-status=on/off] {&crarr;}"
          },
          "parameters":
          {
            "-status":{"forWhat":"Specific command to be descripted","values":["on","off"],"default":"on"}
          }
      },
      "clear":
      {"command":"clear",
        "description":
          {
            "forWhat":"Clear the output", "syntax":"clear{&crarr;}"
          }
      },
      "turn":
      {"command":"turn",
        "description":
          {
            "forWhat":"turn on/off the streams", "syntax":"turn [-status=on/off] [-stream= stream name]   {&crarr;}"
          },
        "parameters":
          {
            "-status":{"forWhat":"Specific stream type to show up","values":["on","off"],"default":"on"},
            "-stream":{"forWhat":"stream name","values":["tracklet","lidar","extra-lidar","car-view","camera","future-tracklet","all"],"default":"all"}
          }
      },
      "reconnect":
      {"command":"reconnect",
      "description":
        {
          "forWhat":"reconnect Server to change setting of streams", "syntax":"reconnect [-host=host server] {&crarr;}"
        },
      "parameters":
        {
          "-host":{"forWhat":"Specific server host","default":"ws://localhost:8081/?setting=true"},
        }
    },
    "disconnect":
    {"command":"disconnect",
      "description":
        {
          "forWhat":"disconnect to setting host server", "syntax":"disconnect{&crarr;}"
        }
    },
    "connect-status":
    {"command":"disconnect",
      "description":
        {
          "forWhat":"check connection to setting host server", "syntax":"connect-status{&crarr;}"
        }
    },
    "streams-status":
    {"command":"streams-status",
      "description":
        {
          "forWhat":"check status of streams", "syntax":"streams-status{&crarr;}"
        }
    },
    "restart":
    {"command":"restart",
      "description":
        {
          "forWhat":"restart streaming", "syntax":"restart{&crarr;}"
        }
    }
    },
    "command_executer":
    {
      "?":helperHandler,
      "map":mapHandler,
      "viewmode":viewModeHandler,
      "tooltip":tooltipHandler,
      "clear":clearHandler,
      "turn":turnHandler,
      "reconnect":reconnectHandler,
      "disconnect":disconnectHandler,
      "connect-status":connectStatusHandler,
      "streams-status":streamsStatusHandler,
      "restart":restartHandler
    },
    "default_parameter_values":{
      "?":{"cmd":"?","-cmd":"all"},
      "map":{"cmd":"map","-status":"on"},
      "viewmode":{"cmd":"viewmode","-mode":"on"},
      "tooltip":{"cmd":"tooltip","-status":"on"},
      "clear":{"cmd":"clear"},
      "turn":{"cmd":"turn","-status":"on","-stream":"all"},
      "reconnect":{"cmd":"reconnect","-host":"ws://localhost:8081/?setting=true"},
      "disconnect":{"cmd":"disconnect"},
      "connect-status":{"cmd":"connect-status"},
      "streams-status":{"cmd":"streams-status"},
      "restart":{"cmd":"restart"}
    }
};
/***************************restart******************************/
async function restartHandler(cmd_obj,cmd_config,cmd_str){
  await printCommandOutput(`<b>{&#9834;} cmd:/$</b>:${cmd_str}`);
  await turnHandler(cmd_config.default_parameter_values.turn,cmd_config);
  await printCommandOutput(`Closing socket...`);
  await disconnectHandler(cmd_obj,cmd_config);
  await printCommandOutput(`Restarting...`);
  document.location.reload();
}
/***************************streamsStatus******************************/
async function streamsStatusHandler(cmd_obj,cmd_config,cmd_str){
  await printCommandOutput(`<b>{&#9834;} cmd:/$</b>:${cmd_str}`);
  if(ws&&ws.readyState ==1)
  {
    ws.send(JSON.stringify({type:"GET-STATUS"}));
  }else{
    await printCommandOutput('{&#9760;}:Socket is not opened!');
  }
}
/***************************reconnect******************************/
async function reconnectHandler(cmd_obj,cmd_config,cmd_str){
  await printCommandOutput(`<b>{&#9834;} cmd:/$</b>:${cmd_str}`);
  connectSettingStream(cmd_obj["-host"]).then(async w=>{
    ws=w;
    await printCommandOutput('The connection is established!');
  }).catch(async e=>{
    await printCommandOutput('{&#9760;}: '+e);
  })
}
/***************************disconnect******************************/
async function disconnectHandler(cmd_obj,cmd_config,cmd_str){
  if(cmd_str)
    await printCommandOutput(`<b>{&#9834;} cmd:/$</b>:${cmd_str}`);
  if(ws&&(ws.readyState==0||ws.readyState==1||ws.readyState==2))
    {
      ws.close();
      await printCommandOutput(`Socket is closed!`);
    }
  else{
    await printCommandOutput('{&#9760;}:Socket is not installed!');
  }
}
/***************************connect-status******************************/
async function connectStatusHandler(cmd_obj,cmd_config,cmd_str){
  await printCommandOutput(`<b>{&#9834;} cmd:/$</b>:${cmd_str}`);
  if(ws==null)
    await printCommandOutput('{&#9760;}:Socket is not installed!');
  else
  {
    let status;
    switch (ws.readyState) {
      case 0:
        status="CONNECTING";
        break;
      case 1:
        status="OPEN";
        break;
      case 2:
        status="CLOSING";
        break;
      case 3:
        status="CLOSED";
        break;
      default:
        status="UNKNOWN";
        break;
    }
    await printCommandOutput('connection status:'+status);
  }
}
/***************************turn******************************/
async function turnHandler(cmd_obj,cmd_config,cmd_str)
{
  if(cmd_str)
    await printCommandOutput(`<b>{&#9834;} cmd:/$</b>:${cmd_str}`);
  //await printCommandOutput(`${cmd_config.commands[cmd_obj.cmd].command}`);
  const key=cmd_obj["-stream"];
  const on=cmd_obj["-status"]=="on"?true:false;
  if(ws&&ws.readyState ==1)
  {
    ws.send(JSON.stringify({type:"SET-ON",key,on}));
  }else{
    await printCommandOutput('{&#9760;}:Socket is not opened!');
  }
}
/***************************clear******************************/
function clearHandler(cmd_obj,cmd_config,cmd_str){
        var cmd_output=document.getElementById("command-ouput");
        var out_lines=cmd_output.querySelectorAll(".out-line");
        for(var i =0;i<out_lines.length;i++)
        {
           cmd_output.removeChild(out_lines[i]);
        }
      }
/***************************map******************************/
async function mapHandler(cmd_obj,cmd_config,cmd_str){
      await printCommandOutput(`<b>{&#9834;} cmd:/$</b>:${cmd_str}`);
      return {isMapChanged:true,status:cmd_obj["-status"]=="off"?false:true};
      }
async function viewModeHandler(cmd_obj,cmd_config,cmd_str){
      await printCommandOutput(`<b>{&#9834;} cmd:/$</b>:${cmd_str}`);
      return {isViewModeChanged:true,mode:cmd_obj["-mode"]=="TOPDOWN"?"TOP_DOWN":cmd_obj["-mode"]};
      }
async function tooltipHandler(cmd_obj,cmd_config,cmd_str){
      await printCommandOutput(`<b>{&#9834;} cmd:/$</b>:${cmd_str}`);
      return {isTooltipChanged:true,status:cmd_obj["-status"]=="off"?false:true};
}
      
async function commandHandler(commandStr,cmd_config){
  commandStr=commandStr.trim().replace(/\s+/g,' ').replace(/\s*=\s*/g,'=');
  const cmd_portions= commandStr.split(' ');
  if(cmd_portions.length<=0)
  {
    await printCommandOutput('{&#9760;}:The command is invalid!');
    return;
  }
  else{
    const command_name=cmd_portions[0];
    if(cmd_config.commands[command_name]==undefined){
      await printCommandOutput(`{&#9760;}:The command ${command_name} is not supported!`);
      return;
      }
    else{
      var init_cmd={...cmd_config.default_parameter_values[command_name]};
      var str=command_name;
      //get and set parameters for command
      for(var i=1;i<cmd_portions.length;i++)
      {	
        const key=cmd_portions[i].split("=")[0];
        const value=cmd_portions[i].split("=")[1];
        if (cmd_config.commands[command_name].parameters==undefined||cmd_config.commands[command_name].parameters[key]==undefined)
        {
          await printCommandOutput(`{&#9760;}:The command ${command_name} dont support the parameter ${key}!`);
          return;
        }
        if(cmd_config.commands[command_name].parameters[key].values&&!cmd_config.commands[command_name].parameters[key].values.some( v=>{return v==value;}))
        {
          await printCommandOutput(`{&#9760;}:The command ${command_name} dont support the value ${value} for the parameter ${key}!`);
          return;
        }
        init_cmd[key]=value;
      }
      const keys=Object.keys(init_cmd);
      for(var i=0;i<keys.length;i++)
        {
          if(keys[i]=="cmd")
            continue;
          str+=" "+keys[i]+"="+init_cmd[keys[i]];
        }
      //execute command
      //await printCommandOutput(`<b>cmd:/$</b>:${str}`);
      return await cmd_config.command_executer[command_name](init_cmd,cmd_config,str);
    }
  }
}

async function printCommandOutput(str,delay=50,maxLineCharacter=-1)
{
  if(!str)
    return;
  maxLineCharacter=maxLineCharacter>0?maxLineCharacter:str.length;
  
  var cmd_output=document.getElementById("command-ouput");
  var cursor="<i>_</i>";
  //var element=" <kbd></kbd>"; as one character {}
  function getCharacterFromStr(str){
    var result=[];
    var flag=0;
    var element="";
    for(var i=0;i<str.length;i++)
      if(str[i]=="{")
        {
          if(flag==0)
            {
              element="<kbd>";
            }
          else if(flag>0)
          {	
            element+=str[i];
          }
          flag+=1;
        }
      else if(str[i]=="}")
        {
          flag-=1;
          if(flag==0)
          {
            element+="</kbd>";
            result.push(element);
          }else if(flag>0)
          {
            element+=str[i];
          }
        }
      else {
        if(flag==0)
          result.push(str[i]);
        else(flag>0)
          element+=str[i];
      }
    return result;
  }	 
  var characters=getCharacterFromStr(str);
  function getLinesFromCharacters(characters){
    var lines=[];
    if(characters==null||characters.length==0)
      return lines;
    var start_index=0;
    var end_index=Math.min(maxLineCharacter,characters.length);
    do{
      lines.push(characters.slice(start_index,end_index));
      var st=start_index;
      start_index=end_index;
      end_index+=end_index-st;
      end_index=Math.min(end_index,characters.length);
    }while(end_index<characters.length)
    return lines;
  }
  var lines=getLinesFromCharacters(characters);
  function printLine(cmd_output,line,delay){
    return new Promise((resolve,reject)=>{
      var writting_line=cmd_output.querySelector("#writting-line");
      var i=0;
      var myInterval = setInterval(()=>{
        writting_line.innerHTML=line.slice(0,i).join("")+cursor;
        i++;
        if(i>=line.length){
        clearInterval(myInterval);
        writting_line.innerHTML="";
        cmd_output.removeChild(writting_line);
        var html="<p class='out-line'>"+line.slice(0,line.length).join("")+"</p>";
        cmd_output.innerHTML+=html;
        cmd_output.appendChild(writting_line);
        resolve("done");
        }
      }, delay);
    });
  }
  
  for(var i=0;i<lines.length;i++)
  {
    await printLine(cmd_output,lines[i],delay);
  }
}
/***************************?******************************/
async  function helperHandler (cmd_obj,cmd_config,cmd_str){
        await printCommandOutput(`<b>{&#9834;} cmd:/$</b>:${cmd_str}`);
        function getStrFromCmdInfor(commandInfor){
          var str=`------------------------------------<br>`;
          str+=`<u>Command name</u>:<b>${commandInfor.command}</b><br>`;
          str+=`Description:${commandInfor.description.forWhat}<br>`;
          str+=`Syntax:<b>${commandInfor.description.syntax}</b><br>`;
          const parameters=commandInfor.parameters;
          if(parameters){
            str+=`<u>Parameters</u>:<br>`;
            const keys=Object.keys(parameters);
            for(var i=0;i<keys.length;i++)
            {
              str+=`---<i>Parameter name</i>: <b>${keys[i]}</b><br>`;
              str+=`---Hint for <b>${keys[i]}</b>: ${parameters[keys[i]].forWhat}<br>`;
              str+=`---List of possible values for <b>${keys[i]}</b>: <b>${parameters[keys[i]].values}</b><br>`;
              str+=`---Default values for <b>${keys[i]}</b>: <b>${parameters[keys[i]].default}</b><br>`;
            }
          }
          return str;
        }
        if(cmd_obj["-cmd"]=="all")
        {
          const keys=Object.keys(cmd_config.commands);
          for(var i=0;i<keys.length;i++)
            {
              await printCommandOutput(getStrFromCmdInfor(cmd_config.commands[keys[i]]),30);
            }
        }else{
          await printCommandOutput(getStrFromCmdInfor(cmd_config.commands[cmd_obj["-cmd"]]));
        }
      }