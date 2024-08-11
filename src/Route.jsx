import { useState, useEffect } from "react";

import { Autocomplete, TextField, Button, Dialog, DialogTitle, DialogContent } from "@mui/material";
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import RouteIcon from '@mui/icons-material/Route';

import { ThemeProvider } from "@mui/system";

import theme from './theme';

const accessToken = 'pk.eyJ1IjoicG1heGFhIiwiYSI6ImNsaGtheTBsODBxMWUzam54cHFybnJjeDQifQ.0qvtgp64H68vAMDZeIcHcA';

export default function Route({buildings, selectedPointForPath, setSelectedPointForPath, buildRoute}){
    const [pointA, setPointA] = useState(null);
    const [pointB, setPointB] = useState(null);

    const [open, setOpen] = useState(false);

    const handleClickOpen = () => {
        setOpen(true);
    };
    
    const handleClose  = () => {
        setOpen(false);
    };

    const buildings_arr = buildings.map(item => {return {label: item.tags.name, id: item.id}});
    
    const getCoordinates = () => {
        const api_A = fetch('https://www.overpass-api.de/api/interpreter?', {
            method: 'POST',
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
            },
            body:`[out:json];way(${selectedPointForPath.A});(._;node(w)[entrance~'.'];);out center;`
            });
            api_A.then((data) => {
                data.text().then((result) => {
                    result = JSON.parse(result);
                    const elements = result.elements;
                    const data = elements.map((item) => {
                        if (item.type === "way"){
                            return {
                                lat: item.center.lat,
                                lon: item.center.lon,
                            }
                        } 
                        else return {
                            lat: item.lat,
                            lon: item.lon,
                        }
                    });
                setPointA(data[0]);
            })
        });
        const api_B = fetch('https://www.overpass-api.de/api/interpreter?', {
            method: 'POST',
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
            },
            body:`[out:json];way(${selectedPointForPath.B});(._;node(w)[entrance~'.'];);out center;`
            });
            api_B.then((data) => {
                data.text().then((result) => {
                    result = JSON.parse(result);
                    const elements = result.elements;
                    const data = elements.map((item) => {
                        if (item.type === "way"){
                            return {
                                lat: item.center.lat,
                                lon: item.center.lon,
                            }
                        } 
                        else return {
                            lat: item.lat,
                            lon: item.lon,
                        }
                    });
                setPointB(data[0]);
            })
        });
    }

    useEffect(() => {
        if(pointA == null || pointB == null) return;
        const query = fetch(`https://api.mapbox.com/directions/v5/mapbox/walking/${pointA.lon},${pointA.lat};${pointB.lon},${pointB.lat}?alternatives=true&continue_straight=true&geometries=geojson&overview=simplified&steps=false&access_token=${accessToken}`,
            {method: 'GET'}
        );
        query.then((data) => {
            data.text().then((result) => {
                result = JSON.parse(result);
                console.log(result);
                const route = result.routes[0].geometry.coordinates;
                const geojson = {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: route
                    }
                };
                buildRoute(geojson);
            });
            setPointA(null);
            setPointB(null);
        }); 

    }, [pointA, pointB])

    return(
        <ThemeProvider theme={theme}>
            <Button size="large" type="primary" color="secondary" variant="contained" onClick={handleClickOpen} sx={{display: "flex"}}>
                <RouteIcon/>
            </Button>
            <Dialog open={open} onClose={handleClose} >
                <DialogTitle>Построить маршрут</DialogTitle>
                <DialogContent>           
                        <Autocomplete
                            sx={{marginTop: "10px", width: 300}}
                            disablePortal
                            id="combo-box-demo"
                            onChange={(event, newValue) => {
                                setSelectedPointForPath({...selectedPointForPath, A:newValue?.id});
                            }}
                            options={buildings_arr}
                            renderInput={(params) => <TextField {...params}  label="Откуда" key={"A" + params.id}/>}
                            getOptionLabel={(option) => option.label}
                            renderOption={(props, option) => {
                                return (
                                <li {...props} key={option.id}>
                                    {option.label}
                                </li>
                                );
                            }}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
                        <Autocomplete
                            disablePortal
                            id="combo-box-demo"
                            onChange={(event, newValue) => {
                                setSelectedPointForPath({...selectedPointForPath, B:newValue.id});
                            }}
                            options={buildings_arr}
                            sx={{marginTop: "10px", marginBottom: "10px", width: 300 }}
                            renderInput={(params) => <TextField {...params}  label="Куда" key={"B" + params.id}/>}
                            getOptionLabel={(option) => option.label}
                            renderOption={(props, option) => {
                                return (
                                <li {...props} key={option.id}>
                                    {option.label}
                                </li>
                                );
                            }}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
                        <Button variant="contained" color="primary" endIcon={<DirectionsRunIcon/>} onClick={() => {getCoordinates(); handleClose();}}>
                            RUN
                        </Button>
                </DialogContent>
            </Dialog>
        </ThemeProvider>
    );
};