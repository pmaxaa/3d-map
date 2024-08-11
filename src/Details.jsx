import { useState, useEffect } from "react";
import Paper from '@mui/material/Paper';
import {data} from './constants.js';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import ReadMoreIcon from '@mui/icons-material/ReadMore';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';


export default function Details ({id, onChange}){
    const [building, setBuilding] = useState(null);
    const [showInfo, setShowInfo]  = useState(false);

    const photo = data.find(element => element.id == id)?.ph;
    const url = data.find(element => element.id == id)?.more;
    const additionalInf = data.find(element => element.id == id)?.info;
    

    useEffect(() => setShowInfo(false), [id]);

    const openInfo = () => {
      setShowInfo(true);
    };

    const closeInfo = () => {
      setShowInfo(false);
    }
    useEffect(() => {
        const api = fetch('https://www.overpass-api.de/api/interpreter?', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body:`[out:json][timeout:90];way(${id});out center;`
        });
        api.then((data) => {
          data.text().then((result) => {
            result = JSON.parse(result);
            const elements = result.elements;
            const data = elements.map((item) => {
              return {
                tags: item.tags
              }
            });
            const center = elements.map((item) => {
              return {
                center: item.center
              }
            });
            setBuilding(data[0]);
            onChange(center[0].center);
          })
        });
      }, [id]);
    
    return(
        <>
        {building != null &&
          <Paper elevation={4} sx={{borderRadius: 3, position: "absolute", zIndex: "10", top: 0, margin: "15px", maxWidth: "20%", minWidth: "230px", minHeight: "15%", display: "flex", flexDirection: "column", justifyContent:"space-between", textAlign: "center", overflow: "hidden"}}>
            <img src={process.env.PUBLIC_URL + `/img/${photo ? photo : 'logo.jpg'}`} />
            <div className="name">
                <div className="ru">{building.tags["name"]}</div>
                <div className="en">{building.tags["name:en"]}</div>
            </div>
            <div className="info">
              <div className="mainInfo">
                <div className="address">
                  <LocationOnOutlinedIcon/>
                  {building.tags["addr:street"]}, {building.tags["addr:housenumber"]}</div>
                  <div className="more">
                    {url && <a id="link" href={url} target="_blank"><ReadMoreIcon/></a>}
                  </div>
                </div>
                <div className="additionalInfo">
                {showInfo && additionalInf && <div className="addInf">
                  {additionalInf.map((option) => (
                    <div>
                        {option}
                    </div>
                  ))}
                  <div className="showLess" onClick={closeInfo}><ExpandLessRoundedIcon/></div>
                </div>}
                {!showInfo && additionalInf && <div className="more" onMouseOver={openInfo}>
                <ExpandMoreIcon/>
                </div>}
              </div>
            </div>
          </Paper>
        }
        </>
    );
}